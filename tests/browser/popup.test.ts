import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountPopup } from '../../src/ui/popup/view';
import type { PopupController } from '../../src/ui/popup/view';
import { CommandError } from '../../src/ui/shared/client';
import { createFakeUiClient, makeJob, makeSelectableTab } from '../support/ui-fakes';
import type { FakeUiClient } from '../support/ui-fakes';

const NOW = 2_000_000;

let controller: PopupController | null = null;

function mount(client: FakeUiClient): PopupController {
  const root = document.getElementById('app');
  if (root === null) {
    throw new Error('missing root');
  }
  controller = mountPopup(root, client, { now: () => NOW, countdownIntervalMs: 100_000 });
  return controller;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find((node) => node.textContent === text);
  if (!(found instanceof HTMLButtonElement)) {
    throw new Error(`button not found: ${text}`);
  }
  return found;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  controller?.destroy();
  controller = null;
});

describe('popup view', () => {
  it('renders eligible tabs from the current window', async () => {
    const client = createFakeUiClient();
    client.setTabs([
      makeSelectableTab({ tabId: 1, title: 'First', url: 'https://one.example/' }),
      makeSelectableTab({ tabId: 2, title: 'Second', url: 'https://two.example/' }),
    ]);
    mount(client);
    await flush();

    const options = document.querySelectorAll('.ar-tab-option');
    expect(options.length).toBe(2);
    expect(document.body.textContent).toContain('First');
    expect(document.body.textContent).toContain('Second');
  });

  it('shows an empty state when there are no eligible tabs', async () => {
    const client = createFakeUiClient();
    client.setTabs([]);
    mount(client);
    await flush();

    expect(document.querySelector('.ar-empty-state__title')?.textContent).toContain(
      'No eligible tabs',
    );
  });

  it('disables tabs that already have an active or paused job', async () => {
    const client = createFakeUiClient();
    client.setTabs([makeSelectableTab({ tabId: 7, title: 'Busy' })]);
    client.setJobs([makeJob({ id: 'job-7', tabId: 7, state: 'active' })]);
    mount(client);
    await flush();

    const checkbox = document.querySelector('.ar-tab-option input');
    expect(checkbox).toBeInstanceOf(HTMLInputElement);
    expect((checkbox as HTMLInputElement).disabled).toBe(true);
  });

  it('switches stop-condition fields when the kind changes', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    const kind = document.getElementById('ar-stop-kind');
    expect(kind).toBeInstanceOf(HTMLSelectElement);
    const select = kind as HTMLSelectElement;

    select.value = 'count';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.body.textContent).toContain('reloads');

    select.value = 'duration';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const durationField = [...document.querySelectorAll('.ar-field')].find(
      (node) => node.querySelector('.ar-field__label')?.textContent === 'Duration',
    );
    expect(durationField).toBeInstanceOf(HTMLElement);
    expect((durationField as HTMLElement).hidden).toBe(false);
  });

  it('requires at least one selected tab before creating a job', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    button('Start refresh').click();
    await flush();

    expect(client.createCalls.length).toBe(0);
    const error = document.querySelector('.ar-field__error');
    expect(error?.textContent).toContain('Select at least one tab');
  });

  it('rejects a non-positive interval with a presentation error', async () => {
    const client = createFakeUiClient();
    client.setTabs([makeSelectableTab({ tabId: 1 })]);
    mount(client);
    await flush();

    (document.querySelector('.ar-tab-option input') as HTMLInputElement).click();
    const intervalValue = document.getElementById('ar-interval-value') as HTMLInputElement;
    intervalValue.value = '';
    button('Start refresh').click();
    await flush();

    expect(client.createCalls.length).toBe(0);
    expect(document.querySelector<HTMLElement>('.ar-field__error')?.hidden).toBe(false);
  });

  it('creates a job for the selected tabs with the configured interval', async () => {
    const client = createFakeUiClient();
    client.setTabs([makeSelectableTab({ tabId: 42 })]);
    mount(client);
    await flush();

    (document.querySelector('.ar-tab-option input') as HTMLInputElement).click();
    const intervalValue = document.getElementById('ar-interval-value') as HTMLInputElement;
    const intervalUnit = document.getElementById('ar-interval-unit') as HTMLSelectElement;
    intervalValue.value = '2';
    intervalUnit.value = 'minutes';
    button('Start refresh').click();
    await flush();

    expect(client.createCalls.length).toBe(1);
    expect(client.createCalls[0]?.tabIds).toEqual([42]);
    expect(client.createCalls[0]?.configuration.intervalMs).toBe(120_000);
  });

  it('renders job cards with status badges and countdown', async () => {
    const client = createFakeUiClient();
    client.setJobs([
      makeJob({ id: 'a', state: 'active', nextRunAt: NOW + 30_000, runsCompleted: 4 }),
      makeJob({ id: 'b', tabId: 2, state: 'paused', nextRunAt: null }),
      makeJob({ id: 'c', tabId: 3, state: 'orphaned', nextRunAt: null }),
      makeJob({ id: 'd', tabId: 4, state: 'error', nextRunAt: null }),
    ]);
    mount(client);
    await flush();

    expect(document.querySelectorAll('.ar-job-card').length).toBe(4);
    expect(document.querySelector('.ar-status-badge--active')?.textContent).toBe('Active');
    expect(document.querySelector('.ar-status-badge--paused')?.textContent).toBe('Paused');
    expect(document.querySelector('.ar-status-badge--orphaned')?.textContent).toBe('Orphaned');
    expect(document.querySelector('.ar-status-badge--error')?.textContent).toBe('Error');
    expect(document.body.textContent).toContain('Next in 30s');
  });

  it('invokes pause with the job id and revision', async () => {
    const client = createFakeUiClient();
    client.setJobs([makeJob({ id: 'job-1', state: 'active', revision: 5 })]);
    mount(client);
    await flush();

    button('Pause').click();
    await flush();

    expect(client.pauseCalls).toEqual([{ jobId: 'job-1', revision: 5 }]);
  });

  it('invokes resume for a paused job', async () => {
    const client = createFakeUiClient();
    client.setJobs([makeJob({ id: 'job-2', state: 'paused', revision: 3, nextRunAt: null })]);
    mount(client);
    await flush();

    button('Resume').click();
    await flush();

    expect(client.resumeCalls).toEqual([{ jobId: 'job-2', revision: 3 }]);
  });

  it('invokes stop for an active job', async () => {
    const client = createFakeUiClient();
    client.setJobs([makeJob({ id: 'job-3', state: 'active', revision: 2 })]);
    mount(client);
    await flush();

    button('Stop').click();
    await flush();

    expect(client.stopCalls).toEqual([{ jobId: 'job-3', revision: 2 }]);
  });

  it('invokes remove for a finished job', async () => {
    const client = createFakeUiClient();
    client.setJobs([
      makeJob({ id: 'job-4', tabId: null, state: 'completed', revision: 9, nextRunAt: null }),
    ]);
    mount(client);
    await flush();

    button('Remove').click();
    await flush();

    expect(client.removeCalls).toEqual([{ jobId: 'job-4', revision: 9 }]);
  });

  it('edits an existing job through the form', async () => {
    const client = createFakeUiClient();
    client.setJobs([makeJob({ id: 'job-5', state: 'paused', revision: 4, nextRunAt: null })]);
    mount(client);
    await flush();

    button('Edit').click();
    const intervalValue = document.getElementById('ar-interval-value') as HTMLInputElement;
    intervalValue.value = '5';
    (document.getElementById('ar-interval-unit') as HTMLSelectElement).value = 'minutes';
    button('Save changes').click();
    await flush();

    expect(client.editCalls.length).toBe(1);
    expect(client.editCalls[0]?.jobId).toBe('job-5');
    expect(client.editCalls[0]?.revision).toBe(4);
    expect(client.editCalls[0]?.changes.intervalMs).toBe(300_000);
  });

  it('shows the clear-finished action only when a finished job exists', async () => {
    const client = createFakeUiClient();
    client.setJobs([makeJob({ id: 'done', tabId: null, state: 'completed', nextRunAt: null })]);
    mount(client);
    await flush();

    const clear = button('Clear finished');
    expect(clear.hidden).toBe(false);
    clear.click();
    await flush();
    expect(client.clearCompletedCalls).toBe(1);
  });

  it('surfaces command errors in the alert region', async () => {
    const client = createFakeUiClient();
    client.setJobs([makeJob({ id: 'job-6', state: 'active', revision: 1 })]);
    mount(client);
    await flush();

    client.failNext(
      new CommandError('REVISION_CONFLICT', 'The refresh job was updated elsewhere.'),
    );
    button('Pause').click();
    await flush();

    const alert = document.querySelector('.ar-alert');
    expect(alert?.getAttribute('role')).toBe('status');
    expect(alert?.textContent).toContain('updated elsewhere');
  });

  it('re-renders when a jobs.updated event arrives', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();
    expect(document.querySelectorAll('.ar-job-card').length).toBe(0);

    client.emit({
      type: 'jobs.updated',
      snapshot: { jobs: [makeJob({ id: 'live', state: 'active' })], activeCount: 1 },
    });
    await flush();

    expect(document.querySelectorAll('.ar-job-card').length).toBe(1);
  });

  it('gives every tab checkbox an accessible label', async () => {
    const client = createFakeUiClient();
    client.setTabs([makeSelectableTab({ tabId: 1, title: 'Labelled' })]);
    mount(client);
    await flush();

    const label = document.querySelector('.ar-tab-option');
    expect(label?.tagName).toBe('LABEL');
    expect(label?.querySelector('input')).not.toBeNull();
    expect(label?.textContent).toContain('Labelled');
  });

  it('reflects the number of selected tabs in a live count', async () => {
    const client = createFakeUiClient();
    client.setTabs([
      makeSelectableTab({ tabId: 1, title: 'One' }),
      makeSelectableTab({ tabId: 2, title: 'Two' }),
    ]);
    mount(client);
    await flush();

    const readout = document.querySelector('.ar-selected-count');
    expect(readout?.getAttribute('aria-live')).toBe('polite');
    expect(readout?.textContent).toBe('0 selected');

    const checkboxes = document.querySelectorAll<HTMLInputElement>('.ar-tab-option input');
    checkboxes[0]?.click();
    expect(readout?.textContent).toBe('1 selected');
    checkboxes[1]?.click();
    expect(readout?.textContent).toBe('2 selected');
    checkboxes[0]?.click();
    expect(readout?.textContent).toBe('1 selected');
  });

  it('keeps interactive controls reachable by keyboard focus', async () => {
    const client = createFakeUiClient();
    client.setTabs([makeSelectableTab({ tabId: 1, title: 'Focusable' })]);
    mount(client);
    await flush();

    const checkbox = document.querySelector<HTMLInputElement>('.ar-tab-option input');
    const interval = document.getElementById('ar-interval-value') as HTMLInputElement;
    const submit = button('Start refresh');

    for (const control of [checkbox, interval, submit]) {
      expect(control).not.toBeNull();
      expect(control?.getAttribute('tabindex')).not.toBe('-1');
      control?.focus();
      expect(document.activeElement).toBe(control);
    }
  });
});

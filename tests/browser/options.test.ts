import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountOptions } from '../../src/ui/options/view';
import type { OptionsController } from '../../src/ui/options/view';
import { CommandError } from '../../src/ui/shared/client';
import { createFakeUiClient } from '../support/ui-fakes';
import type { FakeUiClient } from '../support/ui-fakes';

let controller: OptionsController | null = null;

function mount(client: FakeUiClient, version?: string): OptionsController {
  const root = document.getElementById('app');
  if (root === null) {
    throw new Error('missing root');
  }
  controller = mountOptions(root, client, version === undefined ? {} : { version });
  return controller;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function control(labelText: string): HTMLInputElement | HTMLSelectElement {
  const label = [...document.querySelectorAll('.ar-field')].find(
    (node) => node.querySelector('.ar-field__label')?.textContent === labelText,
  );
  const found = label?.querySelector('input, select');
  if (!(found instanceof HTMLInputElement) && !(found instanceof HTMLSelectElement)) {
    throw new Error(`control not found: ${labelText}`);
  }
  return found;
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

describe('options view', () => {
  it('prefills the form from stored settings', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    expect((control('Default interval') as HTMLInputElement).value).toBe('1');
    expect((control('Interval unit') as HTMLSelectElement).value).toBe('minutes');
    expect((control('Maximum active jobs') as HTMLInputElement).value).toBe('50');
    expect((control('Maximum reloads per second') as HTMLInputElement).value).toBe('3');
    expect((control('Keep finished jobs (days)') as HTMLInputElement).value).toBe('7');
  });

  it('saves edited settings through updateSettings', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    (control('Maximum active jobs') as HTMLInputElement).value = '10';
    button('Save settings').click();
    await flush();

    expect(client.updateSettingsCalls.length).toBe(1);
    expect(client.updateSettingsCalls[0]?.maxActiveJobs).toBe(10);
    expect(document.querySelector('.ar-alert')?.textContent).toContain('Settings saved');
  });

  it('resets settings to defaults', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    button('Reset to defaults').click();
    await flush();

    expect(client.updateSettingsCalls.length).toBe(1);
    expect(client.updateSettingsCalls[0]?.maxActiveJobs).toBe(50);
    expect(client.updateSettingsCalls[0]?.defaultIntervalMs).toBe(60_000);
  });

  it('clears finished jobs from the maintenance action', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    button('Clear finished jobs').click();
    await flush();

    expect(client.clearCompletedCalls).toBe(1);
  });

  it('switches the conditional stop-condition fields', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    const stop = control('Default stop condition') as HTMLSelectElement;
    stop.value = 'count';
    stop.dispatchEvent(new Event('change', { bubbles: true }));

    expect(control('Default reloads').closest<HTMLElement>('.ar-field')?.hidden).toBe(false);
    expect(control('Default duration').closest<HTMLElement>('.ar-field')?.hidden).toBe(true);
  });

  it('rejects a non-positive interval before saving', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    (control('Default interval') as HTMLInputElement).value = '';
    button('Save settings').click();
    await flush();

    expect(client.updateSettingsCalls.length).toBe(0);
    expect(document.querySelector<HTMLElement>('.ar-field__error')?.hidden).toBe(false);
  });

  it('shows the extension version in the about section', async () => {
    const client = createFakeUiClient();
    mount(client, '1.2.3');
    await flush();

    expect(document.querySelector('.ar-options__info')?.textContent).toContain('1.2.3');
  });

  it('surfaces command errors as alerts', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    client.failNext(new CommandError('SETTINGS_INVALID', 'Maximum active jobs is invalid.'));
    button('Save settings').click();
    await flush();

    const alert = document.querySelector('.ar-alert');
    expect(alert?.className).toContain('ar-alert--error');
    expect(alert?.textContent).toContain('invalid');
  });

  it('labels the completion notification checkbox', async () => {
    const client = createFakeUiClient();
    mount(client);
    await flush();

    const label = [...document.querySelectorAll('.ar-checkbox')].find((node) =>
      node.textContent?.includes('Notify me when a schedule finishes'),
    );
    expect(label).toBeDefined();
    expect(label?.querySelector('input')?.getAttribute('type')).toBe('checkbox');
  });
});

import { describe, it, expect } from 'vitest';
import { createJobs } from '../../src/application/create-jobs';
import { createDefaultSettings } from '../../src/domain/settings';
import { DomainError } from '../../src/domain/errors';
import { createTestHarness, makeConfiguration, makeJob, makeTabInfo } from '../support/fakes';
import { expectDomainErrorAsync } from '../support/assertions';

describe('createJobs', () => {
  it('creates jobs for multiple tabs and schedules one-shot alarms', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/', title: 'A' }));
    harness.tabs.setTab(makeTabInfo({ tabId: 2, url: 'https://b.example/', title: 'B' }));

    const snapshot = await createJobs(harness.deps, {
      tabIds: [1, 2],
      configuration: makeConfiguration(),
    });

    expect(snapshot.jobs).toHaveLength(2);
    expect(snapshot.activeCount).toBe(2);
    expect(harness.jobs.jobs.map((job) => job.id)).toEqual(['id-1', 'id-2']);
    expect(harness.jobs.jobs[0]?.tabId).toBe(1);
    expect(harness.jobs.jobs[0]?.originalOrigin).toBe('https://a.example');
    expect(harness.jobs.jobs[0]?.nextRunAt).toBe(1_060_000);
    expect(harness.alarms.scheduled).toEqual([
      { jobId: 'id-1', whenMs: 1_060_000 },
      { jobId: 'id-2', whenMs: 1_060_000 },
    ]);
  });

  it('binds each created job to its tab session when supported', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));

    await createJobs(harness.deps, { tabIds: [1], configuration: makeConfiguration() });

    expect(harness.sessions.bound).toEqual([{ tabId: 1, jobId: 'id-1' }]);
  });

  it('records an event but does not fail when session binding throws', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));
    harness.sessions.failBind(new Error('no sessions'));

    await createJobs(harness.deps, { tabIds: [1], configuration: makeConfiguration() });

    expect(harness.eventLog.events.map((event) => event.kind)).toContain('session-binding-failed');
    expect(harness.jobs.jobs).toHaveLength(1);
  });

  it('deduplicates repeated tab ids before creating jobs', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));

    const snapshot = await createJobs(harness.deps, {
      tabIds: [1, 1, 1],
      configuration: makeConfiguration(),
    });

    expect(snapshot.jobs).toHaveLength(1);
  });

  it('rejects an empty tab selection', async () => {
    const harness = createTestHarness();

    await expectDomainErrorAsync(
      () => createJobs(harness.deps, { tabIds: [], configuration: makeConfiguration() }),
      'MESSAGE_INVALID',
    );
  });

  it('prevents a duplicate job for a tab that already has one', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'existing', tabId: 1 })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));

    await expectDomainErrorAsync(
      () => createJobs(harness.deps, { tabIds: [1], configuration: makeConfiguration() }),
      'JOB_CONFLICT',
    );
  });

  it('rejects when a selected tab is no longer available', async () => {
    const harness = createTestHarness();

    await expectDomainErrorAsync(
      () => createJobs(harness.deps, { tabIds: [99], configuration: makeConfiguration() }),
      'TAB_NOT_FOUND',
    );
  });

  it('rejects unsupported url schemes', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'about:config' }));

    await expectDomainErrorAsync(
      () => createJobs(harness.deps, { tabIds: [1], configuration: makeConfiguration() }),
      'TAB_URL_UNSUPPORTED',
    );
  });

  it('rejects when the active job limit would be exceeded', async () => {
    const harness = createTestHarness({
      settings: { ...createDefaultSettings(), maxActiveJobs: 1 },
    });
    harness.jobs.seed([makeJob({ id: 'existing', tabId: 5 })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));

    await expectDomainErrorAsync(
      () => createJobs(harness.deps, { tabIds: [1], configuration: makeConfiguration() }),
      'ACTIVE_JOB_LIMIT_REACHED',
    );
  });

  it('validates the configuration before touching tabs', async () => {
    const harness = createTestHarness();

    await expectDomainErrorAsync(
      () =>
        createJobs(harness.deps, {
          tabIds: [1],
          configuration: makeConfiguration({ intervalMs: 1_000 }),
        }),
      'INTERVAL_TOO_SHORT',
    );
  });

  it('does not report success or schedule alarms when persistence fails', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));
    harness.jobs.failOnSave(new DomainError('STORAGE_FAILED', 'disk full'));

    await expectDomainErrorAsync(
      () => createJobs(harness.deps, { tabIds: [1], configuration: makeConfiguration() }),
      'STORAGE_FAILED',
    );
    expect(harness.alarms.scheduled).toHaveLength(0);
    expect(harness.badge.counts).toHaveLength(0);
    expect(harness.events.events).toHaveLength(0);
  });

  it('updates the badge active count through published state', async () => {
    const harness = createTestHarness();
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://a.example/' }));
    harness.tabs.setTab(makeTabInfo({ tabId: 2, url: 'https://b.example/' }));

    await createJobs(harness.deps, { tabIds: [1, 2], configuration: makeConfiguration() });

    expect(harness.badge.counts.at(-1)).toBe(2);
    expect(harness.events.events.at(-1)).toMatchObject({ type: 'jobs.updated' });
  });
});

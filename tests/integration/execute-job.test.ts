import { describe, it, expect } from 'vitest';
import { executeJob } from '../../src/application/execute-job';
import { createDefaultSettings } from '../../src/domain/settings';
import { createTestHarness, makeJob, makeTabInfo } from '../support/fakes';

describe('executeJob', () => {
  it('reloads the tab and schedules the next run on success', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1 })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));

    await executeJob(harness.deps, 'job-1');

    expect(harness.tabs.reloads).toEqual([{ tabId: 1, bypassCache: false }]);
    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('active');
    expect(job?.runsCompleted).toBe(1);
    expect(job?.nextRunAt).toBe(1_060_000);
    expect(harness.alarms.scheduled.at(-1)).toEqual({ jobId: 'job-1', whenMs: 1_060_000 });
  });

  it('passes the cache-bypass option through to the reload request', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1, reloadOptions: { bypassCache: true } })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));

    await executeJob(harness.deps, 'job-1');

    expect(harness.tabs.reloads).toEqual([{ tabId: 1, bypassCache: true }]);
  });

  it('completes a count-limited job on its final successful run', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({ id: 'job-1', tabId: 1, stopCondition: { type: 'count', maxRuns: 1 } }),
    ]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));

    await executeJob(harness.deps, 'job-1');

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('completed');
    expect(job?.completedAt).toBe(1_000_000);
    expect(harness.alarms.cancelled).toContain('job-1');
  });

  it('completes immediately without reloading when the stop condition is already met', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({
        id: 'job-1',
        tabId: 1,
        runsCompleted: 2,
        stopCondition: { type: 'count', maxRuns: 2 },
      }),
    ]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));

    await executeJob(harness.deps, 'job-1');

    expect(harness.tabs.reloads).toHaveLength(0);
    expect(harness.jobs.jobs[0]?.state).toBe('completed');
  });

  it('orphans a job whose tab is missing', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1 })]);

    await executeJob(harness.deps, 'job-1');

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('orphaned');
    expect(job?.tabId).toBeNull();
    expect(harness.alarms.cancelled).toContain('job-1');
    expect(harness.tabs.reloads).toHaveLength(0);
  });

  it('pauses a job when navigation policy is violated', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1, navigationPolicy: 'same-origin' })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://different.example/' }));

    await executeJob(harness.deps, 'job-1');

    expect(harness.jobs.jobs[0]?.state).toBe('paused');
    expect(harness.tabs.reloads).toHaveLength(0);
    expect(harness.eventLog.events.map((event) => event.kind)).toContain('navigation-paused');
  });

  it('keeps the job active and reschedules after a single reload failure', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1 })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));
    harness.tabs.failReload(new Error('network down'));

    await executeJob(harness.deps, 'job-1');

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('active');
    expect(job?.consecutiveFailures).toBe(1);
    expect(job?.lastError?.code).toBe('RELOAD_FAILED');
    expect(harness.alarms.scheduled.at(-1)).toEqual({ jobId: 'job-1', whenMs: 1_060_000 });
    expect(harness.eventLog.events.map((event) => event.kind)).toContain('reload-failed');
  });

  it('moves the job to error after reaching the failure threshold', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1, consecutiveFailures: 2 })]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));
    harness.tabs.failReload(new Error('still failing'));

    await executeJob(harness.deps, 'job-1');

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('error');
    expect(job?.consecutiveFailures).toBe(3);
    expect(job?.nextRunAt).toBeNull();
    expect(harness.alarms.cancelled).toContain('job-1');
  });

  it('notifies on completion when the preference is enabled', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({ id: 'job-1', tabId: 1, stopCondition: { type: 'count', maxRuns: 1 } }),
    ]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));

    await executeJob(harness.deps, 'job-1');

    expect(harness.notifications.notifications).toEqual([
      { title: 'Auto Refresh', message: 'Example finished its refresh schedule.' },
    ]);
  });

  it('does not notify on completion when the preference is disabled', async () => {
    const harness = createTestHarness({
      settings: { ...createDefaultSettings(), notifyOnCompletion: false },
    });
    harness.jobs.seed([
      makeJob({ id: 'job-1', tabId: 1, stopCondition: { type: 'count', maxRuns: 1 } }),
    ]);
    harness.tabs.setTab(makeTabInfo({ tabId: 1, url: 'https://example.com/' }));

    await executeJob(harness.deps, 'job-1');

    expect(harness.notifications.notifications).toHaveLength(0);
  });

  it('cancels the alarm and stops when the job is not active', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1, state: 'paused' })]);

    await executeJob(harness.deps, 'job-1');

    expect(harness.alarms.cancelled).toContain('job-1');
    expect(harness.tabs.reloads).toHaveLength(0);
  });

  it('cancels the alarm when the job no longer exists', async () => {
    const harness = createTestHarness();

    await executeJob(harness.deps, 'missing');

    expect(harness.alarms.cancelled).toContain('missing');
  });
});

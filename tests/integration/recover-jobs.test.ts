import { describe, it, expect } from 'vitest';
import { recoverJobs } from '../../src/application/recover-jobs';
import { createDefaultSettings } from '../../src/domain/settings';
import { createTestHarness, makeJob } from '../support/fakes';

describe('recoverJobs', () => {
  it('clears stale alarms before recreating them for active jobs', async () => {
    const harness = createTestHarness({ now: 2_000_000 });
    harness.jobs.seed([
      makeJob({ id: 'active-1', state: 'active', nextRunAt: 2_100_000 }),
      makeJob({ id: 'paused-1', state: 'paused', nextRunAt: null }),
      makeJob({ id: 'completed-1', state: 'completed', nextRunAt: null }),
    ]);

    await recoverJobs(harness.deps);

    expect(harness.alarms.clearAllCount).toBe(1);
    expect(harness.alarms.scheduled).toEqual([{ jobId: 'active-1', whenMs: 2_100_000 }]);
    expect([...harness.alarms.alarms.keys()]).toEqual(['active-1']);
  });

  it('does not create duplicate alarms for the same active job', async () => {
    const harness = createTestHarness({ now: 2_000_000 });
    harness.jobs.seed([makeJob({ id: 'active-1', state: 'active', nextRunAt: 2_100_000 })]);

    await recoverJobs(harness.deps);

    const scheduledForJob = harness.alarms.scheduled.filter((entry) => entry.jobId === 'active-1');
    expect(scheduledForJob).toHaveLength(1);
  });

  it('clamps a past next-run time to the current time', async () => {
    const harness = createTestHarness({ now: 2_000_000 });
    harness.jobs.seed([makeJob({ id: 'active-1', state: 'active', nextRunAt: 1_000_000 })]);

    await recoverJobs(harness.deps);

    expect(harness.alarms.scheduled).toEqual([{ jobId: 'active-1', whenMs: 2_000_000 }]);
  });

  it('derives a next-run time when the active job has none', async () => {
    const harness = createTestHarness({ now: 2_000_000 });
    harness.jobs.seed([
      makeJob({ id: 'active-1', state: 'active', nextRunAt: null, intervalMs: 60_000 }),
    ]);

    await recoverJobs(harness.deps);

    expect(harness.alarms.scheduled).toEqual([{ jobId: 'active-1', whenMs: 2_060_000 }]);
  });

  it('configures the rate limiter from settings', async () => {
    const harness = createTestHarness({
      settings: { ...createDefaultSettings(), maxReloadsPerSecond: 5 },
    });

    await recoverJobs(harness.deps);

    expect(harness.rateLimiter.configured).toContain(5);
  });
});

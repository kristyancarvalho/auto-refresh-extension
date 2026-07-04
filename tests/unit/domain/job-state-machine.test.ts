import { describe, it, expect } from 'vitest';
import {
  applyJobChanges,
  completeJob,
  failJob,
  orphanJob,
  pauseJob,
  reattachJob,
  recordFailedRun,
  recordSuccessfulRun,
  resumeJob,
} from '../../../src/domain/job-state-machine';
import type { RefreshJobError } from '../../../src/domain/refresh-job';
import { makeJob } from '../../support/fakes';
import { expectDomainError } from '../../support/assertions';

const NOW = 2_000_000;
const ERROR: RefreshJobError = { code: 'RELOAD_FAILED', message: 'boom', occurredAt: NOW };

describe('pauseJob', () => {
  it('pauses an active job and clears the alarm time', () => {
    const job = makeJob({ state: 'active', revision: 3 });
    const paused = pauseJob(job, NOW);
    expect(paused.state).toBe('paused');
    expect(paused.nextRunAt).toBeNull();
    expect(paused.revision).toBe(4);
    expect(paused.updatedAt).toBe(NOW);
  });

  it('rejects pausing a non-active job', () => {
    expectDomainError(() => pauseJob(makeJob({ state: 'paused' }), NOW), 'JOB_STATE_INVALID');
  });
});

describe('resumeJob', () => {
  it('resumes a paused job and reschedules', () => {
    const job = makeJob({ state: 'paused', intervalMs: 60_000, nextRunAt: null, lastError: ERROR });
    const resumed = resumeJob(job, NOW);
    expect(resumed.state).toBe('active');
    expect(resumed.nextRunAt).toBe(NOW + 60_000);
    expect(resumed.lastError).toBeNull();
  });

  it('completes instead of resuming when the stop condition is already reached', () => {
    const job = makeJob({
      state: 'paused',
      stopCondition: { type: 'count', maxRuns: 1 },
      runsCompleted: 1,
    });
    const resumed = resumeJob(job, NOW);
    expect(resumed.state).toBe('completed');
    expect(resumed.completedAt).toBe(NOW);
  });

  it('rejects resuming a non-paused job', () => {
    expectDomainError(() => resumeJob(makeJob({ state: 'active' }), NOW), 'JOB_STATE_INVALID');
  });
});

describe('terminal transitions', () => {
  it('completeJob marks the job completed', () => {
    const done = completeJob(makeJob({ state: 'active' }), NOW);
    expect(done.state).toBe('completed');
    expect(done.nextRunAt).toBeNull();
    expect(done.completedAt).toBe(NOW);
  });

  it('orphanJob detaches the tab', () => {
    const orphan = orphanJob(makeJob({ state: 'active', tabId: 7 }), NOW);
    expect(orphan.state).toBe('orphaned');
    expect(orphan.tabId).toBeNull();
    expect(orphan.nextRunAt).toBeNull();
  });

  it('failJob records the error', () => {
    const failed = failJob(makeJob({ state: 'active' }), NOW, ERROR);
    expect(failed.state).toBe('error');
    expect(failed.nextRunAt).toBeNull();
    expect(failed.lastError).toEqual(ERROR);
  });

  it('reattachJob assigns a new tab id', () => {
    const reattached = reattachJob(makeJob({ tabId: null }), 42, NOW);
    expect(reattached.tabId).toBe(42);
  });
});

describe('recordSuccessfulRun', () => {
  it('advances counters and reschedules when the job continues', () => {
    const job = makeJob({ runsCompleted: 1, consecutiveFailures: 2, intervalMs: 60_000 });
    const next = recordSuccessfulRun(job, NOW);
    expect(next.runsCompleted).toBe(2);
    expect(next.consecutiveFailures).toBe(0);
    expect(next.lastRunAt).toBe(NOW);
    expect(next.state).toBe('active');
    expect(next.nextRunAt).toBe(NOW + 60_000);
  });

  it('completes when the run reaches the stop condition', () => {
    const job = makeJob({ stopCondition: { type: 'count', maxRuns: 2 }, runsCompleted: 1 });
    const next = recordSuccessfulRun(job, NOW);
    expect(next.state).toBe('completed');
    expect(next.completedAt).toBe(NOW);
    expect(next.nextRunAt).toBeNull();
  });
});

describe('recordFailedRun', () => {
  it('keeps the job active below the failure threshold', () => {
    const job = makeJob({ consecutiveFailures: 0, intervalMs: 60_000 });
    const next = recordFailedRun(job, NOW, ERROR, 3);
    expect(next.state).toBe('active');
    expect(next.consecutiveFailures).toBe(1);
    expect(next.nextRunAt).toBe(NOW + 60_000);
    expect(next.lastError).toEqual(ERROR);
  });

  it('moves to error at the failure threshold', () => {
    const job = makeJob({ consecutiveFailures: 2 });
    const next = recordFailedRun(job, NOW, ERROR, 3);
    expect(next.state).toBe('error');
    expect(next.consecutiveFailures).toBe(3);
    expect(next.nextRunAt).toBeNull();
    expect(next.lastError).toEqual(ERROR);
  });
});

describe('applyJobChanges', () => {
  it('applies changes and reschedules an active job', () => {
    const job = makeJob({ state: 'active', intervalMs: 60_000 });
    const next = applyJobChanges(
      job,
      { intervalMs: 120_000, reloadOptions: { bypassCache: true } },
      NOW,
    );
    expect(next.intervalMs).toBe(120_000);
    expect(next.reloadOptions.bypassCache).toBe(true);
    expect(next.nextRunAt).toBe(NOW + 120_000);
  });

  it('does not reschedule a paused job', () => {
    const job = makeJob({ state: 'paused', nextRunAt: null, intervalMs: 60_000 });
    const next = applyJobChanges(job, { intervalMs: 120_000 }, NOW);
    expect(next.intervalMs).toBe(120_000);
    expect(next.nextRunAt).toBeNull();
  });

  it('rejects editing a finished job', () => {
    expectDomainError(
      () => applyJobChanges(makeJob({ state: 'completed' }), { intervalMs: 60_000 }, NOW),
      'JOB_STATE_INVALID',
    );
  });
});

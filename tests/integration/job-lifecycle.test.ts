import { describe, it, expect } from 'vitest';
import { pauseJob } from '../../src/application/pause-job';
import { resumeJob } from '../../src/application/resume-job';
import { editJob } from '../../src/application/edit-job';
import { stopJob } from '../../src/application/stop-job';
import { removeJob } from '../../src/application/remove-job';
import { DomainError } from '../../src/domain/errors';
import { createTestHarness, makeJob } from '../support/fakes';
import { expectDomainErrorAsync } from '../support/assertions';

describe('pauseJob', () => {
  it('pauses an active job and cancels its alarm', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'active', revision: 1 })]);

    await pauseJob(harness.deps, 'job-1', 1);

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('paused');
    expect(job?.nextRunAt).toBeNull();
    expect(harness.alarms.cancelled).toContain('job-1');
  });

  it('rejects a stale revision', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', revision: 3 })]);

    await expectDomainErrorAsync(() => pauseJob(harness.deps, 'job-1', 1), 'REVISION_CONFLICT');
  });

  it('rejects a missing job', async () => {
    const harness = createTestHarness();

    await expectDomainErrorAsync(() => pauseJob(harness.deps, 'nope', 1), 'JOB_NOT_FOUND');
  });

  it('does not publish state when persistence fails', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'active', revision: 1 })]);
    harness.jobs.failOnSave(new DomainError('STORAGE_FAILED', 'disk full'));

    await expectDomainErrorAsync(() => pauseJob(harness.deps, 'job-1', 1), 'STORAGE_FAILED');
    expect(harness.badge.counts).toHaveLength(0);
    expect(harness.events.events).toHaveLength(0);
  });
});

describe('resumeJob', () => {
  it('resumes a paused job and schedules a fresh alarm', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'paused', nextRunAt: null, revision: 2 })]);

    await resumeJob(harness.deps, 'job-1', 2);

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('active');
    expect(job?.nextRunAt).toBe(1_060_000);
    expect(harness.alarms.scheduled.at(-1)).toEqual({ jobId: 'job-1', whenMs: 1_060_000 });
  });

  it('completes instead of resuming when the stop condition is already reached', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({
        id: 'job-1',
        state: 'paused',
        nextRunAt: null,
        runsCompleted: 3,
        stopCondition: { type: 'count', maxRuns: 3 },
        revision: 2,
      }),
    ]);

    await resumeJob(harness.deps, 'job-1', 2);

    expect(harness.jobs.jobs[0]?.state).toBe('completed');
    expect(harness.alarms.cancelled).toContain('job-1');
  });
});

describe('editJob', () => {
  it('applies changes and replaces the alarm for an active job', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'active', intervalMs: 60_000, revision: 1 })]);

    await editJob(harness.deps, 'job-1', 1, { intervalMs: 120_000 });

    const job = harness.jobs.jobs[0];
    expect(job?.intervalMs).toBe(120_000);
    expect(job?.nextRunAt).toBe(1_120_000);
    expect(harness.alarms.cancelled).toContain('job-1');
    expect(harness.alarms.scheduled.at(-1)).toEqual({ jobId: 'job-1', whenMs: 1_120_000 });
  });

  it('cancels the alarm without rescheduling when editing a paused job', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'paused', nextRunAt: null, revision: 1 })]);

    await editJob(harness.deps, 'job-1', 1, { intervalMs: 120_000 });

    expect(harness.jobs.jobs[0]?.intervalMs).toBe(120_000);
    expect(harness.alarms.scheduled).toHaveLength(0);
    expect(harness.alarms.cancelled).toContain('job-1');
  });

  it('rejects invalid changes', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'active', revision: 1 })]);

    await expectDomainErrorAsync(
      () => editJob(harness.deps, 'job-1', 1, { intervalMs: 1_000 }),
      'INTERVAL_TOO_SHORT',
    );
  });
});

describe('stopJob', () => {
  it('completes a job and cancels its alarm', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'active', revision: 1 })]);

    await stopJob(harness.deps, 'job-1', 1);

    const job = harness.jobs.jobs[0];
    expect(job?.state).toBe('completed');
    expect(job?.completedAt).toBe(1_000_000);
    expect(harness.alarms.cancelled).toContain('job-1');
  });
});

describe('removeJob', () => {
  it('removes a finished job and clears its session binding', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', tabId: 1, state: 'completed', revision: 1 })]);

    await removeJob(harness.deps, 'job-1', 1);

    expect(harness.jobs.jobs).toHaveLength(0);
    expect(harness.alarms.cancelled).toContain('job-1');
    expect(harness.sessions.cleared).toContain(1);
  });

  it('refuses to remove an active job', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'job-1', state: 'active', revision: 1 })]);

    await expectDomainErrorAsync(() => removeJob(harness.deps, 'job-1', 1), 'JOB_STATE_INVALID');
    expect(harness.jobs.jobs).toHaveLength(1);
  });
});

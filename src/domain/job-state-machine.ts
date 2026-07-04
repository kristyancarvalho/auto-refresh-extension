import type { RefreshJob, RefreshJobError, JobChanges } from './refresh-job';
import { DomainError } from './errors';
import { calculateNextRunAt } from './scheduling-policy';
import { isStopConditionReached } from './stop-condition';

function bump(job: RefreshJob, now: number): RefreshJob {
  return { ...job, revision: job.revision + 1, updatedAt: now };
}

export function pauseJob(job: RefreshJob, now: number): RefreshJob {
  if (job.state !== 'active') {
    throw new DomainError('JOB_STATE_INVALID', 'Only active jobs can be paused.');
  }
  return { ...bump(job, now), state: 'paused', nextRunAt: null };
}

export function resumeJob(job: RefreshJob, now: number): RefreshJob {
  if (job.state !== 'paused') {
    throw new DomainError('JOB_STATE_INVALID', 'Only paused jobs can be resumed.');
  }
  if (isStopConditionReached(job.stopCondition, job.runsCompleted, job.startedAt, now)) {
    return completeJob(job, now);
  }
  return {
    ...bump(job, now),
    state: 'active',
    nextRunAt: calculateNextRunAt(job.intervalMs, now),
    lastError: null,
  };
}

export function completeJob(job: RefreshJob, now: number): RefreshJob {
  return {
    ...bump(job, now),
    state: 'completed',
    nextRunAt: null,
    completedAt: now,
  };
}

export function orphanJob(job: RefreshJob, now: number): RefreshJob {
  return {
    ...bump(job, now),
    state: 'orphaned',
    tabId: null,
    nextRunAt: null,
  };
}

export function failJob(job: RefreshJob, now: number, error: RefreshJobError): RefreshJob {
  return {
    ...bump(job, now),
    state: 'error',
    nextRunAt: null,
    lastError: error,
  };
}

export function reattachJob(job: RefreshJob, tabId: number, now: number): RefreshJob {
  return { ...bump(job, now), tabId };
}

export function recordSuccessfulRun(job: RefreshJob, now: number): RefreshJob {
  const runsCompleted = job.runsCompleted + 1;
  const advanced: RefreshJob = {
    ...bump(job, now),
    runsCompleted,
    consecutiveFailures: 0,
    lastRunAt: now,
    lastError: null,
  };
  if (isStopConditionReached(advanced.stopCondition, runsCompleted, advanced.startedAt, now)) {
    return { ...advanced, state: 'completed', nextRunAt: null, completedAt: now };
  }
  return { ...advanced, state: 'active', nextRunAt: calculateNextRunAt(advanced.intervalMs, now) };
}

export function recordFailedRun(
  job: RefreshJob,
  now: number,
  error: RefreshJobError,
  failureThreshold: number,
): RefreshJob {
  const consecutiveFailures = job.consecutiveFailures + 1;
  if (consecutiveFailures >= failureThreshold) {
    return {
      ...bump(job, now),
      consecutiveFailures,
      state: 'error',
      nextRunAt: null,
      lastError: error,
    };
  }
  return {
    ...bump(job, now),
    consecutiveFailures,
    state: 'active',
    lastRunAt: now,
    nextRunAt: calculateNextRunAt(job.intervalMs, now),
    lastError: error,
  };
}

export function applyJobChanges(job: RefreshJob, changes: JobChanges, now: number): RefreshJob {
  if (job.state !== 'active' && job.state !== 'paused') {
    throw new DomainError('JOB_STATE_INVALID', 'Only active or paused jobs can be edited.');
  }
  const next: RefreshJob = { ...bump(job, now) };
  if (changes.intervalMs !== undefined) {
    next.intervalMs = changes.intervalMs;
  }
  if (changes.stopCondition !== undefined) {
    next.stopCondition = changes.stopCondition;
  }
  if (changes.navigationPolicy !== undefined) {
    next.navigationPolicy = changes.navigationPolicy;
  }
  if (changes.restartPolicy !== undefined) {
    next.restartPolicy = changes.restartPolicy;
  }
  if (changes.reloadOptions !== undefined) {
    next.reloadOptions = { bypassCache: changes.reloadOptions.bypassCache };
  }
  if (next.state === 'active') {
    next.nextRunAt = calculateNextRunAt(next.intervalMs, now);
  }
  return next;
}

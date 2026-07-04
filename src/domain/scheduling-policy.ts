import type { RefreshJob } from './refresh-job';
import { isStopConditionReached } from './stop-condition';

export function calculateNextRunAt(intervalMs: number, from: number): number {
  return from + intervalMs;
}

export function isDue(job: RefreshJob, at: number): boolean {
  if (job.nextRunAt === null) {
    return false;
  }
  return at >= job.nextRunAt;
}

export function shouldExecute(job: RefreshJob, at: number): boolean {
  if (job.state !== 'active') {
    return false;
  }
  if (isStopConditionReached(job.stopCondition, job.runsCompleted, job.startedAt, at)) {
    return false;
  }
  return true;
}

export function hasReachedStopCondition(job: RefreshJob, at: number): boolean {
  return isStopConditionReached(job.stopCondition, job.runsCompleted, job.startedAt, at);
}

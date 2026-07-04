import { DomainError } from '../domain/errors';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { assertRevision, publishState, requireJob } from './state';

export async function removeJob(
  deps: AppDependencies,
  jobId: string,
  revision: number,
): Promise<JobsSnapshot> {
  const job = await requireJob(deps, jobId);
  assertRevision(job, revision);
  if (job.state === 'active') {
    throw new DomainError('JOB_STATE_INVALID', 'Stop the job before removing it.');
  }
  await deps.alarms.cancel(jobId);
  if (job.tabId !== null && deps.sessions.isSupported()) {
    try {
      await deps.sessions.clear(job.tabId);
    } catch (error) {
      await deps.eventLog.record({
        kind: 'session-clear-failed',
        jobId,
        detail: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
  await deps.jobs.remove(jobId);
  return publishState(deps);
}

import { completeJob as completeJobState } from '../domain/job-state-machine';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { assertRevision, publishState, requireJob } from './state';

export async function stopJob(
  deps: AppDependencies,
  jobId: string,
  revision: number,
): Promise<JobsSnapshot> {
  const job = await requireJob(deps, jobId);
  assertRevision(job, revision);
  const stopped = completeJobState(job, deps.clock.now());
  await deps.jobs.save(stopped);
  await deps.alarms.cancel(jobId);
  return publishState(deps);
}

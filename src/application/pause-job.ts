import { pauseJob as pauseJobState } from '../domain/job-state-machine';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { assertRevision, publishState, requireJob } from './state';

export async function pauseJob(
  deps: AppDependencies,
  jobId: string,
  revision: number,
): Promise<JobsSnapshot> {
  const job = await requireJob(deps, jobId);
  assertRevision(job, revision);
  const paused = pauseJobState(job, deps.clock.now());
  await deps.jobs.save(paused);
  await deps.alarms.cancel(jobId);
  return publishState(deps);
}

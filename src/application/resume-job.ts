import { resumeJob as resumeJobState } from '../domain/job-state-machine';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { assertRevision, publishState, requireJob } from './state';

export async function resumeJob(
  deps: AppDependencies,
  jobId: string,
  revision: number,
): Promise<JobsSnapshot> {
  const job = await requireJob(deps, jobId);
  assertRevision(job, revision);
  const resumed = resumeJobState(job, deps.clock.now());
  await deps.jobs.save(resumed);
  if (resumed.state === 'active' && resumed.nextRunAt !== null) {
    await deps.alarms.schedule(jobId, resumed.nextRunAt);
  } else {
    await deps.alarms.cancel(jobId);
  }
  return publishState(deps);
}

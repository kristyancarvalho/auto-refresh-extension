import { applyJobChanges } from '../domain/job-state-machine';
import type { JobChanges } from '../domain/refresh-job';
import { validateJobChanges } from '../shared/validation';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { assertRevision, publishState, requireJob } from './state';

export async function editJob(
  deps: AppDependencies,
  jobId: string,
  revision: number,
  changes: JobChanges,
): Promise<JobsSnapshot> {
  const job = await requireJob(deps, jobId);
  assertRevision(job, revision);
  const now = deps.clock.now();
  validateJobChanges(changes, now);
  const edited = applyJobChanges(job, changes, now);
  await deps.jobs.save(edited);
  await deps.alarms.cancel(jobId);
  if (edited.state === 'active' && edited.nextRunAt !== null) {
    await deps.alarms.schedule(jobId, edited.nextRunAt);
  }
  return publishState(deps);
}

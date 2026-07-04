import { isFinishedState } from '../domain/job-state';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { publishState } from './state';

export async function clearCompletedJobs(deps: AppDependencies): Promise<JobsSnapshot> {
  const jobs = await deps.jobs.list();
  const finished = jobs.filter((job) => isFinishedState(job.state));
  for (const job of finished) {
    await deps.alarms.cancel(job.id);
    if (job.tabId !== null && deps.sessions.isSupported()) {
      try {
        await deps.sessions.clear(job.tabId);
      } catch (error) {
        await deps.eventLog.record({
          kind: 'session-clear-failed',
          jobId: job.id,
          detail: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }
  const remaining = jobs.filter((job) => !isFinishedState(job.state));
  await deps.jobs.replaceAll(remaining);
  return publishState(deps);
}

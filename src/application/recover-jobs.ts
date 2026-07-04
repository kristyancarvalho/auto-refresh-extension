import type { AppDependencies } from './dependencies';
import type { JobsSnapshot } from '../shared/protocol';
import { publishState } from './state';
import { calculateNextRunAt } from '../domain/scheduling-policy';

export async function recoverJobs(deps: AppDependencies): Promise<JobsSnapshot> {
  const settings = await deps.settings.get();
  deps.rateLimiter.configure(settings.maxReloadsPerSecond);

  const jobs = await deps.jobs.list();
  const now = deps.clock.now();

  await deps.alarms.clearAll();

  for (const job of jobs) {
    if (job.state !== 'active') {
      continue;
    }
    const target = job.nextRunAt ?? calculateNextRunAt(job.intervalMs, now);
    const whenMs = target < now ? now : target;
    await deps.alarms.schedule(job.id, whenMs);
  }

  return publishState(deps);
}

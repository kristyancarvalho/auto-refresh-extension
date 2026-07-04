import type { RefreshJob } from '../domain/refresh-job';
import type { ExtensionSettings } from '../domain/settings';
import { hasReachedStopCondition } from '../domain/scheduling-policy';
import { isNavigationAllowed } from '../domain/navigation-policy';
import {
  completeJob as completeJobState,
  orphanJob as orphanJobState,
  pauseJob as pauseJobState,
  recordFailedRun,
  recordSuccessfulRun,
} from '../domain/job-state-machine';
import { ERROR_FAILURE_THRESHOLD } from '../shared/constants';
import { toExtensionError } from '../domain/errors';
import type { AppDependencies } from './dependencies';
import { publishState } from './state';

type CompletionReason = 'completed' | 'error';

async function maybeNotify(
  deps: AppDependencies,
  settings: ExtensionSettings,
  job: RefreshJob,
  reason: CompletionReason,
): Promise<void> {
  if (!settings.notifyOnCompletion) {
    return;
  }
  const label = job.titleSnapshot.length > 0 ? job.titleSnapshot : 'A scheduled tab';
  const message =
    reason === 'completed'
      ? `${label} finished its refresh schedule.`
      : `${label} was stopped after repeated reload failures.`;
  await deps.notifications.notifyCompletion('Auto Refresh', message);
}

export async function executeJob(deps: AppDependencies, jobId: string): Promise<void> {
  const job = await deps.jobs.get(jobId);
  if (!job) {
    await deps.alarms.cancel(jobId);
    return;
  }
  if (job.state !== 'active') {
    await deps.alarms.cancel(jobId);
    return;
  }

  const settings = await deps.settings.get();
  const stopAt = deps.clock.now();
  if (hasReachedStopCondition(job, stopAt)) {
    const completed = completeJobState(job, stopAt);
    await deps.jobs.save(completed);
    await deps.alarms.cancel(jobId);
    await maybeNotify(deps, settings, completed, 'completed');
    await publishState(deps);
    return;
  }

  const tab = job.tabId !== null ? await deps.tabs.get(job.tabId) : null;
  if (!tab) {
    const orphaned = orphanJobState(job, deps.clock.now());
    await deps.jobs.save(orphaned);
    await deps.alarms.cancel(jobId);
    await publishState(deps);
    return;
  }

  const allowed = isNavigationAllowed(job.navigationPolicy, {
    originalUrl: job.originalUrl,
    originalOrigin: job.originalOrigin,
    currentUrl: tab.url,
  });
  if (!allowed) {
    const paused = pauseJobState(job, deps.clock.now());
    await deps.jobs.save(paused);
    await deps.alarms.cancel(jobId);
    await deps.eventLog.record({
      kind: 'navigation-paused',
      jobId,
      detail: job.navigationPolicy,
    });
    await publishState(deps);
    return;
  }

  try {
    await deps.rateLimiter.run(() =>
      deps.tabs.reload({ tabId: tab.tabId, bypassCache: job.reloadOptions.bypassCache }),
    );
  } catch (error) {
    const failure = toExtensionError(error);
    const failed = recordFailedRun(
      job,
      deps.clock.now(),
      { code: 'RELOAD_FAILED', message: failure.message, occurredAt: deps.clock.now() },
      ERROR_FAILURE_THRESHOLD,
    );
    await deps.jobs.save(failed);
    if (failed.state === 'error') {
      await deps.alarms.cancel(jobId);
      await maybeNotify(deps, settings, failed, 'error');
    } else if (failed.nextRunAt !== null) {
      await deps.alarms.schedule(jobId, failed.nextRunAt);
    }
    await deps.eventLog.record({ kind: 'reload-failed', jobId, detail: failure.message });
    await publishState(deps);
    return;
  }

  const succeeded = recordSuccessfulRun(job, deps.clock.now());
  await deps.jobs.save(succeeded);
  if (succeeded.state === 'completed') {
    await deps.alarms.cancel(jobId);
    await maybeNotify(deps, settings, succeeded, 'completed');
  } else if (succeeded.nextRunAt !== null) {
    await deps.alarms.schedule(jobId, succeeded.nextRunAt);
  }
  await publishState(deps);
}

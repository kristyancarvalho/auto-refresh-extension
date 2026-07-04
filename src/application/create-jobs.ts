import type { JobConfiguration } from '../domain/refresh-job';
import { createRefreshJob, occupiesTab } from '../domain/refresh-job';
import { originOf } from '../domain/navigation-policy';
import { DomainError } from '../domain/errors';
import { calculateNextRunAt } from '../domain/scheduling-policy';
import { validateJobConfiguration, isSupportedUrlScheme } from '../shared/validation';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { publishState } from './state';

export interface CreateJobsInput {
  tabIds: number[];
  configuration: JobConfiguration;
}

export async function createJobs(
  deps: AppDependencies,
  input: CreateJobsInput,
): Promise<JobsSnapshot> {
  const now = deps.clock.now();
  validateJobConfiguration(input.configuration, now);

  const uniqueTabIds = [...new Set(input.tabIds)];
  if (uniqueTabIds.length === 0) {
    throw new DomainError('MESSAGE_INVALID', 'Select at least one tab to refresh.');
  }

  const settings = await deps.settings.get();
  const existing = await deps.jobs.list();
  const occupied = new Set(existing.filter(occupiesTab).map((job) => job.tabId));
  const occupyingCount = existing.filter(occupiesTab).length;

  if (occupyingCount + uniqueTabIds.length > settings.maxActiveJobs) {
    throw new DomainError(
      'ACTIVE_JOB_LIMIT_REACHED',
      `You can run at most ${settings.maxActiveJobs} refresh jobs at once.`,
    );
  }

  const created = [];
  for (const tabId of uniqueTabIds) {
    if (occupied.has(tabId)) {
      throw new DomainError('JOB_CONFLICT', 'This tab already has a refresh job.');
    }
    const tab = await deps.tabs.get(tabId);
    if (!tab) {
      throw new DomainError('TAB_NOT_FOUND', 'One of the selected tabs is no longer available.');
    }
    if (!isSupportedUrlScheme(tab.url)) {
      throw new DomainError(
        'TAB_URL_UNSUPPORTED',
        'Only http and https tabs can be refreshed automatically.',
      );
    }
    const nextRunAt = calculateNextRunAt(input.configuration.intervalMs, now);
    const job = createRefreshJob({
      id: deps.ids.create(),
      tab: { tabId, url: tab.url, origin: originOf(tab.url), title: tab.title },
      configuration: input.configuration,
      now,
      nextRunAt,
    });
    created.push(job);
  }

  await deps.jobs.saveMany(created);

  for (const job of created) {
    if (job.nextRunAt !== null) {
      await deps.alarms.schedule(job.id, job.nextRunAt);
    }
    if (job.tabId !== null && deps.sessions.isSupported()) {
      try {
        await deps.sessions.bind(job.tabId, job.id);
      } catch {
        await deps.eventLog.record({
          kind: 'session-binding-failed',
          jobId: job.id,
          detail: 'Could not bind job to tab session.',
        });
      }
    }
  }

  return publishState(deps);
}

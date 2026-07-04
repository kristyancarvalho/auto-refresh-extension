import type { StopCondition } from './stop-condition';
import type { NavigationPolicy } from './navigation-policy';
import type { RestartPolicy } from './restart-policy';
import type { RefreshJobState } from './job-state';

export interface RefreshJobError {
  code: string;
  message: string;
  occurredAt: number;
}

export interface ReloadOptions {
  bypassCache: boolean;
}

export interface RefreshJob {
  id: string;
  tabId: number | null;
  originalUrl: string;
  originalOrigin: string;
  titleSnapshot: string;
  intervalMs: number;
  stopCondition: StopCondition;
  state: RefreshJobState;
  runsCompleted: number;
  consecutiveFailures: number;
  startedAt: number;
  nextRunAt: number | null;
  lastRunAt: number | null;
  completedAt: number | null;
  reloadOptions: ReloadOptions;
  navigationPolicy: NavigationPolicy;
  restartPolicy: RestartPolicy;
  lastError: RefreshJobError | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface JobConfiguration {
  intervalMs: number;
  stopCondition: StopCondition;
  navigationPolicy: NavigationPolicy;
  restartPolicy: RestartPolicy;
  reloadOptions: ReloadOptions;
}

export interface JobChanges {
  intervalMs?: number;
  stopCondition?: StopCondition;
  navigationPolicy?: NavigationPolicy;
  restartPolicy?: RestartPolicy;
  reloadOptions?: ReloadOptions;
}

export interface JobTabSnapshot {
  tabId: number;
  url: string;
  origin: string;
  title: string;
}

export interface CreateRefreshJobInput {
  id: string;
  tab: JobTabSnapshot;
  configuration: JobConfiguration;
  now: number;
  nextRunAt: number;
}

export function createRefreshJob(input: CreateRefreshJobInput): RefreshJob {
  const { id, tab, configuration, now, nextRunAt } = input;
  return {
    id,
    tabId: tab.tabId,
    originalUrl: tab.url,
    originalOrigin: tab.origin,
    titleSnapshot: tab.title,
    intervalMs: configuration.intervalMs,
    stopCondition: configuration.stopCondition,
    state: 'active',
    runsCompleted: 0,
    consecutiveFailures: 0,
    startedAt: now,
    nextRunAt,
    lastRunAt: null,
    completedAt: null,
    reloadOptions: { bypassCache: configuration.reloadOptions.bypassCache },
    navigationPolicy: configuration.navigationPolicy,
    restartPolicy: configuration.restartPolicy,
    lastError: null,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function isActiveJobState(job: RefreshJob): boolean {
  return job.state === 'active';
}

export function occupiesTab(job: RefreshJob): boolean {
  return job.state === 'active' || job.state === 'paused';
}

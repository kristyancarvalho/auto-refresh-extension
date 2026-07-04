import type { StopCondition } from './stop-condition';
import type { NavigationPolicy } from './navigation-policy';
import type { RestartPolicy } from './restart-policy';
import {
  DEFAULT_COMPLETED_RETENTION_DAYS,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MAX_ACTIVE_JOBS,
  DEFAULT_MAX_RELOADS_PER_SECOND,
} from '../shared/constants';

export interface ExtensionSettings {
  defaultIntervalMs: number;
  defaultStopCondition: StopCondition;
  defaultNavigationPolicy: NavigationPolicy;
  defaultRestartPolicy: RestartPolicy;
  maxActiveJobs: number;
  maxReloadsPerSecond: number;
  notifyOnCompletion: boolean;
  completedJobRetentionDays: number;
}

export function createDefaultSettings(): ExtensionSettings {
  return {
    defaultIntervalMs: DEFAULT_INTERVAL_MS,
    defaultStopCondition: { type: 'never' },
    defaultNavigationPolicy: 'same-origin',
    defaultRestartPolicy: 'pause',
    maxActiveJobs: DEFAULT_MAX_ACTIVE_JOBS,
    maxReloadsPerSecond: DEFAULT_MAX_RELOADS_PER_SECOND,
    notifyOnCompletion: true,
    completedJobRetentionDays: DEFAULT_COMPLETED_RETENTION_DAYS,
  };
}

export function mergeSettings(
  base: ExtensionSettings,
  changes: Partial<ExtensionSettings>,
): ExtensionSettings {
  return {
    defaultIntervalMs: changes.defaultIntervalMs ?? base.defaultIntervalMs,
    defaultStopCondition: changes.defaultStopCondition ?? base.defaultStopCondition,
    defaultNavigationPolicy: changes.defaultNavigationPolicy ?? base.defaultNavigationPolicy,
    defaultRestartPolicy: changes.defaultRestartPolicy ?? base.defaultRestartPolicy,
    maxActiveJobs: changes.maxActiveJobs ?? base.maxActiveJobs,
    maxReloadsPerSecond: changes.maxReloadsPerSecond ?? base.maxReloadsPerSecond,
    notifyOnCompletion: changes.notifyOnCompletion ?? base.notifyOnCompletion,
    completedJobRetentionDays: changes.completedJobRetentionDays ?? base.completedJobRetentionDays,
  };
}

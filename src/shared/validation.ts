import { DomainError } from '../domain/errors';
import type { JobConfiguration, JobChanges } from '../domain/refresh-job';
import type { ExtensionSettings } from '../domain/settings';
import { validateStopCondition } from '../domain/stop-condition';
import type { NavigationPolicy } from '../domain/navigation-policy';
import type { RestartPolicy } from '../domain/restart-policy';
import { MAX_INTERVAL_MS, MIN_INTERVAL_MS, SUPPORTED_URL_SCHEMES } from './constants';

const NAVIGATION_POLICIES: readonly NavigationPolicy[] = ['follow-tab', 'same-origin', 'exact-url'];

const RESTART_POLICIES: readonly RestartPolicy[] = ['pause', 'resume-if-restored'];

export function validateIntervalMs(intervalMs: number): void {
  if (!Number.isFinite(intervalMs) || !Number.isInteger(intervalMs)) {
    throw new DomainError('INTERVAL_INVALID', 'Interval must be a whole number of milliseconds.');
  }
  if (intervalMs < MIN_INTERVAL_MS) {
    throw new DomainError('INTERVAL_TOO_SHORT', 'Interval must be at least 30 seconds.');
  }
  if (intervalMs > MAX_INTERVAL_MS) {
    throw new DomainError('INTERVAL_INVALID', 'Interval must not exceed 24 hours.');
  }
}

export function isSupportedUrlScheme(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (SUPPORTED_URL_SCHEMES as readonly string[]).includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isNavigationPolicy(value: unknown): value is NavigationPolicy {
  return typeof value === 'string' && NAVIGATION_POLICIES.includes(value as NavigationPolicy);
}

export function isRestartPolicy(value: unknown): value is RestartPolicy {
  return typeof value === 'string' && RESTART_POLICIES.includes(value as RestartPolicy);
}

export function validateJobConfiguration(configuration: JobConfiguration, now: number): void {
  validateIntervalMs(configuration.intervalMs);
  validateStopCondition(configuration.stopCondition, now);
  if (!isNavigationPolicy(configuration.navigationPolicy)) {
    throw new DomainError('STOP_CONDITION_INVALID', 'Unknown navigation policy.');
  }
  if (!isRestartPolicy(configuration.restartPolicy)) {
    throw new DomainError('STOP_CONDITION_INVALID', 'Unknown restart policy.');
  }
}

export function validateJobChanges(changes: JobChanges, now: number): void {
  if (changes.intervalMs !== undefined) {
    validateIntervalMs(changes.intervalMs);
  }
  if (changes.stopCondition !== undefined) {
    validateStopCondition(changes.stopCondition, now);
  }
  if (changes.navigationPolicy !== undefined && !isNavigationPolicy(changes.navigationPolicy)) {
    throw new DomainError('STOP_CONDITION_INVALID', 'Unknown navigation policy.');
  }
  if (changes.restartPolicy !== undefined && !isRestartPolicy(changes.restartPolicy)) {
    throw new DomainError('STOP_CONDITION_INVALID', 'Unknown restart policy.');
  }
}

export function validateSettings(settings: ExtensionSettings, now: number): void {
  validateIntervalMs(settings.defaultIntervalMs);
  validateStopCondition(settings.defaultStopCondition, now);
  if (!isNavigationPolicy(settings.defaultNavigationPolicy)) {
    throw new DomainError('SETTINGS_INVALID', 'Unknown default navigation policy.');
  }
  if (!isRestartPolicy(settings.defaultRestartPolicy)) {
    throw new DomainError('SETTINGS_INVALID', 'Unknown default restart policy.');
  }
  if (!isPositiveInteger(settings.maxActiveJobs) || settings.maxActiveJobs > 500) {
    throw new DomainError('SETTINGS_INVALID', 'Maximum active jobs must be between 1 and 500.');
  }
  if (!isPositiveInteger(settings.maxReloadsPerSecond) || settings.maxReloadsPerSecond > 20) {
    throw new DomainError(
      'SETTINGS_INVALID',
      'Maximum reloads per second must be between 1 and 20.',
    );
  }
  if (typeof settings.notifyOnCompletion !== 'boolean') {
    throw new DomainError(
      'SETTINGS_INVALID',
      'Completion notification preference must be a boolean.',
    );
  }
  if (
    !Number.isInteger(settings.completedJobRetentionDays) ||
    settings.completedJobRetentionDays < 0 ||
    settings.completedJobRetentionDays > 365
  ) {
    throw new DomainError(
      'SETTINGS_INVALID',
      'Completed job retention must be between 0 and 365 days.',
    );
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

import type { RefreshJob } from '../../domain/refresh-job';
import type { RefreshJobState } from '../../domain/job-state';
import type { StopCondition } from '../../domain/stop-condition';
import type { NavigationPolicy } from '../../domain/navigation-policy';
import type { RestartPolicy } from '../../domain/restart-policy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isState(value: unknown): value is RefreshJobState {
  return (
    value === 'active' ||
    value === 'paused' ||
    value === 'completed' ||
    value === 'orphaned' ||
    value === 'error'
  );
}

function isNavigationPolicy(value: unknown): value is NavigationPolicy {
  return value === 'follow-tab' || value === 'same-origin' || value === 'exact-url';
}

function isRestartPolicy(value: unknown): value is RestartPolicy {
  return value === 'pause' || value === 'resume-if-restored';
}

function isStopCondition(value: unknown): value is StopCondition {
  if (!isRecord(value)) {
    return false;
  }
  switch (value['type']) {
    case 'never':
      return true;
    case 'duration':
      return typeof value['durationMs'] === 'number';
    case 'count':
      return typeof value['maxRuns'] === 'number';
    case 'deadline':
      return typeof value['endsAt'] === 'number';
    default:
      return false;
  }
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

export function isValidStoredJob(value: unknown): value is RefreshJob {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['id'] === 'string' &&
    isNumberOrNull(value['tabId']) &&
    typeof value['originalUrl'] === 'string' &&
    typeof value['originalOrigin'] === 'string' &&
    typeof value['titleSnapshot'] === 'string' &&
    typeof value['intervalMs'] === 'number' &&
    isStopCondition(value['stopCondition']) &&
    isState(value['state']) &&
    typeof value['runsCompleted'] === 'number' &&
    typeof value['consecutiveFailures'] === 'number' &&
    typeof value['startedAt'] === 'number' &&
    isNumberOrNull(value['nextRunAt']) &&
    isNumberOrNull(value['lastRunAt']) &&
    isNumberOrNull(value['completedAt']) &&
    isRecord(value['reloadOptions']) &&
    typeof value['reloadOptions']['bypassCache'] === 'boolean' &&
    isNavigationPolicy(value['navigationPolicy']) &&
    isRestartPolicy(value['restartPolicy']) &&
    typeof value['revision'] === 'number' &&
    typeof value['createdAt'] === 'number' &&
    typeof value['updatedAt'] === 'number'
  );
}

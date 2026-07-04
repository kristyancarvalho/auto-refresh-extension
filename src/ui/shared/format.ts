import type { RefreshJobState } from '../../domain/job-state';
import type { NavigationPolicy } from '../../domain/navigation-policy';
import type { RestartPolicy } from '../../domain/restart-policy';
import type { RefreshJob } from '../../domain/refresh-job';
import { formatDuration } from '../../shared/time';
import { describeStopCondition } from '../../domain/stop-condition';

const STATUS_LABELS: Record<RefreshJobState, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  orphaned: 'Orphaned',
  error: 'Error',
};

const NAVIGATION_LABELS: Record<NavigationPolicy, string> = {
  'follow-tab': 'Follow tab',
  'same-origin': 'Same origin',
  'exact-url': 'Exact URL',
};

const RESTART_LABELS: Record<RestartPolicy, string> = {
  pause: 'Pause on restart',
  'resume-if-restored': 'Resume if restored',
};

export function statusLabel(state: RefreshJobState): string {
  return STATUS_LABELS[state];
}

export function navigationLabel(policy: NavigationPolicy): string {
  return NAVIGATION_LABELS[policy];
}

export function restartLabel(policy: RestartPolicy): string {
  return RESTART_LABELS[policy];
}

export function formatCountdown(nextRunAt: number | null, now: number): string {
  if (nextRunAt === null) {
    return 'Not scheduled';
  }
  const remaining = nextRunAt - now;
  if (remaining <= 0) {
    return 'Due now';
  }
  return `Next in ${formatDuration(remaining)}`;
}

export function formatInterval(intervalMs: number): string {
  return `Every ${formatDuration(intervalMs)}`;
}

export function jobSummary(job: RefreshJob): string {
  return describeStopCondition(job.stopCondition);
}

export function jobTitle(job: RefreshJob): string {
  if (job.titleSnapshot.length > 0) {
    return job.titleSnapshot;
  }
  return job.originalUrl;
}

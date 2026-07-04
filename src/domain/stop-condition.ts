import { DomainError } from './errors';
import { MAX_INTERVAL_MS } from '../shared/constants';

export type StopCondition =
  | { type: 'never' }
  | { type: 'duration'; durationMs: number }
  | { type: 'count'; maxRuns: number }
  | { type: 'deadline'; endsAt: number };

export type StopConditionType = StopCondition['type'];

const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

const MAX_COUNT = 100_000;

export function validateStopCondition(condition: StopCondition, now: number): void {
  switch (condition.type) {
    case 'never':
      return;
    case 'duration':
      if (!Number.isFinite(condition.durationMs) || condition.durationMs <= 0) {
        throw new DomainError('STOP_CONDITION_INVALID', 'Duration must be greater than zero.');
      }
      if (condition.durationMs > MAX_DURATION_MS) {
        throw new DomainError('STOP_CONDITION_INVALID', 'Duration exceeds the supported maximum.');
      }
      return;
    case 'count':
      if (!Number.isInteger(condition.maxRuns) || condition.maxRuns <= 0) {
        throw new DomainError(
          'STOP_CONDITION_INVALID',
          'Reload count must be a positive whole number.',
        );
      }
      if (condition.maxRuns > MAX_COUNT) {
        throw new DomainError(
          'STOP_CONDITION_INVALID',
          'Reload count exceeds the supported maximum.',
        );
      }
      return;
    case 'deadline':
      if (!Number.isFinite(condition.endsAt)) {
        throw new DomainError('STOP_CONDITION_INVALID', 'Deadline is not a valid time.');
      }
      if (condition.endsAt <= now) {
        throw new DomainError('STOP_CONDITION_INVALID', 'Deadline must be in the future.');
      }
      if (condition.endsAt - now > MAX_DURATION_MS) {
        throw new DomainError('STOP_CONDITION_INVALID', 'Deadline exceeds the supported maximum.');
      }
      return;
  }
}

export function isStopConditionReached(
  condition: StopCondition,
  runsCompleted: number,
  startedAt: number,
  at: number,
): boolean {
  switch (condition.type) {
    case 'never':
      return false;
    case 'duration':
      return at - startedAt >= condition.durationMs;
    case 'count':
      return runsCompleted >= condition.maxRuns;
    case 'deadline':
      return at >= condition.endsAt;
  }
}

export function wouldReachAfterRun(condition: StopCondition, runsCompletedAfter: number): boolean {
  if (condition.type === 'count') {
    return runsCompletedAfter >= condition.maxRuns;
  }
  return false;
}

export function describeStopCondition(condition: StopCondition): string {
  switch (condition.type) {
    case 'never':
      return 'Runs until stopped';
    case 'duration':
      return 'Stops after a set duration';
    case 'count':
      return `Stops after ${condition.maxRuns} reloads`;
    case 'deadline':
      return 'Stops at a set time';
  }
}

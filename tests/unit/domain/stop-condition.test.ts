import { describe, it, expect } from 'vitest';
import {
  describeStopCondition,
  isStopConditionReached,
  validateStopCondition,
  wouldReachAfterRun,
} from '../../../src/domain/stop-condition';
import type { StopCondition } from '../../../src/domain/stop-condition';
import { expectDomainError } from '../../support/assertions';

const NOW = 1_000_000;
const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

describe('validateStopCondition', () => {
  it('accepts the never condition', () => {
    expect(() => validateStopCondition({ type: 'never' }, NOW)).not.toThrow();
  });

  it('validates duration bounds', () => {
    expect(() => validateStopCondition({ type: 'duration', durationMs: 1_000 }, NOW)).not.toThrow();
    expectDomainError(
      () => validateStopCondition({ type: 'duration', durationMs: 0 }, NOW),
      'STOP_CONDITION_INVALID',
    );
    expectDomainError(
      () => validateStopCondition({ type: 'duration', durationMs: Number.POSITIVE_INFINITY }, NOW),
      'STOP_CONDITION_INVALID',
    );
    expectDomainError(
      () => validateStopCondition({ type: 'duration', durationMs: MAX_DURATION_MS + 1 }, NOW),
      'STOP_CONDITION_INVALID',
    );
  });

  it('validates count bounds', () => {
    expect(() => validateStopCondition({ type: 'count', maxRuns: 5 }, NOW)).not.toThrow();
    expectDomainError(
      () => validateStopCondition({ type: 'count', maxRuns: 0 }, NOW),
      'STOP_CONDITION_INVALID',
    );
    expectDomainError(
      () => validateStopCondition({ type: 'count', maxRuns: 1.5 }, NOW),
      'STOP_CONDITION_INVALID',
    );
    expectDomainError(
      () => validateStopCondition({ type: 'count', maxRuns: 100_001 }, NOW),
      'STOP_CONDITION_INVALID',
    );
  });

  it('validates deadline bounds', () => {
    expect(() =>
      validateStopCondition({ type: 'deadline', endsAt: NOW + 10_000 }, NOW),
    ).not.toThrow();
    expectDomainError(
      () => validateStopCondition({ type: 'deadline', endsAt: Number.NaN }, NOW),
      'STOP_CONDITION_INVALID',
    );
    expectDomainError(
      () => validateStopCondition({ type: 'deadline', endsAt: NOW }, NOW),
      'STOP_CONDITION_INVALID',
    );
    expectDomainError(
      () => validateStopCondition({ type: 'deadline', endsAt: NOW + MAX_DURATION_MS + 1 }, NOW),
      'STOP_CONDITION_INVALID',
    );
  });
});

describe('isStopConditionReached', () => {
  it('never is never reached', () => {
    expect(isStopConditionReached({ type: 'never' }, 100, NOW, NOW + 1_000_000)).toBe(false);
  });

  it('duration is reached once elapsed time meets the limit', () => {
    const condition: StopCondition = { type: 'duration', durationMs: 10_000 };
    expect(isStopConditionReached(condition, 0, NOW, NOW + 9_999)).toBe(false);
    expect(isStopConditionReached(condition, 0, NOW, NOW + 10_000)).toBe(true);
  });

  it('count is reached once runs meet the limit', () => {
    const condition: StopCondition = { type: 'count', maxRuns: 3 };
    expect(isStopConditionReached(condition, 2, NOW, NOW)).toBe(false);
    expect(isStopConditionReached(condition, 3, NOW, NOW)).toBe(true);
  });

  it('deadline is reached at or after the timestamp', () => {
    const condition: StopCondition = { type: 'deadline', endsAt: NOW + 5_000 };
    expect(isStopConditionReached(condition, 0, NOW, NOW + 4_999)).toBe(false);
    expect(isStopConditionReached(condition, 0, NOW, NOW + 5_000)).toBe(true);
  });
});

describe('wouldReachAfterRun', () => {
  it('is true for count conditions once the projected runs meet the limit', () => {
    expect(wouldReachAfterRun({ type: 'count', maxRuns: 2 }, 2)).toBe(true);
    expect(wouldReachAfterRun({ type: 'count', maxRuns: 2 }, 1)).toBe(false);
  });

  it('is false for non-count conditions', () => {
    expect(wouldReachAfterRun({ type: 'never' }, 100)).toBe(false);
    expect(wouldReachAfterRun({ type: 'duration', durationMs: 1 }, 100)).toBe(false);
  });
});

describe('describeStopCondition', () => {
  it('returns human-readable descriptions', () => {
    expect(describeStopCondition({ type: 'never' })).toContain('stopped');
    expect(describeStopCondition({ type: 'count', maxRuns: 4 })).toContain('4');
  });
});

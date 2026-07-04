import { describe, it, expect } from 'vitest';
import {
  calculateNextRunAt,
  hasReachedStopCondition,
  isDue,
  shouldExecute,
} from '../../../src/domain/scheduling-policy';
import { makeJob } from '../../support/fakes';

describe('calculateNextRunAt', () => {
  it('adds the interval to the base time', () => {
    expect(calculateNextRunAt(60_000, 1_000_000)).toBe(1_060_000);
  });
});

describe('isDue', () => {
  it('is false when nextRunAt is null', () => {
    expect(isDue(makeJob({ nextRunAt: null }), 5_000_000)).toBe(false);
  });

  it('is true only at or after nextRunAt', () => {
    const job = makeJob({ nextRunAt: 1_060_000 });
    expect(isDue(job, 1_059_999)).toBe(false);
    expect(isDue(job, 1_060_000)).toBe(true);
  });
});

describe('shouldExecute', () => {
  it('is true for an active job that has not reached its stop condition', () => {
    const job = makeJob({ state: 'active', stopCondition: { type: 'never' } });
    expect(shouldExecute(job, 2_000_000)).toBe(true);
  });

  it('is false for a non-active job', () => {
    expect(shouldExecute(makeJob({ state: 'paused' }), 2_000_000)).toBe(false);
  });

  it('is false when the stop condition is already reached', () => {
    const job = makeJob({
      state: 'active',
      stopCondition: { type: 'count', maxRuns: 1 },
      runsCompleted: 1,
    });
    expect(shouldExecute(job, 2_000_000)).toBe(false);
  });
});

describe('hasReachedStopCondition', () => {
  it('mirrors the stop-condition evaluation for the job', () => {
    const job = makeJob({ stopCondition: { type: 'count', maxRuns: 2 }, runsCompleted: 2 });
    expect(hasReachedStopCondition(job, job.startedAt)).toBe(true);
  });
});

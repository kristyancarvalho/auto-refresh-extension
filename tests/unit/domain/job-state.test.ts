import { describe, it, expect } from 'vitest';
import {
  isActiveState,
  isFinishedState,
  isPausedState,
  isSchedulableState,
} from '../../../src/domain/job-state';

describe('job-state predicates', () => {
  it('identifies the active state', () => {
    expect(isActiveState('active')).toBe(true);
    expect(isActiveState('paused')).toBe(false);
  });

  it('identifies the paused state', () => {
    expect(isPausedState('paused')).toBe(true);
    expect(isPausedState('active')).toBe(false);
  });

  it('identifies finished states', () => {
    expect(isFinishedState('completed')).toBe(true);
    expect(isFinishedState('error')).toBe(true);
    expect(isFinishedState('orphaned')).toBe(true);
    expect(isFinishedState('active')).toBe(false);
    expect(isFinishedState('paused')).toBe(false);
  });

  it('treats only the active state as schedulable', () => {
    expect(isSchedulableState('active')).toBe(true);
    expect(isSchedulableState('paused')).toBe(false);
  });
});

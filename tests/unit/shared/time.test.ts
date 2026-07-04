import { describe, it, expect } from 'vitest';
import { formatDuration, intervalToMs, msToInterval } from '../../../src/shared/time';

describe('intervalToMs', () => {
  it('converts each unit to milliseconds', () => {
    expect(intervalToMs(45, 'seconds')).toBe(45_000);
    expect(intervalToMs(2, 'minutes')).toBe(120_000);
    expect(intervalToMs(1, 'hours')).toBe(3_600_000);
  });

  it('rounds fractional results', () => {
    expect(intervalToMs(1.5, 'seconds')).toBe(1_500);
    expect(intervalToMs(0.5, 'minutes')).toBe(30_000);
  });
});

describe('msToInterval', () => {
  it('prefers hours when evenly divisible', () => {
    expect(msToInterval(7_200_000)).toEqual({ value: 2, unit: 'hours' });
  });

  it('prefers minutes when evenly divisible but not hours', () => {
    expect(msToInterval(120_000)).toEqual({ value: 2, unit: 'minutes' });
  });

  it('falls back to seconds otherwise', () => {
    expect(msToInterval(45_000)).toEqual({ value: 45, unit: 'seconds' });
    expect(msToInterval(90_000)).toEqual({ value: 90, unit: 'seconds' });
  });
});

describe('formatDuration', () => {
  it('returns 0s for zero and negative input', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-5_000)).toBe('0s');
  });

  it('composes hours, minutes, and seconds skipping zero parts', () => {
    expect(formatDuration(1_000)).toBe('1s');
    expect(formatDuration(60_000)).toBe('1m');
    expect(formatDuration(65_000)).toBe('1m 5s');
    expect(formatDuration(3_600_000)).toBe('1h');
    expect(formatDuration(3_661_000)).toBe('1h 1m 1s');
  });
});

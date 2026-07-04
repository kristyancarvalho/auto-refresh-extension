import { describe, it, expect } from 'vitest';
import { createDefaultSettings, mergeSettings } from '../../../src/domain/settings';
import type { ExtensionSettings } from '../../../src/domain/settings';

describe('createDefaultSettings', () => {
  it('returns the documented defaults', () => {
    expect(createDefaultSettings()).toEqual({
      defaultIntervalMs: 60_000,
      defaultStopCondition: { type: 'never' },
      defaultNavigationPolicy: 'same-origin',
      defaultRestartPolicy: 'pause',
      maxActiveJobs: 50,
      maxReloadsPerSecond: 3,
      notifyOnCompletion: true,
      completedJobRetentionDays: 7,
    });
  });
});

describe('mergeSettings', () => {
  it('overrides only the provided fields', () => {
    const merged = mergeSettings(createDefaultSettings(), {
      maxActiveJobs: 10,
      notifyOnCompletion: false,
    });
    expect(merged.maxActiveJobs).toBe(10);
    expect(merged.notifyOnCompletion).toBe(false);
    expect(merged.maxReloadsPerSecond).toBe(3);
  });

  it('falls back to base values when a change is undefined', () => {
    const changes = { maxReloadsPerSecond: undefined } as unknown as Partial<ExtensionSettings>;
    const merged = mergeSettings(createDefaultSettings(), changes);
    expect(merged.maxReloadsPerSecond).toBe(3);
  });
});

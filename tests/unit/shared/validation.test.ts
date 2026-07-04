import { describe, it, expect } from 'vitest';
import {
  isNavigationPolicy,
  isRestartPolicy,
  isSupportedUrlScheme,
  validateIntervalMs,
  validateJobChanges,
  validateJobConfiguration,
  validateSettings,
} from '../../../src/shared/validation';
import { MAX_INTERVAL_MS, MIN_INTERVAL_MS } from '../../../src/shared/constants';
import { createDefaultSettings } from '../../../src/domain/settings';
import type { ExtensionSettings } from '../../../src/domain/settings';
import type { JobConfiguration } from '../../../src/domain/refresh-job';
import { expectDomainError } from '../../support/assertions';

const NOW = 1_000_000;

function baseConfiguration(): JobConfiguration {
  return {
    intervalMs: 60_000,
    stopCondition: { type: 'never' },
    navigationPolicy: 'same-origin',
    restartPolicy: 'pause',
    reloadOptions: { bypassCache: false },
  };
}

describe('validateIntervalMs', () => {
  it('accepts the minimum and maximum bounds', () => {
    expect(() => validateIntervalMs(MIN_INTERVAL_MS)).not.toThrow();
    expect(() => validateIntervalMs(MAX_INTERVAL_MS)).not.toThrow();
  });

  it('rejects non-integer intervals as INTERVAL_INVALID', () => {
    expectDomainError(() => validateIntervalMs(1000.5), 'INTERVAL_INVALID');
  });

  it('rejects non-finite intervals as INTERVAL_INVALID', () => {
    expectDomainError(() => validateIntervalMs(Number.POSITIVE_INFINITY), 'INTERVAL_INVALID');
    expectDomainError(() => validateIntervalMs(Number.NaN), 'INTERVAL_INVALID');
  });

  it('rejects intervals below the minimum as INTERVAL_TOO_SHORT', () => {
    expectDomainError(() => validateIntervalMs(MIN_INTERVAL_MS - 1), 'INTERVAL_TOO_SHORT');
  });

  it('rejects intervals above the maximum as INTERVAL_INVALID', () => {
    expectDomainError(() => validateIntervalMs(MAX_INTERVAL_MS + 1), 'INTERVAL_INVALID');
  });
});

describe('isSupportedUrlScheme', () => {
  it('accepts http and https', () => {
    expect(isSupportedUrlScheme('http://example.com')).toBe(true);
    expect(isSupportedUrlScheme('https://example.com/path')).toBe(true);
  });

  it('rejects unsupported schemes and malformed urls', () => {
    expect(isSupportedUrlScheme('about:blank')).toBe(false);
    expect(isSupportedUrlScheme('file:///tmp/x')).toBe(false);
    expect(isSupportedUrlScheme('ftp://example.com')).toBe(false);
    expect(isSupportedUrlScheme('not a url')).toBe(false);
  });
});

describe('policy type guards', () => {
  it('recognizes valid navigation policies', () => {
    expect(isNavigationPolicy('follow-tab')).toBe(true);
    expect(isNavigationPolicy('same-origin')).toBe(true);
    expect(isNavigationPolicy('exact-url')).toBe(true);
    expect(isNavigationPolicy('other')).toBe(false);
    expect(isNavigationPolicy(5)).toBe(false);
  });

  it('recognizes valid restart policies', () => {
    expect(isRestartPolicy('pause')).toBe(true);
    expect(isRestartPolicy('resume-if-restored')).toBe(true);
    expect(isRestartPolicy('resume')).toBe(false);
  });
});

describe('validateJobConfiguration', () => {
  it('accepts a valid configuration', () => {
    expect(() => validateJobConfiguration(baseConfiguration(), NOW)).not.toThrow();
  });

  it('rejects an unknown navigation policy', () => {
    const configuration = {
      ...baseConfiguration(),
      navigationPolicy: 'nope',
    } as unknown as JobConfiguration;
    expectDomainError(() => validateJobConfiguration(configuration, NOW), 'STOP_CONDITION_INVALID');
  });

  it('rejects an unknown restart policy', () => {
    const configuration = {
      ...baseConfiguration(),
      restartPolicy: 'nope',
    } as unknown as JobConfiguration;
    expectDomainError(() => validateJobConfiguration(configuration, NOW), 'STOP_CONDITION_INVALID');
  });

  it('propagates interval validation errors', () => {
    const configuration = { ...baseConfiguration(), intervalMs: 10 };
    expectDomainError(() => validateJobConfiguration(configuration, NOW), 'INTERVAL_TOO_SHORT');
  });

  it('propagates stop-condition validation errors', () => {
    const configuration: JobConfiguration = {
      ...baseConfiguration(),
      stopCondition: { type: 'count', maxRuns: 0 },
    };
    expectDomainError(() => validateJobConfiguration(configuration, NOW), 'STOP_CONDITION_INVALID');
  });
});

describe('validateJobChanges', () => {
  it('validates only the fields that are present', () => {
    expect(() => validateJobChanges({}, NOW)).not.toThrow();
    expect(() => validateJobChanges({ intervalMs: 60_000 }, NOW)).not.toThrow();
  });

  it('rejects a defined but invalid interval', () => {
    expectDomainError(() => validateJobChanges({ intervalMs: 5 }, NOW), 'INTERVAL_TOO_SHORT');
  });

  it('rejects a defined but invalid navigation policy', () => {
    const changes = { navigationPolicy: 'bad' } as unknown as Parameters<
      typeof validateJobChanges
    >[0];
    expectDomainError(() => validateJobChanges(changes, NOW), 'STOP_CONDITION_INVALID');
  });
});

describe('validateSettings', () => {
  it('accepts the default settings', () => {
    expect(() => validateSettings(createDefaultSettings(), NOW)).not.toThrow();
  });

  it('rejects maxActiveJobs out of range', () => {
    const settings: ExtensionSettings = { ...createDefaultSettings(), maxActiveJobs: 0 };
    expectDomainError(() => validateSettings(settings, NOW), 'SETTINGS_INVALID');
    const tooMany: ExtensionSettings = { ...createDefaultSettings(), maxActiveJobs: 501 };
    expectDomainError(() => validateSettings(tooMany, NOW), 'SETTINGS_INVALID');
  });

  it('rejects maxReloadsPerSecond out of range', () => {
    const settings: ExtensionSettings = { ...createDefaultSettings(), maxReloadsPerSecond: 21 };
    expectDomainError(() => validateSettings(settings, NOW), 'SETTINGS_INVALID');
  });

  it('rejects a non-boolean notifyOnCompletion', () => {
    const settings = {
      ...createDefaultSettings(),
      notifyOnCompletion: 'yes',
    } as unknown as ExtensionSettings;
    expectDomainError(() => validateSettings(settings, NOW), 'SETTINGS_INVALID');
  });

  it('rejects completedJobRetentionDays out of range', () => {
    const negative: ExtensionSettings = {
      ...createDefaultSettings(),
      completedJobRetentionDays: -1,
    };
    expectDomainError(() => validateSettings(negative, NOW), 'SETTINGS_INVALID');
    const tooLong: ExtensionSettings = {
      ...createDefaultSettings(),
      completedJobRetentionDays: 366,
    };
    expectDomainError(() => validateSettings(tooLong, NOW), 'SETTINGS_INVALID');
  });
});

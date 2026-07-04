import { describe, it, expect } from 'vitest';
import { updateSettings } from '../../src/application/update-settings';
import { createDefaultSettings } from '../../src/domain/settings';
import { createTestHarness } from '../support/fakes';
import { expectDomainErrorAsync } from '../support/assertions';

describe('updateSettings', () => {
  it('merges changes, persists them, and reconfigures the rate limiter', async () => {
    const harness = createTestHarness();

    const merged = await updateSettings(harness.deps, { maxReloadsPerSecond: 6 });

    expect(merged.maxReloadsPerSecond).toBe(6);
    expect(merged.maxActiveJobs).toBe(createDefaultSettings().maxActiveJobs);
    expect(harness.settings.current.maxReloadsPerSecond).toBe(6);
    expect(harness.rateLimiter.configured).toContain(6);
  });

  it('publishes a settings.updated event', async () => {
    const harness = createTestHarness();

    await updateSettings(harness.deps, { notifyOnCompletion: false });

    expect(harness.events.events.at(-1)).toMatchObject({ type: 'settings.updated' });
  });

  it('rejects invalid merged settings without persisting', async () => {
    const harness = createTestHarness();

    await expectDomainErrorAsync(
      () => updateSettings(harness.deps, { maxReloadsPerSecond: 999 }),
      'SETTINGS_INVALID',
    );
    expect(harness.settings.saved).toHaveLength(0);
  });
});

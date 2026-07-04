import type { ExtensionSettings } from '../domain/settings';
import { mergeSettings } from '../domain/settings';
import { validateSettings } from '../shared/validation';
import type { AppDependencies } from './dependencies';

export async function updateSettings(
  deps: AppDependencies,
  changes: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await deps.settings.get();
  const merged = mergeSettings(current, changes);
  validateSettings(merged, deps.clock.now());
  await deps.settings.save(merged);
  deps.rateLimiter.configure(merged.maxReloadsPerSecond);
  await deps.events.publish({ type: 'settings.updated', settings: merged });
  return merged;
}

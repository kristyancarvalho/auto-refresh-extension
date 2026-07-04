import type { ExtensionSettings } from '../../domain/settings';
import type { SettingsRepository } from '../../application/ports';
import { loadState, saveState } from './state-store';

export function createSettingsRepository(): SettingsRepository {
  return {
    async get(): Promise<ExtensionSettings> {
      const state = await loadState();
      return state.settings;
    },
    async save(settings: ExtensionSettings): Promise<void> {
      const state = await loadState();
      await saveState({ ...state, settings });
    },
  };
}

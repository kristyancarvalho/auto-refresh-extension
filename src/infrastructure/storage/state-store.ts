import type { RefreshJob } from '../../domain/refresh-job';
import type { ExtensionSettings } from '../../domain/settings';
import type { RecentEvent, StateSnapshot } from '../../application/ports';
import { createDefaultSettings, mergeSettings } from '../../domain/settings';
import { SCHEMA_VERSION, STORAGE_KEY, MAX_RECENT_EVENTS } from '../../shared/constants';
import { DomainError } from '../../domain/errors';
import { isValidStoredJob } from './job-codec';

interface RawState {
  schemaVersion: unknown;
  jobs: unknown;
  settings: unknown;
  recentEvents: unknown;
}

function emptyState(): StateSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    jobs: [],
    settings: createDefaultSettings(),
    recentEvents: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJobs(raw: unknown): RefreshJob[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const jobs: RefreshJob[] = [];
  for (const entry of raw) {
    if (isValidStoredJob(entry)) {
      jobs.push(entry);
    }
  }
  return jobs;
}

function readSettings(raw: unknown): ExtensionSettings {
  const defaults = createDefaultSettings();
  if (!isRecord(raw)) {
    return defaults;
  }
  return mergeSettings(defaults, raw as Partial<ExtensionSettings>);
}

function readEvents(raw: unknown): RecentEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const events: RecentEvent[] = [];
  for (const entry of raw) {
    if (
      isRecord(entry) &&
      typeof entry['id'] === 'string' &&
      typeof entry['at'] === 'number' &&
      typeof entry['kind'] === 'string' &&
      typeof entry['detail'] === 'string'
    ) {
      const jobId = entry['jobId'];
      events.push({
        id: entry['id'],
        at: entry['at'],
        kind: entry['kind'],
        jobId: typeof jobId === 'string' ? jobId : null,
        detail: entry['detail'],
      });
    }
  }
  return events.slice(-MAX_RECENT_EVENTS);
}

function migrate(raw: RawState): StateSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    jobs: readJobs(raw.jobs),
    settings: readSettings(raw.settings),
    recentEvents: readEvents(raw.recentEvents),
  };
}

export async function loadState(): Promise<StateSnapshot> {
  let stored: Record<string, unknown>;
  try {
    stored = await browser.storage.local.get(STORAGE_KEY);
  } catch (error) {
    throw new DomainError(
      'STORAGE_FAILED',
      error instanceof Error ? error.message : 'Unable to read local storage.',
    );
  }
  const value = stored[STORAGE_KEY];
  if (!isRecord(value)) {
    return emptyState();
  }
  return migrate(value as unknown as RawState);
}

export async function saveState(state: StateSnapshot): Promise<void> {
  const payload: StateSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    jobs: state.jobs,
    settings: state.settings,
    recentEvents: state.recentEvents.slice(-MAX_RECENT_EVENTS),
  };
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: payload });
  } catch (error) {
    throw new DomainError(
      'STORAGE_FAILED',
      error instanceof Error ? error.message : 'Unable to write local storage.',
    );
  }
}

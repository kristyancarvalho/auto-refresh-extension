import type { JobChanges, JobConfiguration, RefreshJob } from '../domain/refresh-job';
import type { ExtensionSettings } from '../domain/settings';
import type { ExtensionError } from '../domain/errors';

export interface SelectableTab {
  tabId: number;
  title: string;
  url: string;
  origin: string;
  favIconUrl: string | null;
  active: boolean;
  windowId: number;
  hasJob: boolean;
}

export interface JobsSnapshot {
  jobs: RefreshJob[];
  activeCount: number;
}

export type ExtensionCommand =
  | { type: 'tabs.list-selectable' }
  | { type: 'jobs.list' }
  | { type: 'jobs.create'; tabIds: number[]; configuration: JobConfiguration }
  | { type: 'jobs.pause'; jobId: string; revision: number }
  | { type: 'jobs.resume'; jobId: string; revision: number }
  | { type: 'jobs.edit'; jobId: string; revision: number; changes: JobChanges }
  | { type: 'jobs.stop'; jobId: string; revision: number }
  | { type: 'jobs.remove'; jobId: string; revision: number }
  | { type: 'jobs.clear-completed' }
  | { type: 'settings.get' }
  | { type: 'settings.update'; changes: Partial<ExtensionSettings> };

export type ExtensionCommandType = ExtensionCommand['type'];

export interface CommandResultMap {
  'tabs.list-selectable': SelectableTab[];
  'jobs.list': JobsSnapshot;
  'jobs.create': JobsSnapshot;
  'jobs.pause': JobsSnapshot;
  'jobs.resume': JobsSnapshot;
  'jobs.edit': JobsSnapshot;
  'jobs.stop': JobsSnapshot;
  'jobs.remove': JobsSnapshot;
  'jobs.clear-completed': JobsSnapshot;
  'settings.get': ExtensionSettings;
  'settings.update': ExtensionSettings;
}

export type CommandResult<T> = { ok: true; data: T } | { ok: false; error: ExtensionError };

export type ExtensionEvent =
  | { type: 'jobs.updated'; snapshot: JobsSnapshot }
  | { type: 'settings.updated'; settings: ExtensionSettings };

export const EVENT_MESSAGE_TYPE = 'auto-refresh-event';

export interface EventEnvelope {
  channel: typeof EVENT_MESSAGE_TYPE;
  event: ExtensionEvent;
}

export function isEventEnvelope(value: unknown): value is EventEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { channel?: unknown };
  return candidate.channel === EVENT_MESSAGE_TYPE;
}

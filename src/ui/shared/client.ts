import type { JobChanges, JobConfiguration } from '../../domain/refresh-job';
import type { ExtensionSettings } from '../../domain/settings';
import type {
  CommandResult,
  ExtensionCommand,
  ExtensionEvent,
  JobsSnapshot,
  SelectableTab,
} from '../../shared/protocol';
import { isEventEnvelope } from '../../shared/protocol';

export class CommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CommandError';
    this.code = code;
  }
}

export interface ExtensionClient {
  listSelectableTabs(): Promise<SelectableTab[]>;
  listJobs(): Promise<JobsSnapshot>;
  createJobs(tabIds: number[], configuration: JobConfiguration): Promise<JobsSnapshot>;
  pauseJob(jobId: string, revision: number): Promise<JobsSnapshot>;
  resumeJob(jobId: string, revision: number): Promise<JobsSnapshot>;
  editJob(jobId: string, revision: number, changes: JobChanges): Promise<JobsSnapshot>;
  stopJob(jobId: string, revision: number): Promise<JobsSnapshot>;
  removeJob(jobId: string, revision: number): Promise<JobsSnapshot>;
  clearCompleted(): Promise<JobsSnapshot>;
  getSettings(): Promise<ExtensionSettings>;
  updateSettings(changes: Partial<ExtensionSettings>): Promise<ExtensionSettings>;
  subscribe(handler: (event: ExtensionEvent) => void): () => void;
}

async function send<T>(command: ExtensionCommand): Promise<T> {
  const response = (await browser.runtime.sendMessage(command)) as CommandResult<T> | undefined;
  if (response === undefined || response.ok !== true) {
    if (response !== undefined && response.ok === false) {
      throw new CommandError(response.error.code, response.error.message);
    }
    throw new CommandError('INTERNAL_ERROR', 'The background service did not respond.');
  }
  return response.data;
}

export function createRuntimeClient(): ExtensionClient {
  return {
    listSelectableTabs() {
      return send<SelectableTab[]>({ type: 'tabs.list-selectable' });
    },
    listJobs() {
      return send<JobsSnapshot>({ type: 'jobs.list' });
    },
    createJobs(tabIds, configuration) {
      return send<JobsSnapshot>({ type: 'jobs.create', tabIds, configuration });
    },
    pauseJob(jobId, revision) {
      return send<JobsSnapshot>({ type: 'jobs.pause', jobId, revision });
    },
    resumeJob(jobId, revision) {
      return send<JobsSnapshot>({ type: 'jobs.resume', jobId, revision });
    },
    editJob(jobId, revision, changes) {
      return send<JobsSnapshot>({ type: 'jobs.edit', jobId, revision, changes });
    },
    stopJob(jobId, revision) {
      return send<JobsSnapshot>({ type: 'jobs.stop', jobId, revision });
    },
    removeJob(jobId, revision) {
      return send<JobsSnapshot>({ type: 'jobs.remove', jobId, revision });
    },
    clearCompleted() {
      return send<JobsSnapshot>({ type: 'jobs.clear-completed' });
    },
    getSettings() {
      return send<ExtensionSettings>({ type: 'settings.get' });
    },
    updateSettings(changes) {
      return send<ExtensionSettings>({ type: 'settings.update', changes });
    },
    subscribe(handler) {
      const listener = (message: unknown): void => {
        if (isEventEnvelope(message)) {
          handler(message.event);
        }
      };
      browser.runtime.onMessage.addListener(listener);
      return () => {
        browser.runtime.onMessage.removeListener(listener);
      };
    },
  };
}

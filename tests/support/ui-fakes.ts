import type { JobChanges, JobConfiguration, RefreshJob } from '../../src/domain/refresh-job';
import type { ExtensionSettings } from '../../src/domain/settings';
import { createDefaultSettings } from '../../src/domain/settings';
import type { ExtensionClient } from '../../src/ui/shared/client';
import { CommandError } from '../../src/ui/shared/client';
import type { ExtensionEvent, JobsSnapshot, SelectableTab } from '../../src/shared/protocol';
import { makeJob, makeSelectableTab } from './fakes';

export interface CreateCall {
  tabIds: number[];
  configuration: JobConfiguration;
}

export interface EditCall {
  jobId: string;
  revision: number;
  changes: JobChanges;
}

export interface JobActionCall {
  jobId: string;
  revision: number;
}

export interface FakeUiClient extends ExtensionClient {
  readonly createCalls: CreateCall[];
  readonly editCalls: EditCall[];
  readonly pauseCalls: JobActionCall[];
  readonly resumeCalls: JobActionCall[];
  readonly stopCalls: JobActionCall[];
  readonly removeCalls: JobActionCall[];
  readonly clearCompletedCalls: number;
  readonly updateSettingsCalls: Partial<ExtensionSettings>[];
  setTabs(tabs: SelectableTab[]): void;
  setJobs(jobs: RefreshJob[]): void;
  setSettings(settings: ExtensionSettings): void;
  failNext(error: CommandError): void;
  emit(event: ExtensionEvent): void;
}

function snapshotOf(jobs: RefreshJob[]): JobsSnapshot {
  return { jobs, activeCount: jobs.filter((job) => job.state === 'active').length };
}

export function createFakeUiClient(): FakeUiClient {
  let tabs: SelectableTab[] = [makeSelectableTab()];
  let jobs: RefreshJob[] = [];
  let settings: ExtensionSettings = createDefaultSettings();
  let pending: CommandError | null = null;
  const handlers = new Set<(event: ExtensionEvent) => void>();

  const createCalls: CreateCall[] = [];
  const editCalls: EditCall[] = [];
  const pauseCalls: JobActionCall[] = [];
  const resumeCalls: JobActionCall[] = [];
  const stopCalls: JobActionCall[] = [];
  const removeCalls: JobActionCall[] = [];
  let clearCompletedCalls = 0;
  const updateSettingsCalls: Partial<ExtensionSettings>[] = [];

  function guard<T>(value: T): Promise<T> {
    if (pending !== null) {
      const error = pending;
      pending = null;
      return Promise.reject(error);
    }
    return Promise.resolve(value);
  }

  return {
    createCalls,
    editCalls,
    pauseCalls,
    resumeCalls,
    stopCalls,
    removeCalls,
    get clearCompletedCalls() {
      return clearCompletedCalls;
    },
    updateSettingsCalls,
    setTabs(next) {
      tabs = next;
    },
    setJobs(next) {
      jobs = next;
    },
    setSettings(next) {
      settings = next;
    },
    failNext(error) {
      pending = error;
    },
    emit(event) {
      for (const handler of handlers) {
        handler(event);
      }
    },
    listSelectableTabs() {
      return guard(tabs.map((tab) => ({ ...tab })));
    },
    listJobs() {
      return guard(snapshotOf(jobs));
    },
    createJobs(tabIds, configuration) {
      createCalls.push({ tabIds, configuration });
      return guard(snapshotOf(jobs));
    },
    pauseJob(jobId, revision) {
      pauseCalls.push({ jobId, revision });
      return guard(snapshotOf(jobs));
    },
    resumeJob(jobId, revision) {
      resumeCalls.push({ jobId, revision });
      return guard(snapshotOf(jobs));
    },
    editJob(jobId, revision, changes) {
      editCalls.push({ jobId, revision, changes });
      return guard(snapshotOf(jobs));
    },
    stopJob(jobId, revision) {
      stopCalls.push({ jobId, revision });
      return guard(snapshotOf(jobs));
    },
    removeJob(jobId, revision) {
      removeCalls.push({ jobId, revision });
      return guard(snapshotOf(jobs));
    },
    clearCompleted() {
      clearCompletedCalls += 1;
      return guard(snapshotOf(jobs));
    },
    getSettings() {
      return guard({ ...settings });
    },
    updateSettings(changes) {
      updateSettingsCalls.push(changes);
      settings = { ...settings, ...changes };
      return guard({ ...settings });
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}

export { makeJob, makeSelectableTab };

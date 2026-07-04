import type { RefreshJob } from '../domain/refresh-job';
import type { ExtensionSettings } from '../domain/settings';
import type { ExtensionEvent, SelectableTab } from '../shared/protocol';

export interface StateSnapshot {
  schemaVersion: number;
  jobs: RefreshJob[];
  settings: ExtensionSettings;
  recentEvents: RecentEvent[];
}

export interface RecentEvent {
  id: string;
  at: number;
  kind: string;
  jobId: string | null;
  detail: string;
}

export interface JobRepository {
  list(): Promise<RefreshJob[]>;
  get(jobId: string): Promise<RefreshJob | null>;
  findByTabId(tabId: number): Promise<RefreshJob | null>;
  save(job: RefreshJob): Promise<void>;
  saveMany(jobs: RefreshJob[]): Promise<void>;
  remove(jobId: string): Promise<void>;
  replaceAll(jobs: RefreshJob[]): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<ExtensionSettings>;
  save(settings: ExtensionSettings): Promise<void>;
}

export interface EventLog {
  record(event: Omit<RecentEvent, 'id' | 'at'>): Promise<void>;
  list(): Promise<RecentEvent[]>;
}

export interface AlarmScheduler {
  schedule(jobId: string, whenMs: number): Promise<void>;
  cancel(jobId: string): Promise<void>;
  list(): Promise<string[]>;
  clearAll(): Promise<void>;
}

export interface ReloadRequest {
  tabId: number;
  bypassCache: boolean;
}

export interface TabGateway {
  listSelectable(): Promise<SelectableTab[]>;
  get(tabId: number): Promise<TabInfo | null>;
  reload(request: ReloadRequest): Promise<void>;
}

export interface TabInfo {
  tabId: number;
  url: string;
  title: string;
  windowId: number;
  discarded: boolean;
}

export interface RateLimiter {
  configure(maxPerSecond: number): void;
  run<T>(task: () => Promise<T>): Promise<T>;
}

export interface SessionBinding {
  bind(tabId: number, jobId: string): Promise<void>;
  read(tabId: number): Promise<string | null>;
  clear(tabId: number): Promise<void>;
  isSupported(): boolean;
}

export interface NotificationGateway {
  notifyCompletion(title: string, message: string): Promise<void>;
}

export interface BadgeGateway {
  setActiveCount(count: number): Promise<void>;
}

export interface EventPublisher {
  publish(event: ExtensionEvent): Promise<void>;
}

export interface IdFactory {
  create(): string;
}

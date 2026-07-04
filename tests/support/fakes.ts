import { createDefaultSettings } from '../../src/domain/settings';
import type { AppDependencies } from '../../src/application/dependencies';
import type {
  AlarmScheduler,
  BadgeGateway,
  EventLog,
  EventPublisher,
  IdFactory,
  JobRepository,
  NotificationGateway,
  RateLimiter,
  RecentEvent,
  ReloadRequest,
  SessionBinding,
  SettingsRepository,
  TabGateway,
  TabInfo,
} from '../../src/application/ports';
import type { ExtensionEvent, SelectableTab } from '../../src/shared/protocol';
import type { JobConfiguration, RefreshJob } from '../../src/domain/refresh-job';
import type { ExtensionSettings } from '../../src/domain/settings';
import type { Clock } from '../../src/shared/time';

export interface FakeClock extends Clock {
  set(value: number): void;
  advance(ms: number): number;
}

export function createFakeClock(start = 1_000_000): FakeClock {
  let current = start;
  return {
    now() {
      return current;
    },
    set(value) {
      current = value;
    },
    advance(ms) {
      current += ms;
      return current;
    },
  };
}

export interface FakeIdFactory extends IdFactory {
  reset(): void;
}

export function createFakeIdFactory(prefix = 'id'): FakeIdFactory {
  let counter = 0;
  return {
    create() {
      counter += 1;
      return `${prefix}-${counter}`;
    },
    reset() {
      counter = 0;
    },
  };
}

export interface FakeJobRepository extends JobRepository {
  readonly jobs: RefreshJob[];
  seed(jobs: RefreshJob[]): void;
  failOnSave(error: Error | null): void;
}

export function createFakeJobRepository(initial: RefreshJob[] = []): FakeJobRepository {
  let store: RefreshJob[] = [...initial];
  let saveError: Error | null = null;
  const upsert = (job: RefreshJob): void => {
    store = store.filter((entry) => entry.id !== job.id);
    store.push(job);
  };
  return {
    get jobs() {
      return store;
    },
    seed(jobs) {
      store = [...jobs];
    },
    failOnSave(error) {
      saveError = error;
    },
    async list() {
      return [...store];
    },
    async get(jobId) {
      return store.find((entry) => entry.id === jobId) ?? null;
    },
    async findByTabId(tabId) {
      return store.find((entry) => entry.tabId === tabId) ?? null;
    },
    async save(job) {
      if (saveError) {
        throw saveError;
      }
      upsert(job);
    },
    async saveMany(jobs) {
      if (saveError) {
        throw saveError;
      }
      for (const job of jobs) {
        upsert(job);
      }
    },
    async remove(jobId) {
      store = store.filter((entry) => entry.id !== jobId);
    },
    async replaceAll(jobs) {
      store = [...jobs];
    },
  };
}

export interface FakeSettingsRepository extends SettingsRepository {
  readonly current: ExtensionSettings;
  readonly saved: ExtensionSettings[];
}

export function createFakeSettingsRepository(initial?: ExtensionSettings): FakeSettingsRepository {
  let current = initial ?? createDefaultSettings();
  const saved: ExtensionSettings[] = [];
  return {
    get current() {
      return current;
    },
    saved,
    async get() {
      return current;
    },
    async save(settings) {
      current = settings;
      saved.push(settings);
    },
  };
}

export interface FakeAlarmScheduler extends AlarmScheduler {
  readonly alarms: Map<string, number>;
  readonly scheduled: Array<{ jobId: string; whenMs: number }>;
  readonly cancelled: string[];
  readonly clearAllCount: number;
}

export function createFakeAlarmScheduler(): FakeAlarmScheduler {
  const alarms = new Map<string, number>();
  const scheduled: Array<{ jobId: string; whenMs: number }> = [];
  const cancelled: string[] = [];
  let clearAllCount = 0;
  return {
    alarms,
    scheduled,
    cancelled,
    get clearAllCount() {
      return clearAllCount;
    },
    async schedule(jobId, whenMs) {
      alarms.set(jobId, whenMs);
      scheduled.push({ jobId, whenMs });
    },
    async cancel(jobId) {
      alarms.delete(jobId);
      cancelled.push(jobId);
    },
    async list() {
      return [...alarms.keys()];
    },
    async clearAll() {
      clearAllCount += 1;
      alarms.clear();
    },
  };
}

export interface FakeTabGateway extends TabGateway {
  selectable: SelectableTab[];
  readonly tabs: Map<number, TabInfo>;
  readonly reloads: ReloadRequest[];
  setTab(tab: TabInfo): void;
  removeTab(tabId: number): void;
  failReload(error: Error | null): void;
}

export function createFakeTabGateway(): FakeTabGateway {
  let selectable: SelectableTab[] = [];
  const tabs = new Map<number, TabInfo>();
  const reloads: ReloadRequest[] = [];
  let reloadError: Error | null = null;
  return {
    get selectable() {
      return selectable;
    },
    set selectable(value: SelectableTab[]) {
      selectable = value;
    },
    tabs,
    reloads,
    setTab(tab) {
      tabs.set(tab.tabId, tab);
    },
    removeTab(tabId) {
      tabs.delete(tabId);
    },
    failReload(error) {
      reloadError = error;
    },
    async listSelectable() {
      return [...selectable];
    },
    async get(tabId) {
      return tabs.get(tabId) ?? null;
    },
    async reload(request) {
      reloads.push(request);
      if (reloadError) {
        throw reloadError;
      }
    },
  };
}

export interface FakeRateLimiter extends RateLimiter {
  readonly configured: number[];
}

export function createFakeRateLimiter(): FakeRateLimiter {
  const configured: number[] = [];
  return {
    configured,
    configure(maxPerSecond) {
      configured.push(maxPerSecond);
    },
    async run(task) {
      return task();
    },
  };
}

export interface FakeSessionBinding extends SessionBinding {
  readonly bindings: Map<number, string>;
  readonly bound: Array<{ tabId: number; jobId: string }>;
  readonly cleared: number[];
  setSupported(value: boolean): void;
  failBind(error: Error | null): void;
}

export function createFakeSessionBinding(supported = true): FakeSessionBinding {
  const bindings = new Map<number, string>();
  const bound: Array<{ tabId: number; jobId: string }> = [];
  const cleared: number[] = [];
  let isSupportedValue = supported;
  let bindError: Error | null = null;
  return {
    bindings,
    bound,
    cleared,
    setSupported(value) {
      isSupportedValue = value;
    },
    failBind(error) {
      bindError = error;
    },
    isSupported() {
      return isSupportedValue;
    },
    async bind(tabId, jobId) {
      if (bindError) {
        throw bindError;
      }
      bindings.set(tabId, jobId);
      bound.push({ tabId, jobId });
    },
    async read(tabId) {
      return bindings.get(tabId) ?? null;
    },
    async clear(tabId) {
      bindings.delete(tabId);
      cleared.push(tabId);
    },
  };
}

export interface FakeNotificationGateway extends NotificationGateway {
  readonly notifications: Array<{ title: string; message: string }>;
}

export function createFakeNotificationGateway(): FakeNotificationGateway {
  const notifications: Array<{ title: string; message: string }> = [];
  return {
    notifications,
    async notifyCompletion(title, message) {
      notifications.push({ title, message });
    },
  };
}

export interface FakeBadgeGateway extends BadgeGateway {
  readonly counts: number[];
}

export function createFakeBadgeGateway(): FakeBadgeGateway {
  const counts: number[] = [];
  return {
    counts,
    async setActiveCount(count) {
      counts.push(count);
    },
  };
}

export interface FakeEventPublisher extends EventPublisher {
  readonly events: ExtensionEvent[];
}

export function createFakeEventPublisher(): FakeEventPublisher {
  const events: ExtensionEvent[] = [];
  return {
    events,
    async publish(event) {
      events.push(event);
    },
  };
}

export interface FakeEventLog extends EventLog {
  readonly events: RecentEvent[];
}

export function createFakeEventLog(clock: Clock, ids: IdFactory): FakeEventLog {
  const events: RecentEvent[] = [];
  return {
    events,
    async record(event) {
      events.push({
        id: ids.create(),
        at: clock.now(),
        kind: event.kind,
        jobId: event.jobId,
        detail: event.detail,
      });
    },
    async list() {
      return [...events];
    },
  };
}

export interface TestHarness {
  deps: AppDependencies;
  clock: FakeClock;
  ids: FakeIdFactory;
  jobs: FakeJobRepository;
  settings: FakeSettingsRepository;
  alarms: FakeAlarmScheduler;
  tabs: FakeTabGateway;
  rateLimiter: FakeRateLimiter;
  sessions: FakeSessionBinding;
  notifications: FakeNotificationGateway;
  badge: FakeBadgeGateway;
  events: FakeEventPublisher;
  eventLog: FakeEventLog;
}

export interface TestHarnessOptions {
  now?: number;
  settings?: ExtensionSettings;
  jobs?: RefreshJob[];
  sessionsSupported?: boolean;
}

export function createTestHarness(options: TestHarnessOptions = {}): TestHarness {
  const clock = createFakeClock(options.now ?? 1_000_000);
  const ids = createFakeIdFactory();
  const jobs = createFakeJobRepository(options.jobs ?? []);
  const settings = createFakeSettingsRepository(options.settings);
  const alarms = createFakeAlarmScheduler();
  const tabs = createFakeTabGateway();
  const rateLimiter = createFakeRateLimiter();
  const sessions = createFakeSessionBinding(options.sessionsSupported ?? true);
  const notifications = createFakeNotificationGateway();
  const badge = createFakeBadgeGateway();
  const events = createFakeEventPublisher();
  const eventLog = createFakeEventLog(clock, ids);
  const deps: AppDependencies = {
    jobs,
    settings,
    alarms,
    tabs,
    rateLimiter,
    sessions,
    notifications,
    badge,
    events,
    eventLog,
    clock,
    ids,
  };
  return {
    deps,
    clock,
    ids,
    jobs,
    settings,
    alarms,
    tabs,
    rateLimiter,
    sessions,
    notifications,
    badge,
    events,
    eventLog,
  };
}

export function makeConfiguration(overrides: Partial<JobConfiguration> = {}): JobConfiguration {
  return {
    intervalMs: 60_000,
    stopCondition: { type: 'never' },
    navigationPolicy: 'same-origin',
    restartPolicy: 'pause',
    reloadOptions: { bypassCache: false },
    ...overrides,
  };
}

export function makeJob(overrides: Partial<RefreshJob> = {}): RefreshJob {
  const base: RefreshJob = {
    id: 'job-1',
    tabId: 1,
    originalUrl: 'https://example.com/',
    originalOrigin: 'https://example.com',
    titleSnapshot: 'Example',
    intervalMs: 60_000,
    stopCondition: { type: 'never' },
    state: 'active',
    runsCompleted: 0,
    consecutiveFailures: 0,
    startedAt: 1_000_000,
    nextRunAt: 1_060_000,
    lastRunAt: null,
    completedAt: null,
    reloadOptions: { bypassCache: false },
    navigationPolicy: 'same-origin',
    restartPolicy: 'pause',
    lastError: null,
    revision: 1,
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
  };
  return { ...base, ...overrides };
}

export function makeTabInfo(overrides: Partial<TabInfo> = {}): TabInfo {
  return {
    tabId: 1,
    url: 'https://example.com/',
    title: 'Example',
    windowId: 1,
    discarded: false,
    ...overrides,
  };
}

export function makeSelectableTab(overrides: Partial<SelectableTab> = {}): SelectableTab {
  return {
    tabId: 1,
    title: 'Example',
    url: 'https://example.com/',
    origin: 'https://example.com',
    favIconUrl: null,
    active: false,
    windowId: 1,
    hasJob: false,
    ...overrides,
  };
}

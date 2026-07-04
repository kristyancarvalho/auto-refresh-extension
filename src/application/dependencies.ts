import type { Clock } from '../shared/time';
import type {
  AlarmScheduler,
  BadgeGateway,
  EventLog,
  EventPublisher,
  IdFactory,
  JobRepository,
  NotificationGateway,
  RateLimiter,
  SessionBinding,
  SettingsRepository,
  TabGateway,
} from './ports';

export interface AppDependencies {
  jobs: JobRepository;
  settings: SettingsRepository;
  alarms: AlarmScheduler;
  tabs: TabGateway;
  rateLimiter: RateLimiter;
  sessions: SessionBinding;
  notifications: NotificationGateway;
  badge: BadgeGateway;
  events: EventPublisher;
  eventLog: EventLog;
  clock: Clock;
  ids: IdFactory;
}

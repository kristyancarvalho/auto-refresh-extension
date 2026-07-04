import type { AppDependencies } from '../application/dependencies';
import { systemClock } from './clock';
import { cryptoIdFactory } from './id-factory';
import { createJobRepository } from './storage/job-repository';
import { createSettingsRepository } from './storage/settings-repository';
import { createEventLog } from './storage/event-log';
import { createAlarmScheduler } from './alarms/alarm-scheduler';
import { createTabGateway } from './tabs/tab-gateway';
import { createRateLimiter } from './rate-limiter';
import { createSessionBinding } from './sessions/session-binding';
import { createNotificationGateway } from './notifications/notification-gateway';
import { createBadgeGateway } from './action/badge-gateway';
import { createEventPublisher } from './runtime/event-publisher';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createDependencies(): AppDependencies {
  return {
    jobs: createJobRepository(),
    settings: createSettingsRepository(),
    alarms: createAlarmScheduler(),
    tabs: createTabGateway(),
    rateLimiter: createRateLimiter(systemClock, sleep),
    sessions: createSessionBinding(),
    notifications: createNotificationGateway(),
    badge: createBadgeGateway(),
    events: createEventPublisher(),
    eventLog: createEventLog(systemClock.now, cryptoIdFactory.create),
    clock: systemClock,
    ids: cryptoIdFactory,
  };
}

import type { AlarmScheduler } from '../../application/ports';
import { ALARM_PREFIX } from '../../shared/constants';
import { DomainError } from '../../domain/errors';

function alarmName(jobId: string): string {
  return `${ALARM_PREFIX}${jobId}`;
}

function jobIdFromAlarm(name: string): string | null {
  if (!name.startsWith(ALARM_PREFIX)) {
    return null;
  }
  return name.slice(ALARM_PREFIX.length);
}

export function createAlarmScheduler(): AlarmScheduler {
  return {
    async schedule(jobId: string, whenMs: number): Promise<void> {
      const name = alarmName(jobId);
      try {
        await browser.alarms.clear(name);
        browser.alarms.create(name, { when: whenMs });
      } catch (error) {
        throw new DomainError(
          'ALARM_FAILED',
          error instanceof Error ? error.message : 'Unable to schedule alarm.',
        );
      }
    },
    async cancel(jobId: string): Promise<void> {
      try {
        await browser.alarms.clear(alarmName(jobId));
      } catch (error) {
        throw new DomainError(
          'ALARM_FAILED',
          error instanceof Error ? error.message : 'Unable to cancel alarm.',
        );
      }
    },
    async list(): Promise<string[]> {
      const alarms = await browser.alarms.getAll();
      const jobIds: string[] = [];
      for (const alarm of alarms) {
        const jobId = jobIdFromAlarm(alarm.name);
        if (jobId !== null) {
          jobIds.push(jobId);
        }
      }
      return jobIds;
    },
    async clearAll(): Promise<void> {
      const alarms = await browser.alarms.getAll();
      for (const alarm of alarms) {
        if (jobIdFromAlarm(alarm.name) !== null) {
          await browser.alarms.clear(alarm.name);
        }
      }
    },
  };
}

export { alarmName, jobIdFromAlarm };

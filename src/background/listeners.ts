import type { AppDependencies } from '../application/dependencies';
import { executeJob } from '../application/execute-job';
import { recoverJobs } from '../application/recover-jobs';
import { jobIdFromAlarm } from '../infrastructure/alarms/alarm-scheduler';
import { handleCommand } from './message-handler';

export function registerListeners(deps: AppDependencies): void {
  browser.alarms.onAlarm.addListener((alarm) => {
    const jobId = jobIdFromAlarm(alarm.name);
    if (jobId === null) {
      return;
    }
    void executeJob(deps, jobId);
  });

  browser.runtime.onMessage.addListener((message) => handleCommand(deps, message));

  browser.runtime.onStartup.addListener(() => {
    void recoverJobs(deps);
  });

  browser.runtime.onInstalled.addListener(() => {
    void recoverJobs(deps);
  });
}

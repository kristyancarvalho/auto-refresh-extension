import type { AppDependencies } from '../application/dependencies';
import type { CommandResult, ExtensionCommand } from '../shared/protocol';
import { toExtensionError } from '../domain/errors';
import { createJobs } from '../application/create-jobs';
import { pauseJob } from '../application/pause-job';
import { resumeJob } from '../application/resume-job';
import { editJob } from '../application/edit-job';
import { stopJob } from '../application/stop-job';
import { removeJob } from '../application/remove-job';
import { listJobs } from '../application/list-jobs';
import { listSelectableTabs } from '../application/list-selectable-tabs';
import { updateSettings } from '../application/update-settings';
import { clearCompletedJobs } from '../application/clear-completed-jobs';
import { parseCommand } from './command-validation';

async function dispatch(deps: AppDependencies, command: ExtensionCommand): Promise<unknown> {
  switch (command.type) {
    case 'tabs.list-selectable':
      return listSelectableTabs(deps);
    case 'jobs.list':
      return listJobs(deps);
    case 'jobs.create':
      return createJobs(deps, {
        tabIds: command.tabIds,
        configuration: command.configuration,
      });
    case 'jobs.pause':
      return pauseJob(deps, command.jobId, command.revision);
    case 'jobs.resume':
      return resumeJob(deps, command.jobId, command.revision);
    case 'jobs.edit':
      return editJob(deps, command.jobId, command.revision, command.changes);
    case 'jobs.stop':
      return stopJob(deps, command.jobId, command.revision);
    case 'jobs.remove':
      return removeJob(deps, command.jobId, command.revision);
    case 'jobs.clear-completed':
      return clearCompletedJobs(deps);
    case 'settings.get':
      return deps.settings.get();
    case 'settings.update':
      return updateSettings(deps, command.changes);
    default:
      return command;
  }
}

export async function handleCommand(
  deps: AppDependencies,
  raw: unknown,
): Promise<CommandResult<unknown>> {
  try {
    const command = parseCommand(raw);
    const data = await dispatch(deps, command);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toExtensionError(error) };
  }
}

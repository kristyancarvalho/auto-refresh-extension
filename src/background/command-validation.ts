import type { ExtensionCommand } from '../shared/protocol';
import type { JobChanges, JobConfiguration } from '../domain/refresh-job';
import type { StopCondition } from '../domain/stop-condition';
import type { NavigationPolicy } from '../domain/navigation-policy';
import type { RestartPolicy } from '../domain/restart-policy';
import type { ExtensionSettings } from '../domain/settings';
import { DomainError } from '../domain/errors';
import { isNavigationPolicy, isRestartPolicy } from '../shared/validation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function invalid(message: string): never {
  throw new DomainError('MESSAGE_INVALID', message);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    invalid(`Expected string field "${key}".`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(`Expected numeric field "${key}".`);
  }
  return value;
}

function readTabIds(record: Record<string, unknown>): number[] {
  const value = record['tabIds'];
  if (!Array.isArray(value)) {
    invalid('Expected "tabIds" to be an array.');
  }
  return value.map((entry) => {
    if (typeof entry !== 'number' || !Number.isInteger(entry)) {
      invalid('Expected "tabIds" to contain integers.');
    }
    return entry;
  });
}

function parseStopCondition(value: unknown): StopCondition {
  if (!isRecord(value)) {
    invalid('Expected a stop condition object.');
  }
  const type = value['type'];
  if (type === 'never') {
    return { type: 'never' };
  }
  if (type === 'duration') {
    return { type: 'duration', durationMs: readNumber(value, 'durationMs') };
  }
  if (type === 'count') {
    return { type: 'count', maxRuns: readNumber(value, 'maxRuns') };
  }
  if (type === 'deadline') {
    return { type: 'deadline', endsAt: readNumber(value, 'endsAt') };
  }
  return invalid('Unknown stop condition type.');
}

function parseNavigationPolicy(value: unknown): NavigationPolicy {
  if (!isNavigationPolicy(value)) {
    invalid('Unknown navigation policy.');
  }
  return value;
}

function parseRestartPolicy(value: unknown): RestartPolicy {
  if (!isRestartPolicy(value)) {
    invalid('Unknown restart policy.');
  }
  return value;
}

function parseReloadOptions(value: unknown): { bypassCache: boolean } {
  if (!isRecord(value)) {
    invalid('Expected reload options object.');
  }
  const bypassCache = value['bypassCache'];
  if (typeof bypassCache !== 'boolean') {
    invalid('Expected boolean "bypassCache".');
  }
  return { bypassCache };
}

function parseConfiguration(value: unknown): JobConfiguration {
  if (!isRecord(value)) {
    invalid('Expected a configuration object.');
  }
  return {
    intervalMs: readNumber(value, 'intervalMs'),
    stopCondition: parseStopCondition(value['stopCondition']),
    navigationPolicy: parseNavigationPolicy(value['navigationPolicy']),
    restartPolicy: parseRestartPolicy(value['restartPolicy']),
    reloadOptions: parseReloadOptions(value['reloadOptions']),
  };
}

function parseChanges(value: unknown): JobChanges {
  if (!isRecord(value)) {
    invalid('Expected a changes object.');
  }
  const changes: JobChanges = {};
  if ('intervalMs' in value) {
    changes.intervalMs = readNumber(value, 'intervalMs');
  }
  if ('stopCondition' in value) {
    changes.stopCondition = parseStopCondition(value['stopCondition']);
  }
  if ('navigationPolicy' in value) {
    changes.navigationPolicy = parseNavigationPolicy(value['navigationPolicy']);
  }
  if ('restartPolicy' in value) {
    changes.restartPolicy = parseRestartPolicy(value['restartPolicy']);
  }
  if ('reloadOptions' in value) {
    changes.reloadOptions = parseReloadOptions(value['reloadOptions']);
  }
  return changes;
}

function parseSettingsChanges(value: unknown): Partial<ExtensionSettings> {
  if (!isRecord(value)) {
    invalid('Expected a settings changes object.');
  }
  const changes: Partial<ExtensionSettings> = {};
  if ('defaultIntervalMs' in value) {
    changes.defaultIntervalMs = readNumber(value, 'defaultIntervalMs');
  }
  if ('defaultStopCondition' in value) {
    changes.defaultStopCondition = parseStopCondition(value['defaultStopCondition']);
  }
  if ('defaultNavigationPolicy' in value) {
    changes.defaultNavigationPolicy = parseNavigationPolicy(value['defaultNavigationPolicy']);
  }
  if ('defaultRestartPolicy' in value) {
    changes.defaultRestartPolicy = parseRestartPolicy(value['defaultRestartPolicy']);
  }
  if ('maxActiveJobs' in value) {
    changes.maxActiveJobs = readNumber(value, 'maxActiveJobs');
  }
  if ('maxReloadsPerSecond' in value) {
    changes.maxReloadsPerSecond = readNumber(value, 'maxReloadsPerSecond');
  }
  if ('notifyOnCompletion' in value) {
    const notify = value['notifyOnCompletion'];
    if (typeof notify !== 'boolean') {
      invalid('Expected boolean "notifyOnCompletion".');
    }
    changes.notifyOnCompletion = notify;
  }
  if ('completedJobRetentionDays' in value) {
    changes.completedJobRetentionDays = readNumber(value, 'completedJobRetentionDays');
  }
  return changes;
}

export function parseCommand(raw: unknown): ExtensionCommand {
  if (!isRecord(raw)) {
    invalid('Expected a command object.');
  }
  const type = raw['type'];
  if (typeof type !== 'string') {
    invalid('Expected a command "type".');
  }
  switch (type) {
    case 'tabs.list-selectable':
      return { type };
    case 'jobs.list':
      return { type };
    case 'jobs.create':
      return {
        type,
        tabIds: readTabIds(raw),
        configuration: parseConfiguration(raw['configuration']),
      };
    case 'jobs.pause':
      return { type, jobId: readString(raw, 'jobId'), revision: readNumber(raw, 'revision') };
    case 'jobs.resume':
      return { type, jobId: readString(raw, 'jobId'), revision: readNumber(raw, 'revision') };
    case 'jobs.edit':
      return {
        type,
        jobId: readString(raw, 'jobId'),
        revision: readNumber(raw, 'revision'),
        changes: parseChanges(raw['changes']),
      };
    case 'jobs.stop':
      return { type, jobId: readString(raw, 'jobId'), revision: readNumber(raw, 'revision') };
    case 'jobs.remove':
      return { type, jobId: readString(raw, 'jobId'), revision: readNumber(raw, 'revision') };
    case 'jobs.clear-completed':
      return { type };
    case 'settings.get':
      return { type };
    case 'settings.update':
      return { type, changes: parseSettingsChanges(raw['changes']) };
    default:
      throw new DomainError('COMMAND_UNKNOWN', `Unknown command "${type}".`);
  }
}

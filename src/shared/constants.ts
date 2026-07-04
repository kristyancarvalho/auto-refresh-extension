export const ALARM_PREFIX = 'refresh-job:';

export const STORAGE_KEY = 'auto-refresh-state';

export const SCHEMA_VERSION = 1;

export const MIN_INTERVAL_MS = 30_000;

export const MAX_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_INTERVAL_MS = 60_000;

export const DEFAULT_MAX_ACTIVE_JOBS = 50;

export const DEFAULT_MAX_RELOADS_PER_SECOND = 3;

export const DEFAULT_COMPLETED_RETENTION_DAYS = 7;

export const MAX_RECENT_EVENTS = 100;

export const ERROR_FAILURE_THRESHOLD = 3;

export const SESSION_JOB_KEY = 'auto-refresh-job-id';

export const EXTENSION_NAME = 'Auto Refresh';

export const SUPPORTED_URL_SCHEMES = ['http:', 'https:'] as const;

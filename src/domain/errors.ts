export type ExtensionErrorCode =
  | 'JOB_NOT_FOUND'
  | 'JOB_STATE_INVALID'
  | 'JOB_CONFLICT'
  | 'TAB_NOT_FOUND'
  | 'TAB_URL_UNSUPPORTED'
  | 'TAB_NAVIGATION_CHANGED'
  | 'INTERVAL_TOO_SHORT'
  | 'INTERVAL_INVALID'
  | 'STOP_CONDITION_INVALID'
  | 'ACTIVE_JOB_LIMIT_REACHED'
  | 'SETTINGS_INVALID'
  | 'RELOAD_FAILED'
  | 'STORAGE_FAILED'
  | 'ALARM_FAILED'
  | 'SESSION_BINDING_FAILED'
  | 'MESSAGE_INVALID'
  | 'COMMAND_UNKNOWN'
  | 'REVISION_CONFLICT'
  | 'INTERNAL_ERROR';

export interface ExtensionError {
  code: ExtensionErrorCode;
  message: string;
}

export class DomainError extends Error {
  public readonly code: ExtensionErrorCode;

  public constructor(code: ExtensionErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }

  public toExtensionError(): ExtensionError {
    return { code: this.code, message: this.message };
  }
}

export function extensionError(code: ExtensionErrorCode, message: string): ExtensionError {
  return { code, message };
}

export function toExtensionError(value: unknown): ExtensionError {
  if (value instanceof DomainError) {
    return value.toExtensionError();
  }
  if (value instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: value.message };
  }
  return { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };
}

import type { ExtensionError } from '../domain/errors';

export type Result<T> = { ok: true; data: T } | { ok: false; error: ExtensionError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(error: ExtensionError): Result<T> {
  return { ok: false, error };
}

export function isOk<T>(result: Result<T>): result is { ok: true; data: T } {
  return result.ok;
}

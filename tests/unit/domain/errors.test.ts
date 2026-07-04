import { describe, it, expect } from 'vitest';
import { DomainError, extensionError, toExtensionError } from '../../../src/domain/errors';

describe('DomainError', () => {
  it('carries a code and message and converts to an extension error', () => {
    const error = new DomainError('JOB_NOT_FOUND', 'missing');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DomainError');
    expect(error.code).toBe('JOB_NOT_FOUND');
    expect(error.toExtensionError()).toEqual({ code: 'JOB_NOT_FOUND', message: 'missing' });
  });
});

describe('extensionError', () => {
  it('builds a plain extension error object', () => {
    expect(extensionError('STORAGE_FAILED', 'disk')).toEqual({
      code: 'STORAGE_FAILED',
      message: 'disk',
    });
  });
});

describe('toExtensionError', () => {
  it('unwraps a DomainError', () => {
    expect(toExtensionError(new DomainError('ALARM_FAILED', 'no alarm'))).toEqual({
      code: 'ALARM_FAILED',
      message: 'no alarm',
    });
  });

  it('maps a generic Error to INTERNAL_ERROR with its message', () => {
    expect(toExtensionError(new Error('kaboom'))).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'kaboom',
    });
  });

  it('maps unknown values to a generic INTERNAL_ERROR', () => {
    expect(toExtensionError('weird')).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  });
});

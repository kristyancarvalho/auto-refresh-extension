import { expect } from 'vitest';
import { DomainError } from '../../src/domain/errors';
import type { ExtensionErrorCode } from '../../src/domain/errors';

export function expectDomainError(fn: () => unknown, code: ExtensionErrorCode): DomainError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return error as DomainError;
  }
  throw new Error(`Expected DomainError ${code} to be thrown but nothing was thrown`);
}

export async function expectDomainErrorAsync(
  fn: () => Promise<unknown>,
  code: ExtensionErrorCode,
): Promise<DomainError> {
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return error as DomainError;
  }
  throw new Error(`Expected DomainError ${code} to be thrown but nothing was thrown`);
}

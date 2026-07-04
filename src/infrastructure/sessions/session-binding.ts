import type { SessionBinding } from '../../application/ports';
import { SESSION_JOB_KEY } from '../../shared/constants';
import { DomainError } from '../../domain/errors';

function sessionsAvailable(): boolean {
  return (
    typeof browser !== 'undefined' &&
    typeof browser.sessions !== 'undefined' &&
    typeof browser.sessions.setTabValue === 'function'
  );
}

export function createSessionBinding(): SessionBinding {
  return {
    isSupported(): boolean {
      return sessionsAvailable();
    },
    async bind(tabId: number, jobId: string): Promise<void> {
      if (!sessionsAvailable()) {
        return;
      }
      try {
        await browser.sessions.setTabValue(tabId, SESSION_JOB_KEY, jobId);
      } catch (error) {
        throw new DomainError(
          'SESSION_BINDING_FAILED',
          error instanceof Error ? error.message : 'Unable to bind session value.',
        );
      }
    },
    async read(tabId: number): Promise<string | null> {
      if (!sessionsAvailable()) {
        return null;
      }
      try {
        const value = await browser.sessions.getTabValue(tabId, SESSION_JOB_KEY);
        return typeof value === 'string' ? value : null;
      } catch {
        return null;
      }
    },
    async clear(tabId: number): Promise<void> {
      if (!sessionsAvailable()) {
        return;
      }
      try {
        await browser.sessions.removeTabValue(tabId, SESSION_JOB_KEY);
      } catch {
        return;
      }
    },
  };
}

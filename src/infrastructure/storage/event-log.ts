import type { EventLog, RecentEvent } from '../../application/ports';
import { MAX_RECENT_EVENTS } from '../../shared/constants';
import { loadState, saveState } from './state-store';

export function createEventLog(now: () => number, createId: () => string): EventLog {
  return {
    async record(event: Omit<RecentEvent, 'id' | 'at'>): Promise<void> {
      const state = await loadState();
      const entry: RecentEvent = {
        id: createId(),
        at: now(),
        kind: event.kind,
        jobId: event.jobId,
        detail: event.detail,
      };
      const recentEvents = [...state.recentEvents, entry].slice(-MAX_RECENT_EVENTS);
      await saveState({ ...state, recentEvents });
    },
    async list(): Promise<RecentEvent[]> {
      const state = await loadState();
      return state.recentEvents;
    },
  };
}

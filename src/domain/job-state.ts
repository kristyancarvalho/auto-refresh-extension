export type RefreshJobState = 'active' | 'paused' | 'completed' | 'orphaned' | 'error';

export const ACTIVE_STATE: RefreshJobState = 'active';

export function isActiveState(state: RefreshJobState): boolean {
  return state === 'active';
}

export function isPausedState(state: RefreshJobState): boolean {
  return state === 'paused';
}

export function isFinishedState(state: RefreshJobState): boolean {
  return state === 'completed' || state === 'error' || state === 'orphaned';
}

export function isSchedulableState(state: RefreshJobState): boolean {
  return state === 'active';
}

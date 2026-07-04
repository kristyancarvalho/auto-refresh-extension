import type { Clock } from '../shared/time';

export const systemClock: Clock = {
  now(): number {
    return Date.now();
  },
};

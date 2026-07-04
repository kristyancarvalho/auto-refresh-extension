export interface Clock {
  now(): number;
}

export type IntervalUnit = 'seconds' | 'minutes' | 'hours';

const UNIT_TO_MS: Record<IntervalUnit, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
};

export function intervalToMs(value: number, unit: IntervalUnit): number {
  return Math.round(value * UNIT_TO_MS[unit]);
}

export function msToInterval(intervalMs: number): { value: number; unit: IntervalUnit } {
  if (intervalMs % UNIT_TO_MS.hours === 0) {
    return { value: intervalMs / UNIT_TO_MS.hours, unit: 'hours' };
  }
  if (intervalMs % UNIT_TO_MS.minutes === 0) {
    return { value: intervalMs / UNIT_TO_MS.minutes, unit: 'minutes' };
  }
  return { value: Math.round(intervalMs / UNIT_TO_MS.seconds), unit: 'seconds' };
}

export function formatDuration(ms: number): string {
  if (ms <= 0) {
    return '0s';
  }
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(' ');
}

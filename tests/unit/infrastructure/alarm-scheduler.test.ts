import { describe, it, expect } from 'vitest';
import { alarmName, jobIdFromAlarm } from '../../../src/infrastructure/alarms/alarm-scheduler';
import { ALARM_PREFIX } from '../../../src/shared/constants';

describe('alarmName', () => {
  it('prefixes the job id', () => {
    expect(alarmName('abc')).toBe(`${ALARM_PREFIX}abc`);
  });
});

describe('jobIdFromAlarm', () => {
  it('extracts the job id from a prefixed alarm name', () => {
    expect(jobIdFromAlarm(`${ALARM_PREFIX}abc`)).toBe('abc');
  });

  it('returns null for names without the prefix', () => {
    expect(jobIdFromAlarm('other-alarm')).toBeNull();
  });

  it('round-trips through alarmName', () => {
    expect(jobIdFromAlarm(alarmName('job-42'))).toBe('job-42');
  });
});

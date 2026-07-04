import { describe, it, expect } from 'vitest';
import { EVENT_MESSAGE_TYPE, isEventEnvelope } from '../../../src/shared/protocol';

describe('isEventEnvelope', () => {
  it('accepts an envelope carrying the expected channel', () => {
    const envelope = {
      channel: EVENT_MESSAGE_TYPE,
      event: { type: 'jobs.updated', snapshot: { jobs: [], activeCount: 0 } },
    };
    expect(isEventEnvelope(envelope)).toBe(true);
  });

  it('rejects values that are not envelopes', () => {
    expect(isEventEnvelope(null)).toBe(false);
    expect(isEventEnvelope('auto-refresh-event')).toBe(false);
    expect(isEventEnvelope({ channel: 'other' })).toBe(false);
    expect(isEventEnvelope({})).toBe(false);
  });
});

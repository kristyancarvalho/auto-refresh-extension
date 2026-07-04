import { describe, it, expect } from 'vitest';
import { createRefreshJob, isActiveJobState, occupiesTab } from '../../../src/domain/refresh-job';
import type { CreateRefreshJobInput } from '../../../src/domain/refresh-job';
import { makeJob } from '../../support/fakes';

function makeInput(): CreateRefreshJobInput {
  return {
    id: 'job-9',
    tab: {
      tabId: 12,
      url: 'https://example.com/',
      origin: 'https://example.com',
      title: 'Example',
    },
    configuration: {
      intervalMs: 90_000,
      stopCondition: { type: 'count', maxRuns: 4 },
      navigationPolicy: 'exact-url',
      restartPolicy: 'resume-if-restored',
      reloadOptions: { bypassCache: true },
    },
    now: 1_000_000,
    nextRunAt: 1_090_000,
  };
}

describe('createRefreshJob', () => {
  it('maps the input into a fresh active job', () => {
    const job = createRefreshJob(makeInput());
    expect(job).toMatchObject({
      id: 'job-9',
      tabId: 12,
      originalUrl: 'https://example.com/',
      originalOrigin: 'https://example.com',
      titleSnapshot: 'Example',
      intervalMs: 90_000,
      state: 'active',
      runsCompleted: 0,
      consecutiveFailures: 0,
      startedAt: 1_000_000,
      nextRunAt: 1_090_000,
      lastRunAt: null,
      completedAt: null,
      navigationPolicy: 'exact-url',
      restartPolicy: 'resume-if-restored',
      lastError: null,
      revision: 1,
      createdAt: 1_000_000,
      updatedAt: 1_000_000,
    });
    expect(job.reloadOptions).toEqual({ bypassCache: true });
  });
});

describe('isActiveJobState', () => {
  it('is true only for active jobs', () => {
    expect(isActiveJobState(makeJob({ state: 'active' }))).toBe(true);
    expect(isActiveJobState(makeJob({ state: 'paused' }))).toBe(false);
  });
});

describe('occupiesTab', () => {
  it('is true for active and paused jobs', () => {
    expect(occupiesTab(makeJob({ state: 'active' }))).toBe(true);
    expect(occupiesTab(makeJob({ state: 'paused' }))).toBe(true);
    expect(occupiesTab(makeJob({ state: 'completed' }))).toBe(false);
    expect(occupiesTab(makeJob({ state: 'orphaned' }))).toBe(false);
    expect(occupiesTab(makeJob({ state: 'error' }))).toBe(false);
  });
});

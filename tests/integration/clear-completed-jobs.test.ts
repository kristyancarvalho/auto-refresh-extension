import { describe, it, expect } from 'vitest';
import { clearCompletedJobs } from '../../src/application/clear-completed-jobs';
import { createTestHarness, makeJob } from '../support/fakes';

describe('clearCompletedJobs', () => {
  it('removes finished jobs and keeps active and paused jobs', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({ id: 'active-1', state: 'active' }),
      makeJob({ id: 'paused-1', state: 'paused' }),
      makeJob({ id: 'completed-1', state: 'completed' }),
      makeJob({ id: 'error-1', state: 'error' }),
      makeJob({ id: 'orphaned-1', state: 'orphaned' }),
    ]);

    const snapshot = await clearCompletedJobs(harness.deps);

    expect(harness.jobs.jobs.map((job) => job.id)).toEqual(['active-1', 'paused-1']);
    expect(snapshot.jobs).toHaveLength(2);
  });

  it('cancels alarms and clears sessions for the removed jobs', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({ id: 'completed-1', state: 'completed', tabId: 7 }),
      makeJob({ id: 'active-1', state: 'active', tabId: 1 }),
    ]);

    await clearCompletedJobs(harness.deps);

    expect(harness.alarms.cancelled).toContain('completed-1');
    expect(harness.sessions.cleared).toContain(7);
    expect(harness.sessions.cleared).not.toContain(1);
  });
});

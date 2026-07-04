import { describe, it, expect } from 'vitest';
import { listJobs } from '../../src/application/list-jobs';
import { createTestHarness, makeJob } from '../support/fakes';

describe('listJobs', () => {
  it('returns a snapshot with the active job count', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([
      makeJob({ id: 'active-1', state: 'active' }),
      makeJob({ id: 'active-2', state: 'active' }),
      makeJob({ id: 'paused-1', state: 'paused' }),
    ]);

    const snapshot = await listJobs(harness.deps);

    expect(snapshot.jobs).toHaveLength(3);
    expect(snapshot.activeCount).toBe(2);
  });

  it('does not produce badge or event side effects', async () => {
    const harness = createTestHarness();
    harness.jobs.seed([makeJob({ id: 'active-1', state: 'active' })]);

    await listJobs(harness.deps);

    expect(harness.badge.counts).toHaveLength(0);
    expect(harness.events.events).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import { listSelectableTabs } from '../../src/application/list-selectable-tabs';
import { createTestHarness, makeJob, makeSelectableTab } from '../support/fakes';

describe('listSelectableTabs', () => {
  it('marks tabs that already have an occupying job', async () => {
    const harness = createTestHarness();
    harness.tabs.selectable = [
      makeSelectableTab({ tabId: 1 }),
      makeSelectableTab({ tabId: 2 }),
      makeSelectableTab({ tabId: 3 }),
    ];
    harness.jobs.seed([
      makeJob({ id: 'active-1', tabId: 1, state: 'active' }),
      makeJob({ id: 'paused-1', tabId: 2, state: 'paused' }),
      makeJob({ id: 'completed-1', tabId: 3, state: 'completed' }),
    ]);

    const tabs = await listSelectableTabs(harness.deps);

    expect(tabs.find((tab) => tab.tabId === 1)?.hasJob).toBe(true);
    expect(tabs.find((tab) => tab.tabId === 2)?.hasJob).toBe(true);
    expect(tabs.find((tab) => tab.tabId === 3)?.hasJob).toBe(false);
  });

  it('returns tabs without jobs unmarked', async () => {
    const harness = createTestHarness();
    harness.tabs.selectable = [makeSelectableTab({ tabId: 1 })];

    const tabs = await listSelectableTabs(harness.deps);

    expect(tabs).toEqual([makeSelectableTab({ tabId: 1, hasJob: false })]);
  });
});

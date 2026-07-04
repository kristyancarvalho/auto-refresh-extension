import { occupiesTab } from '../domain/refresh-job';
import type { SelectableTab } from '../shared/protocol';
import type { AppDependencies } from './dependencies';

export async function listSelectableTabs(deps: AppDependencies): Promise<SelectableTab[]> {
  const [tabs, jobs] = await Promise.all([deps.tabs.listSelectable(), deps.jobs.list()]);
  const occupied = new Set(
    jobs
      .filter(occupiesTab)
      .map((job) => job.tabId)
      .filter((tabId): tabId is number => tabId !== null),
  );
  return tabs.map((tab) => ({ ...tab, hasJob: occupied.has(tab.tabId) }));
}

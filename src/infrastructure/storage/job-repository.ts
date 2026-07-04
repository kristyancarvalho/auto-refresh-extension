import type { RefreshJob } from '../../domain/refresh-job';
import type { JobRepository } from '../../application/ports';
import { loadState, saveState } from './state-store';

async function mutate(change: (jobs: RefreshJob[]) => RefreshJob[]): Promise<void> {
  const state = await loadState();
  const jobs = change(state.jobs);
  await saveState({ ...state, jobs });
}

function upsert(jobs: RefreshJob[], job: RefreshJob): RefreshJob[] {
  const next = jobs.filter((entry) => entry.id !== job.id);
  next.push(job);
  return next;
}

export function createJobRepository(): JobRepository {
  return {
    async list(): Promise<RefreshJob[]> {
      const state = await loadState();
      return state.jobs;
    },
    async get(jobId: string): Promise<RefreshJob | null> {
      const state = await loadState();
      return state.jobs.find((entry) => entry.id === jobId) ?? null;
    },
    async findByTabId(tabId: number): Promise<RefreshJob | null> {
      const state = await loadState();
      return state.jobs.find((entry) => entry.tabId === tabId) ?? null;
    },
    async save(job: RefreshJob): Promise<void> {
      await mutate((jobs) => upsert(jobs, job));
    },
    async saveMany(incoming: RefreshJob[]): Promise<void> {
      await mutate((jobs) => {
        let next = jobs;
        for (const job of incoming) {
          next = upsert(next, job);
        }
        return next;
      });
    },
    async remove(jobId: string): Promise<void> {
      await mutate((jobs) => jobs.filter((entry) => entry.id !== jobId));
    },
    async replaceAll(jobs: RefreshJob[]): Promise<void> {
      await mutate(() => [...jobs]);
    },
  };
}

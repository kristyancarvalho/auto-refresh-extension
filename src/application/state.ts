import type { RefreshJob } from '../domain/refresh-job';
import { DomainError } from '../domain/errors';
import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';

export function countActiveJobs(jobs: RefreshJob[]): number {
  return jobs.filter((job) => job.state === 'active').length;
}

export function toSnapshot(jobs: RefreshJob[]): JobsSnapshot {
  return { jobs, activeCount: countActiveJobs(jobs) };
}

export async function buildSnapshot(deps: AppDependencies): Promise<JobsSnapshot> {
  const jobs = await deps.jobs.list();
  return toSnapshot(jobs);
}

export async function publishState(deps: AppDependencies): Promise<JobsSnapshot> {
  const snapshot = await buildSnapshot(deps);
  await deps.badge.setActiveCount(snapshot.activeCount);
  await deps.events.publish({ type: 'jobs.updated', snapshot });
  return snapshot;
}

export async function requireJob(deps: AppDependencies, jobId: string): Promise<RefreshJob> {
  const job = await deps.jobs.get(jobId);
  if (!job) {
    throw new DomainError('JOB_NOT_FOUND', 'The refresh job no longer exists.');
  }
  return job;
}

export function assertRevision(job: RefreshJob, revision: number): void {
  if (job.revision !== revision) {
    throw new DomainError('REVISION_CONFLICT', 'The refresh job was updated elsewhere.');
  }
}

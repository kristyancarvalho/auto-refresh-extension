import type { JobsSnapshot } from '../shared/protocol';
import type { AppDependencies } from './dependencies';
import { buildSnapshot } from './state';

export async function listJobs(deps: AppDependencies): Promise<JobsSnapshot> {
  return buildSnapshot(deps);
}

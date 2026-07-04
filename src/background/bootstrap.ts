import type { AppDependencies } from '../application/dependencies';
import { createDependencies } from '../infrastructure/create-dependencies';
import { EXTENSION_NAME } from '../shared/constants';
import { recoverJobs } from '../application/recover-jobs';

export function createBackground(): AppDependencies {
  return createDependencies();
}

export async function initialize(deps: AppDependencies): Promise<void> {
  await browser.action.setTitle({ title: EXTENSION_NAME });
  await recoverJobs(deps);
}

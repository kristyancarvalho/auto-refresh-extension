export type RestartPolicy = 'pause' | 'resume-if-restored';

export const DEFAULT_RESTART_POLICY: RestartPolicy = 'pause';

export function shouldResumeOnRestore(policy: RestartPolicy): boolean {
  return policy === 'resume-if-restored';
}

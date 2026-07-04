import { describe, it, expect } from 'vitest';
import { DEFAULT_RESTART_POLICY, shouldResumeOnRestore } from '../../../src/domain/restart-policy';

describe('restart-policy', () => {
  it('defaults to pause', () => {
    expect(DEFAULT_RESTART_POLICY).toBe('pause');
  });

  it('only resumes on restore for the resume-if-restored policy', () => {
    expect(shouldResumeOnRestore('resume-if-restored')).toBe(true);
    expect(shouldResumeOnRestore('pause')).toBe(false);
  });
});

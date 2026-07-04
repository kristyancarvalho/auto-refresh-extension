import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const baseCssPath = resolve(process.cwd(), 'src/ui/shared/base.css');

describe('shared styles', () => {
  it('disables transitions and animations under reduced-motion', () => {
    const css = readFileSync(baseCssPath, 'utf8');
    const block = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/);
    expect(block).not.toBeNull();
    const rules = block?.[0] ?? '';
    expect(rules).toContain('transition: none');
    expect(rules).toContain('animation: none');
  });
});

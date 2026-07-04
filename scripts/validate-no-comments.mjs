import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { walkFiles, extensionOf } from './lib/files.mjs';
import {
  scanJsComments,
  scanCssComments,
  scanHtmlComments,
  scanShellComments,
} from './lib/comment-scan.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const jsExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const cssExtensions = new Set(['.css']);
const htmlExtensions = new Set(['.html']);
const shellExtensions = new Set(['.sh']);

function scannerFor(ext) {
  if (jsExtensions.has(ext)) {
    return scanJsComments;
  }
  if (cssExtensions.has(ext)) {
    return scanCssComments;
  }
  if (htmlExtensions.has(ext)) {
    return scanHtmlComments;
  }
  if (shellExtensions.has(ext)) {
    return scanShellComments;
  }
  return null;
}

async function main() {
  const roots = [join(root, 'src'), join(root, 'tests'), join(root, 'scripts')];
  const files = await walkFiles(roots);
  const violations = [];
  for (const file of files) {
    const ext = extensionOf(file);
    const scanner = scannerFor(ext);
    if (!scanner) {
      continue;
    }
    const content = await readFile(file, 'utf8');
    const findings = scanner(content);
    for (const finding of findings) {
      violations.push({ file: relative(root, file), ...finding });
    }
  }
  if (violations.length > 0) {
    console.error('Found forbidden comments in final source:');
    for (const violation of violations) {
      console.error(`  ${violation.file}:${violation.line} (${violation.kind})`);
    }
    process.exit(1);
  }
  console.log(`No comments found across ${files.length} scanned files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { walkFiles, extensionOf } from './lib/files.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const scannedExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.sh',
]);

async function loadTokens() {
  const raw = await readFile(join(here, 'lib', 'forbidden-tokens.json'), 'utf8');
  return JSON.parse(raw);
}

function findMatches(content, tokens) {
  const matches = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    for (const word of tokens.words) {
      const pattern = new RegExp(`\\b${word.toLowerCase()}\\b`);
      if (pattern.test(lower)) {
        matches.push({ line: index + 1, token: word });
      }
    }
    for (const phrase of tokens.phrases) {
      if (lower.includes(phrase.toLowerCase())) {
        matches.push({ line: index + 1, token: phrase });
      }
    }
  }
  return matches;
}

async function main() {
  const tokens = await loadTokens();
  const roots = [join(root, 'src'), join(root, 'tests'), join(root, 'scripts')];
  const files = await walkFiles(roots);
  const violations = [];
  for (const file of files) {
    if (!scannedExtensions.has(extensionOf(file))) {
      continue;
    }
    const content = await readFile(file, 'utf8');
    for (const match of findMatches(content, tokens)) {
      violations.push({ file: relative(root, file), ...match });
    }
  }
  if (violations.length > 0) {
    console.error('Found forbidden marker tokens:');
    for (const violation of violations) {
      console.error(`  ${violation.file}:${violation.line} -> ${violation.token}`);
    }
    process.exit(1);
  }
  console.log(`No forbidden tokens found across ${files.length} scanned files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const defaultIgnored = new Set([
  'node_modules',
  'dist',
  'artifacts',
  'coverage',
  'specs',
  '.git',
  'web-ext-artifacts',
  '.vite',
  '.cache',
]);

export async function walkFiles(roots, { ignored = defaultIgnored } = {}) {
  const results = [];
  for (const root of roots) {
    await walk(root, results, ignored);
  }
  return results;
}

async function walk(current, results, ignored) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (ignored.has(entry.name)) {
      continue;
    }
    const full = join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results, ignored);
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
}

export function extensionOf(path) {
  const index = path.lastIndexOf('.');
  if (index < 0) {
    return '';
  }
  return path.slice(index).toLowerCase();
}

export async function isFile(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

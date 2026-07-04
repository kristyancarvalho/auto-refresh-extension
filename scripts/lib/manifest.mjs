import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const manifestDir = join(here, '..', '..', 'src', 'manifest');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep(base, overlay) {
  const result = { ...base };
  for (const key of Object.keys(overlay)) {
    const overlayValue = overlay[key];
    const baseValue = base[key];
    if (isPlainObject(overlayValue) && isPlainObject(baseValue)) {
      result[key] = mergeDeep(baseValue, overlayValue);
    } else {
      result[key] = overlayValue;
    }
  }
  return result;
}

async function readJson(name) {
  const content = await readFile(join(manifestDir, name), 'utf8');
  return JSON.parse(content);
}

const overlayByTarget = {
  production: 'manifest.production.json',
  development: 'manifest.production.json',
  beta: 'manifest.beta.json',
  e2e: 'manifest.e2e.json',
};

export async function composeManifest(target, version) {
  const base = await readJson('manifest.base.json');
  const overlayName = overlayByTarget[target];
  if (!overlayName) {
    throw new Error(`unknown manifest target: ${target}`);
  }
  const overlay = await readJson(overlayName);
  const merged = mergeDeep(base, overlay);
  if (version) {
    merged.version = version;
  }
  return merged;
}

export function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { walkFiles, isFile } from './lib/files.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const distDir = join(root, 'dist');

const expectedPermissions = ['alarms', 'notifications', 'sessions', 'storage', 'tabs'];
const requiredFiles = [
  'manifest.json',
  'background.js',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'options/options.html',
  'options/options.js',
  'options/options.css',
];
const forbiddenFiles = ['e2e-bridge.js'];
const forbiddenStrings = ['<all_urls>', 'localhost', '127.0.0.1', 'e2e-bridge'];

function sameSet(a, b) {
  if (!Array.isArray(a) || a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

async function main() {
  const errors = [];
  const manifestPath = join(distDir, 'manifest.json');
  if (!(await isFile(manifestPath))) {
    console.error('dist/manifest.json not found. Run npm run build first.');
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  if (!sameSet(manifest.permissions, expectedPermissions)) {
    errors.push(`permissions must be exactly ${expectedPermissions.join(', ')}`);
  }
  if ('host_permissions' in manifest) {
    errors.push('production artifact must not declare host_permissions');
  }
  if ('content_scripts' in manifest) {
    errors.push('production artifact must not declare content_scripts');
  }

  for (const relativePath of requiredFiles) {
    if (!(await isFile(join(distDir, relativePath)))) {
      errors.push(`missing required artifact file: ${relativePath}`);
    }
  }

  const files = await walkFiles([distDir], { ignored: new Set() });
  for (const file of files) {
    const name = relative(distDir, file);
    for (const forbidden of forbiddenFiles) {
      if (name === forbidden || name.endsWith(`/${forbidden}`)) {
        errors.push(`forbidden file present in artifact: ${name}`);
      }
    }
  }

  const textExtensions = ['.js', '.json', '.html', '.css'];
  for (const file of files) {
    if (!textExtensions.some((ext) => file.endsWith(ext))) {
      continue;
    }
    const content = await readFile(file, 'utf8');
    for (const forbidden of forbiddenStrings) {
      if (content.includes(forbidden)) {
        errors.push(`forbidden string "${forbidden}" found in ${relative(distDir, file)}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Production artifact validation failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
  console.log('Production artifact is clean and complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

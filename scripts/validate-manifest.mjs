import { composeManifest } from './lib/manifest.mjs';

const expectedPermissions = ['alarms', 'notifications', 'sessions', 'storage', 'tabs'];
const requiredAreas = [
  'manifest_version',
  'name',
  'version',
  'description',
  'permissions',
  'background',
  'action',
  'options_ui',
  'icons',
  'browser_specific_settings',
];

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function sameSet(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

async function main() {
  const manifest = await composeManifest('production', '1.0.0');
  const errors = [];

  assert(manifest.manifest_version === 3, 'manifest_version must be 3', errors);
  for (const area of requiredAreas) {
    assert(area in manifest, `missing required manifest area: ${area}`, errors);
  }
  assert(
    Array.isArray(manifest.permissions) && sameSet(manifest.permissions, expectedPermissions),
    `permissions must be exactly ${expectedPermissions.join(', ')}`,
    errors,
  );
  assert(
    !('host_permissions' in manifest),
    'production manifest must not declare host_permissions',
    errors,
  );
  assert(
    !('content_scripts' in manifest),
    'production manifest must not declare content_scripts',
    errors,
  );

  const gecko = manifest.browser_specific_settings?.gecko;
  assert(Boolean(gecko?.id), 'gecko id must be defined', errors);
  assert(
    gecko?.id === 'auto-refresh@project-factory',
    'gecko id must be the stable production id',
    errors,
  );

  const serialized = JSON.stringify(manifest);
  assert(
    !serialized.includes('<all_urls>'),
    'production manifest must not include <all_urls>',
    errors,
  );

  if (errors.length > 0) {
    console.error('Production manifest validation failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
  console.log('Production manifest composition is valid.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

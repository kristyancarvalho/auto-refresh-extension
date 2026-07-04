import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { composeManifest, stableStringify } from './lib/manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'src');
const distDir = join(root, 'dist');

const target = process.argv[2] ?? 'production';
const watch = process.argv.includes('--watch');

const validTargets = ['production', 'development', 'e2e', 'beta'];
if (!validTargets.includes(target)) {
  throw new Error(`unknown build target: ${target}`);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readPackageVersion() {
  const raw = await readFile(join(root, 'package.json'), 'utf8');
  return JSON.parse(raw).version;
}

function moduleEntryPoints() {
  const entries = {
    background: join(srcDir, 'background', 'index.ts'),
    'popup/popup': join(srcDir, 'ui', 'popup', 'index.ts'),
    'options/options': join(srcDir, 'ui', 'options', 'index.ts'),
  };
  return entries;
}

async function buildModules() {
  const options = {
    entryPoints: moduleEntryPoints(),
    outdir: distDir,
    bundle: true,
    format: 'esm',
    target: 'firefox115',
    platform: 'browser',
    sourcemap: target === 'development' ? 'inline' : false,
    minify: target === 'production' || target === 'beta',
    logLevel: 'info',
    define: {
      'globalThis.__BUILD_TARGET__': JSON.stringify(target),
    },
  };
  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    return ctx;
  }
  await build(options);
  return null;
}

async function buildBridge() {
  if (target !== 'e2e') {
    return;
  }
  await build({
    entryPoints: { 'e2e-bridge': join(srcDir, 'e2e-bridge', 'index.ts') },
    outdir: distDir,
    bundle: true,
    format: 'iife',
    target: 'firefox115',
    platform: 'browser',
    sourcemap: false,
    minify: false,
    logLevel: 'info',
  });
}

async function copyStatic() {
  await cp(join(srcDir, 'ui', 'popup', 'popup.html'), join(distDir, 'popup', 'popup.html'));
  await cp(join(srcDir, 'ui', 'popup', 'popup.css'), join(distDir, 'popup', 'popup.css'));
  await cp(join(srcDir, 'ui', 'options', 'options.html'), join(distDir, 'options', 'options.html'));
  await cp(join(srcDir, 'ui', 'options', 'options.css'), join(distDir, 'options', 'options.css'));
  await cp(join(srcDir, 'ui', 'shared', 'base.css'), join(distDir, 'shared', 'base.css'));
  const iconsDir = join(srcDir, 'icons');
  if (await pathExists(iconsDir)) {
    await cp(iconsDir, join(distDir, 'icons'), { recursive: true });
  }
}

async function writeManifest() {
  const version = await readPackageVersion();
  const manifest = await composeManifest(target, version);
  await writeFile(join(distDir, 'manifest.json'), stableStringify(manifest));
}

async function run() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  const ctx = await buildModules();
  await buildBridge();
  await copyStatic();
  await writeManifest();
  if (ctx) {
    process.stdin.resume();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

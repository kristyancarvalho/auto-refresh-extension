import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const distDir = join(root, 'dist');

const target = process.argv[2] ?? 'firefox';

function runNode(scriptArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, scriptArgs, { stdio: 'inherit', cwd: root });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`process exited with code ${code}`));
      }
    });
  });
}

function runWebExt(extraArgs) {
  return new Promise((resolve, reject) => {
    const args = [
      'web-ext',
      'run',
      '--source-dir',
      distDir,
      '--target',
      'firefox-desktop',
      ...extraArgs,
    ];
    const child = spawn('npx', args, { stdio: 'inherit', cwd: root });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`web-ext exited with code ${code}`));
      }
    });
  });
}

async function main() {
  await runNode([join(here, 'build.mjs'), 'development']);
  if (target === 'zen') {
    const zenBinary = process.env.ZEN_BIN;
    if (!zenBinary) {
      console.error('Set ZEN_BIN to the Zen Browser executable path, for example:');
      console.error('  ZEN_BIN=/opt/zen/zen npm run dev:zen');
      process.exit(1);
    }
    await runWebExt(['--firefox', zenBinary]);
    return;
  }
  const firefoxBinary = process.env.FIREFOX_BIN;
  const extra = firefoxBinary ? ['--firefox', firefoxBinary] : [];
  await runWebExt(extra);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

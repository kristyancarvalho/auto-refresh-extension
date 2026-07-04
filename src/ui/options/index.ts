import { createRuntimeClient } from '../shared/client';
import { mountOptions } from './view';

function readVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return 'unknown';
  }
}

function main(): void {
  const root = document.getElementById('app');
  if (root instanceof HTMLElement) {
    mountOptions(root, createRuntimeClient(), { version: readVersion() });
  }
}

main();

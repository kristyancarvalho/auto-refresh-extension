import { createRuntimeClient } from '../shared/client';
import { mountPopup } from './view';

function main(): void {
  const root = document.getElementById('app');
  if (root instanceof HTMLElement) {
    mountPopup(root, createRuntimeClient());
  }
}

main();

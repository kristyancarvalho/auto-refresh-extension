import { EXTENSION_NAME } from '../../shared/constants';

function render(root: HTMLElement): void {
  const header = document.createElement('header');
  header.className = 'ar-options__header';

  const title = document.createElement('h1');
  title.className = 'ar-options__title';
  title.textContent = `${EXTENSION_NAME} Options`;
  header.append(title);

  root.replaceChildren(header);
}

function main(): void {
  const root = document.getElementById('app');
  if (root instanceof HTMLElement) {
    render(root);
  }
}

main();

import { EXTENSION_NAME } from '../../shared/constants';

function render(root: HTMLElement): void {
  const header = document.createElement('header');
  header.className = 'ar-popup__header';

  const title = document.createElement('h1');
  title.className = 'ar-popup__title';
  title.textContent = EXTENSION_NAME;
  header.append(title);

  const empty = document.createElement('div');
  empty.className = 'ar-empty-state';
  const emptyTitle = document.createElement('p');
  emptyTitle.className = 'ar-empty-state__title';
  emptyTitle.textContent = 'Loading';
  empty.append(emptyTitle);

  root.replaceChildren(header, empty);
}

function main(): void {
  const root = document.getElementById('app');
  if (root instanceof HTMLElement) {
    render(root);
  }
}

main();

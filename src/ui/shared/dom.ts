export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

export function clearChildren(node: HTMLElement): void {
  node.replaceChildren();
}

export function setError(field: HTMLElement, message: string | null): void {
  if (message === null) {
    field.textContent = '';
    field.hidden = true;
    return;
  }
  field.textContent = message;
  field.hidden = false;
}

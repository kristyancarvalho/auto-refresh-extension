const REQUEST_TYPE = 'auto-refresh-e2e-request';
const RESPONSE_TYPE = 'auto-refresh-e2e-response';

interface BridgeRequest {
  type: typeof REQUEST_TYPE;
  id: string;
  command: unknown;
}

function isBridgeRequest(value: unknown): value is BridgeRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record['type'] === REQUEST_TYPE && typeof record['id'] === 'string';
}

function attach(): void {
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.source !== window) {
      return;
    }
    const data = event.data;
    if (!isBridgeRequest(data)) {
      return;
    }
    void browser.runtime
      .sendMessage(data.command)
      .then((result: unknown) => {
        window.postMessage({ type: RESPONSE_TYPE, id: data.id, ok: true, result }, '*');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        window.postMessage({ type: RESPONSE_TYPE, id: data.id, ok: false, error: message }, '*');
      });
  });
}

attach();

import type { EventPublisher } from '../../application/ports';
import type { ExtensionEvent } from '../../shared/protocol';
import { EVENT_MESSAGE_TYPE } from '../../shared/protocol';

export function createEventPublisher(): EventPublisher {
  return {
    async publish(event: ExtensionEvent): Promise<void> {
      try {
        await browser.runtime.sendMessage({ channel: EVENT_MESSAGE_TYPE, event });
      } catch {
        return;
      }
    },
  };
}

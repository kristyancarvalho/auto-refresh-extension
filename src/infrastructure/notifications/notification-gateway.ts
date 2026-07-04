import type { NotificationGateway } from '../../application/ports';

export function createNotificationGateway(): NotificationGateway {
  return {
    async notifyCompletion(title: string, message: string): Promise<void> {
      try {
        await browser.notifications.create({
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-96.png'),
          title,
          message,
        });
      } catch {
        return;
      }
    },
  };
}

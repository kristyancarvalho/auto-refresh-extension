import type { BadgeGateway } from '../../application/ports';

const BADGE_BACKGROUND = '#2563eb';
const BADGE_TEXT_COLOR = '#ffffff';

export function createBadgeGateway(): BadgeGateway {
  return {
    async setActiveCount(count: number): Promise<void> {
      const text = count > 0 ? String(count) : '';
      try {
        await browser.action.setBadgeBackgroundColor({ color: BADGE_BACKGROUND });
        if (typeof browser.action.setBadgeTextColor === 'function') {
          await browser.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR });
        }
        await browser.action.setBadgeText({ text });
      } catch {
        return;
      }
    },
  };
}

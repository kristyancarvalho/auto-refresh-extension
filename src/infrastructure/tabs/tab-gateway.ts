import type { ReloadRequest, TabGateway, TabInfo } from '../../application/ports';
import type { SelectableTab } from '../../shared/protocol';
import { DomainError } from '../../domain/errors';
import { isSupportedUrlScheme } from '../../shared/validation';
import { originOf } from '../../domain/navigation-policy';

function toOrigin(url: string): string {
  return originOf(url) ?? '';
}

export function createTabGateway(): TabGateway {
  return {
    async listSelectable(): Promise<SelectableTab[]> {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const selectable: SelectableTab[] = [];
      for (const tab of tabs) {
        const url = tab.url ?? '';
        if (tab.id === undefined || !isSupportedUrlScheme(url)) {
          continue;
        }
        selectable.push({
          tabId: tab.id,
          title: tab.title ?? url,
          url,
          origin: toOrigin(url),
          favIconUrl: tab.favIconUrl ?? null,
          active: tab.active ?? false,
          windowId: tab.windowId ?? browser.windows.WINDOW_ID_CURRENT,
          hasJob: false,
        });
      }
      return selectable;
    },
    async get(tabId: number): Promise<TabInfo | null> {
      try {
        const tab = await browser.tabs.get(tabId);
        if (tab.id === undefined) {
          return null;
        }
        return {
          tabId: tab.id,
          url: tab.url ?? '',
          title: tab.title ?? '',
          windowId: tab.windowId ?? browser.windows.WINDOW_ID_CURRENT,
          discarded: tab.discarded ?? false,
        };
      } catch {
        return null;
      }
    },
    async reload(request: ReloadRequest): Promise<void> {
      try {
        await browser.tabs.reload(request.tabId, { bypassCache: request.bypassCache });
      } catch (error) {
        throw new DomainError(
          'RELOAD_FAILED',
          error instanceof Error ? error.message : 'Unable to reload tab.',
        );
      }
    },
  };
}

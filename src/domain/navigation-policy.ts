export type NavigationPolicy = 'follow-tab' | 'same-origin' | 'exact-url';

export interface NavigationContext {
  originalUrl: string;
  originalOrigin: string;
  currentUrl: string;
}

export function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = '';
  if (parsed.pathname === '') {
    parsed.pathname = '/';
  }
  return parsed.toString();
}

export function originOf(rawUrl: string): string {
  return new URL(rawUrl).origin;
}

export function isNavigationAllowed(policy: NavigationPolicy, context: NavigationContext): boolean {
  switch (policy) {
    case 'follow-tab':
      return true;
    case 'same-origin':
      return safeOrigin(context.currentUrl) === context.originalOrigin;
    case 'exact-url':
      return safeNormalized(context.currentUrl) === safeNormalized(context.originalUrl);
  }
}

function safeOrigin(rawUrl: string): string | null {
  try {
    return originOf(rawUrl);
  } catch {
    return null;
  }
}

function safeNormalized(rawUrl: string): string | null {
  try {
    return normalizeUrl(rawUrl);
  } catch {
    return null;
  }
}

export function describeNavigationPolicy(policy: NavigationPolicy): string {
  switch (policy) {
    case 'follow-tab':
      return 'Reloads the tab even if it navigates elsewhere';
    case 'same-origin':
      return 'Pauses if the tab leaves the original site';
    case 'exact-url':
      return 'Pauses if the address changes';
  }
}

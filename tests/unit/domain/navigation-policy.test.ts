import { describe, it, expect } from 'vitest';
import {
  describeNavigationPolicy,
  isNavigationAllowed,
  normalizeUrl,
  originOf,
} from '../../../src/domain/navigation-policy';
import type { NavigationContext } from '../../../src/domain/navigation-policy';

describe('normalizeUrl', () => {
  it('drops the hash and ensures a root path', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });
});

describe('originOf', () => {
  it('returns the origin of a valid url', () => {
    expect(originOf('https://example.com/path?q=1')).toBe('https://example.com');
  });

  it('throws for a malformed url', () => {
    expect(() => originOf('not a url')).toThrow();
  });
});

describe('isNavigationAllowed', () => {
  const context: NavigationContext = {
    originalUrl: 'https://example.com/page',
    originalOrigin: 'https://example.com',
    currentUrl: 'https://example.com/page',
  };

  it('always allows follow-tab', () => {
    expect(
      isNavigationAllowed('follow-tab', { ...context, currentUrl: 'https://other.com/x' }),
    ).toBe(true);
  });

  it('allows same-origin only when origins match', () => {
    expect(
      isNavigationAllowed('same-origin', { ...context, currentUrl: 'https://example.com/other' }),
    ).toBe(true);
    expect(
      isNavigationAllowed('same-origin', { ...context, currentUrl: 'https://other.com/page' }),
    ).toBe(false);
  });

  it('allows exact-url only when the normalized url matches', () => {
    expect(
      isNavigationAllowed('exact-url', { ...context, currentUrl: 'https://example.com/page#a' }),
    ).toBe(true);
    expect(
      isNavigationAllowed('exact-url', { ...context, currentUrl: 'https://example.com/page2' }),
    ).toBe(false);
  });

  it('treats a malformed current url as disallowed for same-origin', () => {
    expect(isNavigationAllowed('same-origin', { ...context, currentUrl: 'not a url' })).toBe(false);
  });
});

describe('describeNavigationPolicy', () => {
  it('returns descriptions for each policy', () => {
    expect(describeNavigationPolicy('follow-tab')).toBeTypeOf('string');
    expect(describeNavigationPolicy('same-origin')).toBeTypeOf('string');
    expect(describeNavigationPolicy('exact-url')).toBeTypeOf('string');
  });
});

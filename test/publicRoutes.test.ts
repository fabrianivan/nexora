import { describe, expect, it } from 'vitest';
import { isPublicRoute } from '../src/shell/publicRoutes';

describe('isPublicRoute', () => {
  it('treats the welcome page and the account pages as public', () => {
    expect(isPublicRoute('/')).toBe(true);
    expect(isPublicRoute('/sign-in')).toBe(true);
    expect(isPublicRoute('/sign-in/factor-one')).toBe(true);
    expect(isPublicRoute('/sign-up')).toBe(true);
    expect(isPublicRoute('/sign-up/verify-email-address')).toBe(true);
    expect(isPublicRoute('/reset-password')).toBe(true);
    expect(isPublicRoute('/waiting')).toBe(true);
  });

  it('keeps every workspace page inside the shell', () => {
    for (const path of ['/overview', '/cases', '/entities/ENT-ID-001', '/settings/team', '/sign-insights']) {
      expect(isPublicRoute(path)).toBe(false);
    }
  });

  it('is false while the pathname is not known yet', () => {
    expect(isPublicRoute(null)).toBe(false);
    expect(isPublicRoute(undefined)).toBe(false);
    expect(isPublicRoute('')).toBe(false);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  authenticate,
  clearAuthSession,
  getAuthPermissions,
  getAuthProfile,
  getSessionDisplayName,
  hydrateAuthProfile,
  MOCK_AUTH_FIXTURE,
  setAuthSession,
} from '../../modules/auth/authSession.js';
import { can, hasAnyPermission, hasAllPermissions } from '../permissions.js';
import { PERMISSIONS } from '../permissions.catalog.js';
import {
  companyCapabilities,
  leadCapabilities,
  orderCapabilities,
} from '../capabilities.js';

describe('auth session + permissions SSOT', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  afterEach(() => {
    clearAuthSession();
    vi.unstubAllEnvs();
  });

  it('hydrates permissions from login profile', () => {
    setAuthSession({
      token: 't',
      username: 'Admin',
      user: {
        id: 'u1',
        username: 'admin',
        displayName: 'Admin',
        roles: ['sales'],
        permissions: [PERMISSIONS.ORDERS_READ, PERMISSIONS.LEADS_WRITE],
      },
    });
    expect(getAuthProfile()?.id).toBe('u1');
    expect(getAuthPermissions()).toEqual([
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.LEADS_WRITE,
    ]);
    expect(getSessionDisplayName()).toBe('Admin');
    expect(can(PERMISSIONS.ORDERS_READ)).toBe(true);
    expect(can(PERMISSIONS.ORDERS_WRITE)).toBe(false);
  });

  it('mock authenticate seeds fixture permissions', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    const result = await authenticate({ username: 'dev', password: 'x' });
    expect(result.permissions).toEqual(MOCK_AUTH_FIXTURE.permissions);
    expect(can(PERMISSIONS.COMPANIES_WRITE)).toBe(true);
    await hydrateAuthProfile();
    expect(getAuthPermissions().length).toBeGreaterThan(0);
  });

  it('capability helpers mirror codes', () => {
    const perms = [PERMISSIONS.LEADS_WRITE, PERMISSIONS.COMPANIES_READ];
    expect(leadCapabilities(perms)).toEqual({
      canView: false,
      canWrite: true,
      canConvert: false,
    });
    expect(companyCapabilities(perms).canView).toBe(true);
    expect(companyCapabilities(perms).canWrite).toBe(false);
    expect(orderCapabilities(perms).canWrite).toBe(false);
  });

  it('hasAny / hasAll', () => {
    const perms = [PERMISSIONS.ORDERS_READ];
    expect(hasAnyPermission([PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE], perms)).toBe(true);
    expect(hasAllPermissions([PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE], perms)).toBe(false);
  });
});

describe('lead convert vs write UX', () => {
  it('write without convert', () => {
    const caps = leadCapabilities([PERMISSIONS.LEADS_WRITE]);
    expect(caps.canWrite).toBe(true);
    expect(caps.canConvert).toBe(false);
  });

  it('convert visible only with leads:convert', () => {
    const caps = leadCapabilities([
      PERMISSIONS.LEADS_WRITE,
      PERMISSIONS.LEADS_CONVERT,
    ]);
    expect(caps.canConvert).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SYSTEM_HEALTH_CARDS } from '../../config/systemHealth.js';
import { moduleData } from '../../../registry.js';
import { useUsersStore } from '../store/usersStore.js';

function readSrc(rel) {
  return readFileSync(rel, 'utf8');
}

describe('DDL-27A source audit — no production user mocks', () => {
  it('users store has no MOCK_USERS / mock-only comment / fake people', () => {
    const src = readSrc('src/modules/shirazeh/users/store/usersStore.js');
    expect(src).not.toContain('MOCK_USERS');
    expect(src).not.toContain('Mock-only until auth/user API exists');
    expect(src).not.toContain('احسان محصصی');
    expect(src).not.toContain('سارا نوری');
    expect(src).not.toContain('ehsan@jarian.local');
    expect(src).not.toContain('sara@jarian.local');
    expect(src).not.toContain('09138877665');
    expect(useUsersStore.getState().users).toEqual([]);
  });

  it('users UI has no fake mobile/email/last-login/force-password fields', () => {
    const grid = readSrc('src/modules/shirazeh/users/components/UsersGrid.jsx');
    const modal = readSrc('src/modules/shirazeh/users/components/AddUserModal.jsx');
    expect(grid).not.toContain('موبایل');
    expect(grid).not.toContain('آخرین ورود');
    expect(grid).not.toContain('forcePasswordChange');
    expect(modal).not.toContain('ایمیل');
    expect(modal).not.toContain('شماره موبایل');
  });

  it('system health has no hard-coded ۲۴ active users', () => {
    const src = readSrc('src/modules/shirazeh/config/systemHealth.js');
    expect(src).not.toMatch(/value:\s*['"]۲۴['"]/);
    const usersCard = SYSTEM_HEALTH_CARDS.find((c) => c.id === 'users');
    expect(usersCard?.live).toBe('activeUsers');
    expect(usersCard?.value).toBeUndefined();
  });

  it('registry shirazeh KPIs have no hard-coded ۲۴ active users', () => {
    const src = readSrc('src/modules/registry.js');
    expect(src).not.toContain("label: 'کاربران فعال', value: '۲۴'");
    const userKpi = moduleData.shirazeh.kpis.find((k) => k.label === 'کاربران فعال');
    expect(userKpi).toBeUndefined();
  });
});

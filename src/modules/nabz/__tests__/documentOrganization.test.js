import { describe, expect, it } from 'vitest';
import {
  isHistoricalProformaPayload,
  resolveProformaOrganization,
  resolveShippingOrganization,
  resolveSooratBarOrganization,
} from '../documentOrganization.js';
import { COMPANY_BRAND } from '../proformaConfig.js';

describe('resolveProformaOrganization', () => {
  const live = { tradeName: 'Live Co', phone: 'TEST-B' };
  const stored = { tradeName: 'Issued Co', phone: 'TEST-A' };

  it('uses live identity for current unsigned preview', () => {
    const org = resolveProformaOrganization({ viewModel: {} }, live);
    expect(org.phone).toBe('TEST-B');
    expect(isHistoricalProformaPayload({ viewModel: {} })).toBe(false);
  });

  it('uses stored snapshot for issued versions', () => {
    const org = resolveProformaOrganization(
      { versionId: 'pf-v-1', viewModel: { organization: stored } },
      live,
    );
    expect(org.phone).toBe('TEST-A');
  });

  it('does not overlay live identity on signed payloads without snapshot (legacy brand)', () => {
    const org = resolveProformaOrganization({ signed: true, viewModel: {} }, live);
    expect(org.phone).not.toBe('TEST-B');
    expect(org.tradeName).toBe('پترو فولاد نیکان');
  });
});

describe('resolveShippingOrganization', () => {
  const live = { tradeName: 'Live Co', phone: 'TEST-B' };
  const stored = { tradeName: 'Issued Co', phone: 'TEST-A' };

  it('uses live identity for current unissued preview', () => {
    expect(resolveShippingOrganization({ issued: false, viewModel: {} }, live).phone).toBe('TEST-B');
  });

  it('uses stored snapshot for issued reprint', () => {
    expect(resolveShippingOrganization(
      { issued: true, viewModel: { organization: stored } },
      live,
    ).phone).toBe('TEST-A');
  });

  it('uses legacy brand for issued reprint without snapshot', () => {
    const org = resolveShippingOrganization({ issued: true, viewModel: {} }, live);
    expect(org.phone).not.toBe('TEST-B');
    expect(org.tradeName).toBe('پترو فولاد نیکان');
  });
});

describe('resolveSooratBarOrganization', () => {
  it('uses snapshot when present', () => {
    const org = resolveSooratBarOrganization({ tradeName: 'Snap Co', phone: 'TEST-A', tagline: 'frozen' });
    expect(org.phone).toBe('TEST-A');
    expect(org.tagline).toBe('frozen');
  });

  it('uses legacy brand when snapshot is missing', () => {
    const org = resolveSooratBarOrganization(null);
    expect(org.tradeName).toBe(COMPANY_BRAND.name);
    expect(org.phone).not.toBe('TEST-B');
  });
});

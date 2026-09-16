import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderRepository } from '@api/repositories/OrderRepository';
import { DOCUMENT_CHROME_TAGLINE } from '../../../domain/settings/documentChrome.js';
import { GATEWAY_CANCEL_REASONS } from '../../../domain/settings/reasonRegistry.js';
import {
  getDocumentChromeTagline,
  resolveDocumentTagline,
  setCachedDocumentChrome,
} from '../settings/documentChromeFacade.js';
import {
  getCancelReasonLabel,
  listGatewayCancelReasons,
  setCachedGatewayCancelReasons,
} from '../settings/reasonRegistryFacade.js';
import { COMPANY_BRAND } from '../settings/legacyCompanyBrand.js';
import { useNabzStore } from '../../nabz/store/useNabzStore';
import { useSalesStore } from '../store/useSalesStore';
import { getOrder, listOrdersForCompany } from '../public/index.js';
import { getOrder as nabzGetOrder } from '../../nabz/public/index.js';
import {
  legacyDocumentOrganizationFromBrand,
  resolveProformaOrganization,
  resolveSooratBarOrganization,
} from '../documentOrganization.js';

describe('sales FE module SSOTs', () => {
  afterEach(() => {
    setCachedDocumentChrome({ tagline: DOCUMENT_CHROME_TAGLINE });
    setCachedGatewayCancelReasons(GATEWAY_CANCEL_REASONS);
    useSalesStore.setState({
      orders: [],
      selectedOrderId: null,
      loading: false,
      persisting: false,
      persistError: null,
      orderDraft: null,
    });
    vi.restoreAllMocks();
  });

  it('shares one store instance between sales and nabz shims', () => {
    expect(useNabzStore).toBe(useSalesStore);
    expect(getOrder).toBe(nabzGetOrder);
  });

  it('keeps COMPANY_BRAND as frozen historical view, not live chrome', () => {
    expect(COMPANY_BRAND.tagline).toBe(DOCUMENT_CHROME_TAGLINE);
    expect(COMPANY_BRAND.name).toBe('پترو فولاد نیکان');
    setCachedDocumentChrome({ tagline: 'Live API tagline' });
    expect(COMPANY_BRAND.tagline).toBe(DOCUMENT_CHROME_TAGLINE);
    expect(getDocumentChromeTagline()).toBe('Live API tagline');
  });

  it('resolves live tagline from settings cache and issued tagline from snapshot', () => {
    setCachedDocumentChrome({ tagline: 'Live API tagline' });
    expect(resolveDocumentTagline({})).toBe('Live API tagline');
    expect(resolveDocumentTagline({ tagline: 'Frozen issue' })).toBe('Frozen issue');
  });

  it('uses settings API cache for gateway cancel labels', () => {
    setCachedGatewayCancelReasons([
      { value: 'high_price', label: 'API قیمت' },
    ]);
    expect(listGatewayCancelReasons()[0].label).toBe('API قیمت');
    expect(getCancelReasonLabel('high_price')).toBe('API قیمت');
  });

  it('falls back to domain reasons when cache is empty', () => {
    setCachedGatewayCancelReasons([]);
    expect(listGatewayCancelReasons()).toBe(GATEWAY_CANCEL_REASONS);
  });

  it('does not overlay live identity on historical documents without snapshot', () => {
    const live = { tradeName: 'Live Co', phone: 'TEST-B' };
    const org = resolveProformaOrganization({ signed: true, viewModel: {} }, live);
    expect(org.tradeName).toBe(legacyDocumentOrganizationFromBrand().tradeName);
    expect(org.phone).not.toBe('TEST-B');
    expect(resolveSooratBarOrganization(null).tradeName).toBe(COMPANY_BRAND.name);
  });

  it('patches cache from fetchOrderById without wiping the list', async () => {
    const existing = { id: 'ord_keep', code: 'JR-KEEP' };
    useSalesStore.setState({ orders: [existing] });
    const fetched = await useSalesStore.getState().fetchOrderById('missing-id');
    expect(fetched).toBeNull();
    expect(useSalesStore.getState().orders).toEqual([existing]);
    expect(listOrdersForCompany('none')).toEqual([]);
  });

  it('fetchOrderById writes the API row into the sales cache', async () => {
    const existing = { id: 'ord_keep', code: 'JR-KEEP' };
    const apiRow = { id: 'ord_api', code: 'JR-API', customerId: 'co_1' };
    useSalesStore.setState({ orders: [existing] });
    vi.spyOn(OrderRepository, 'getOrderById').mockResolvedValue(apiRow);
    const fetched = await useSalesStore.getState().fetchOrderById('JR-API');
    expect(fetched.id).toBe('ord_api');
    expect(useSalesStore.getState().orders.map((row) => row.id)).toEqual(['ord_api', 'ord_keep']);
  });
});

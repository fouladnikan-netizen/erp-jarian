import { describe, expect, it, afterEach } from 'vitest';
import { setCachedOrganizationIdentity } from '../../../domain/organizationIdentity';
import { DOCUMENT_CHROME_TAGLINE } from '../../../domain/settings/documentChrome.js';
import { setCachedDocumentChrome } from '../../sales/settings/documentChromeFacade.js';
import { issueShippingVoucher, buildShippingDocumentViewModel } from '../shippingService.js';
import {
  registerItemScaleWeight,
  updateItemScaleWeight,
  buildSooratBarPayloadForAssignment,
} from '../rahseparLoadingService.js';
import { TADAROK_LINE_STATUS } from '../tadarokStageConfig.js';
import { COMPANY_BRAND } from '../proformaConfig.js';
import { resolveSooratBarOrganization, resolveProformaOrganization } from '../documentOrganization.js';

function purchasedOrder(extra = {}) {
  return {
    id: 'ord-snap-1',
    code: 'JR123456',
    assignee: 'کارشناس',
    items: [{ name: 'ورق', qty: 1, unit: 'تن' }],
    tadarokLines: [{
      id: 'tl-1',
      sourceItemIndex: 0,
      name: 'ورق',
      qty: 1,
      unit: 'تن',
      status: TADAROK_LINE_STATUS.PO_ISSUED,
      purchaseOrder: {
        warehouseVoucherCode: 'WH-1',
        warehouseId: '',
        warehouseAddress: 'انبار',
      },
    }],
    ...extra,
  };
}

afterEach(() => {
  setCachedDocumentChrome({ tagline: DOCUMENT_CHROME_TAGLINE });
});

describe('issueShippingVoucher organization snapshot', () => {
  it('freezes identity at issue and ignores later live changes', () => {
    setCachedOrganizationIdentity({ tradeName: 'Snap Ship Co', phone: 'TEST-A' });
    const issued = issueShippingVoucher(purchasedOrder(), 'cr-sepehr', ['tl-1']);
    expect(issued.accepted).toBe(true);
    expect(issued.order.shippingVoucher.organizationSnapshot.phone).toBe('TEST-A');
    expect(issued.viewModel.organization.phone).toBe('TEST-A');

    setCachedOrganizationIdentity({ tradeName: 'Live Co', phone: 'TEST-B' });
    const reprint = buildShippingDocumentViewModel(issued.order, 'cr-sepehr', ['tl-1']);
    expect(reprint.organization.phone).toBe('TEST-A');

    const current = buildShippingDocumentViewModel(purchasedOrder(), 'cr-sepehr', ['tl-1']);
    expect(current.organization.phone).toBe('TEST-B');
  });
});

describe('registerItemScaleWeight SooratBar snapshot', () => {
  it('freezes identity at first DISPATCHED and keeps it on reprint', () => {
    setCachedOrganizationIdentity({ tradeName: 'Snap Bar Co', phone: 'TEST-A' });
    const loading = purchasedOrder({
      rahsepar: {
        lineStates: {
          'tl-1': {
            status: 'loading',
            assignmentId: 'asg-1',
            driverName: 'راننده',
            licensePlate: '12ب345',
            phone: '09120000000',
          },
        },
        loadingSessions: [{
          id: 'asg-1',
          driverName: 'راننده',
          items: [{ id: 'tl-1' }],
        }],
      },
    });

    const dispatched = registerItemScaleWeight(loading, {
      itemId: 'tl-1',
      scaleWeight: '1000',
      loadingFee: '50',
    });
    expect(dispatched.accepted).toBe(true);
    expect(dispatched.order.rahsepar.lineStates['tl-1'].organizationSnapshot.phone).toBe('TEST-A');

    setCachedOrganizationIdentity({ tradeName: 'Live Co', phone: 'TEST-B' });
    const payload = buildSooratBarPayloadForAssignment(dispatched.order, 'asg-1');
    expect(payload.accepted).toBe(true);
    expect(payload.meta.organizationSnapshot.phone).toBe('TEST-A');
    expect(payload.meta.organizationSnapshot.tagline).toBe(COMPANY_BRAND.tagline);
    expect(resolveSooratBarOrganization(payload.meta.organizationSnapshot).phone).toBe('TEST-A');

    const updated = updateItemScaleWeight(dispatched.order, {
      itemId: 'tl-1',
      scaleWeight: '1100',
      loadingFee: '55',
    });
    expect(updated.accepted).toBe(true);
    expect(updated.order.rahsepar.lineStates['tl-1'].organizationSnapshot.phone).toBe('TEST-A');
  });

  it('legacy dispatched reprint without snapshot does not overlay live identity', () => {
    setCachedOrganizationIdentity({ tradeName: 'Live Co', phone: 'TEST-B' });
    const legacy = purchasedOrder({
      rahsepar: {
        lineStates: {
          'tl-1': {
            status: 'dispatched',
            assignmentId: 'asg-legacy',
            driverName: 'راننده',
            licensePlate: '12ب345',
            phone: '09120000000',
            scaleWeight: 1000,
            loadingFee: 50,
            dispatchedAt: '1405/01/01 · ۱۰:۰۰',
          },
        },
      },
    });
    const payload = buildSooratBarPayloadForAssignment(legacy, 'asg-legacy');
    expect(payload.accepted).toBe(true);
    expect(payload.meta.organizationSnapshot).toBeNull();
    const org = resolveSooratBarOrganization(payload.meta.organizationSnapshot);
    expect(org.tradeName).toBe(COMPANY_BRAND.name);
    expect(org.phone).not.toBe('TEST-B');
  });
});

describe('Proforma snapshot policy regression', () => {
  it('issued proforma payload keeps stored organization after live identity changes', () => {
    const live = { tradeName: 'Live Co', phone: 'TEST-B' };
    const stored = { tradeName: 'Issued Co', phone: 'TEST-A' };
    expect(resolveProformaOrganization(
      { versionId: 'pf-v-reg', viewModel: { organization: stored } },
      live,
    ).phone).toBe('TEST-A');
  });

  it('unsigned proforma preview still reads live identity', () => {
    const live = { tradeName: 'Live Co', phone: 'TEST-B' };
    expect(resolveProformaOrganization({ viewModel: {} }, live).phone).toBe('TEST-B');
  });
});

/**
 * Sales FE module — canonical Order cache + settings chrome/reasons facades.
 * Product screens stay in `src/modules/nabz` and re-export from here.
 */
export {
  listOrders,
  getOrder,
  getOrderById,
  listOrdersForCompany,
  getOrderSummary,
  useOrders,
  useOrdersForCompany,
  useCreateOrderDirect,
  ordersFacade,
} from './public/index.js';
export { useSalesStore, useNabzStore } from './store/useSalesStore';
export { SalesOrdersProvider, useSalesOrders } from './SalesOrdersContext.jsx';
export {
  COMPANY_BRAND,
  loadDocumentChrome,
  getDocumentChromeTagline,
  resolveDocumentTagline,
  loadGatewayCancelReasons,
  listGatewayCancelReasons,
  getCancelReasonLabel,
  useGatewayCancelReasons,
  useDocumentChromeTagline,
} from './settings/index.js';
export {
  legacyDocumentOrganizationFromBrand,
  isHistoricalProformaPayload,
  resolveProformaOrganization,
  resolveShippingOrganization,
  resolveSooratBarOrganization,
} from './documentOrganization.js';

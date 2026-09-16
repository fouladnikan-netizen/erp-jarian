/**
 * Sales public barrel — Order query contracts for other modules.
 * Product UI remains under `src/modules/nabz` (re-export shims).
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
} from './ordersFacade.js';

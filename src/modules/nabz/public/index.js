/**
 * Nabz public barrel — Order query contracts for other modules.
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

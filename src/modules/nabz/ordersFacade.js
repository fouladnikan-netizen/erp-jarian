/**
 * Thin re-export — prefer `modules/nabz/public` for new consumers.
 * Kept so existing Mowj/erpAudiencePort imports keep working.
 */
export {
  listOrders,
  getOrderById,
  getOrder,
  listOrdersForCompany,
  getOrderSummary,
  ordersFacade,
} from './public/ordersFacade.js';

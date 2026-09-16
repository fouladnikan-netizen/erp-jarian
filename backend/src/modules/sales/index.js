/**
 * sales — Order / gateway / tadarok / rahsepar / saranjam (نبض).
 * Public HTTP: /api/v1/orders
 */
export { default as orderRoutes } from './presentation/orders.js';
export { findOrdersReferencingProduct } from './public/orderProductReferences.js';
export { findOrdersForCompany } from './public/companyOrderReferences.js';
export { collectOrderLineProductRefs } from './domain/order/orderLineProductRefs.js';

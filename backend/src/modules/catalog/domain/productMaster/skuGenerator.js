/**
 * Thin alias — Product SKU allocation lives in `productIdentityPolicy.js`.
 * Import the policy in new code. This file stays so older call sites keep working.
 */
export { allocateProductSku as allocateSku } from './productIdentityPolicy.js';

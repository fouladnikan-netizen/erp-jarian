/**
 * Vitrin public contract for future Nabz ENUM pickers (DDL-46).
 * Type-level effective allowed values — never ProductRepository from Nabz.
 */
export {
  effectiveEnumOptions,
  isProductScope,
  isTransactionScope,
  orderEnumOptionsForProduct,
  resolveTypeAllowedValues,
  transactionAttributeDefaults,
  bindingDefaultValue,
  isSheetLengthApplicable,
  isRollSupplyForm,
} from '../../../domain/productMaster/allowedAttributeValues.js';

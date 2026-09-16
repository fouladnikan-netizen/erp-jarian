/**
 * Idempotent: remap Type ENUM subsets/defaults (and leftover Product values)
 * left behind when a catalog was rewritten in Persian without enum-option
 * rename (e.g. kind mill/pressed on ورق آجدار).
 */
import { healOrphanEnumBindingOverrides } from '../services/attributeDefinitionService.js';

export async function seedEnumOverrideHeal(actorUserId) {
  return healOrphanEnumBindingOverrides(actorUserId);
}

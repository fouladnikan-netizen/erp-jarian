/**
 * Product domain models — expand as catalog contracts harden.
 * No UI / presentation fields.
 */

export interface Product {
  id: string;
  name: string;
  unit?: string;
  description?: string;
}

/**
 * Customer domain models — expand as CRM contracts harden.
 * No UI / presentation fields.
 */

export interface Customer {
  id: string;
  name: string;
  createdAt?: string;
}

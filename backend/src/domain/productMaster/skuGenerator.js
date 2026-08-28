/**
 * SKU generation (DDL-24b). Conceptual format GG-CC-TT-VV (Group-Category-
 * Type-Variant sequence), stored without separators as an 8-digit string
 * (e.g. "11010207"). VV is a variant SEQUENCE, not a size/attribute encoding
 * — business logic must never parse the SKU to reconstruct attributes.
 *
 * Variant sequence generation uses the same atomic
 * INSERT..ON CONFLICT..RETURNING pattern as correspondence numbering
 * (DDL-23a) / product_taxonomy_code_counters (DDL-24b), scoped per Product
 * Type (`product_sku_counters`) — safe under concurrent creation.
 *
 * EXPLICIT v1 CONSTRAINT (DDL-24i): VV is capped at 99 variants per Product
 * Type — intentional, backend-authoritative, never silently wrapped/
 * truncated. The 100th variant for one Product Type always throws
 * SKU_VARIANT_SEQUENCE_EXHAUSTED (409); verified safe under concurrency at
 * the 1-remaining-slot boundary by
 * backend/src/__tests__/product-master-taxonomy-ceiling.test.js.
 */
import { appError } from '../../lib/errors.js';
import { pad2 } from './taxonomyCode.js';

const MAX_VARIANT_SEQ = 99;

/**
 * @param {import('pg').PoolClient} client
 * @param {{ groupCode: string, categoryCode: string, typeCode: string, productTypeId: string }} parts
 */
export async function allocateSku(client, { groupCode, categoryCode, typeCode, productTypeId }) {
  if (!groupCode || !categoryCode || !typeCode) {
    throw appError(
      'SKU_TAXONOMY_CODE_MISSING',
      'برای صدور SKU، گروه/دسته/نوع کالا باید کد دورقمی معتبر داشته باشند.',
      409,
    );
  }
  const res = await client.query(
    `INSERT INTO product_sku_counters (product_type_id, next_seq)
     VALUES ($1, 2)
     ON CONFLICT (product_type_id) DO UPDATE SET next_seq = product_sku_counters.next_seq + 1, updated_at = NOW()
     RETURNING next_seq - 1 AS allocated`,
    [productTypeId],
  );
  const variantSeq = res.rows[0].allocated;
  if (variantSeq > MAX_VARIANT_SEQ) {
    throw appError(
      'SKU_VARIANT_SEQUENCE_EXHAUSTED',
      'ظرفیت دنباله دورقمی تنوع محصول (VV، حداکثر ۹۹) برای این نوع کالا تمام شده است — نیاز به بازطراحی طرح SKU (مثلاً افزایش طول دنباله) دارد.',
      409,
      { productTypeId, variantSeq },
    );
  }
  const sku = `${groupCode}${categoryCode}${typeCode}${pad2(variantSeq)}`;
  return { sku, variantSeq };
}

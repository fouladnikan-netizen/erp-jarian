/**
 * Hard-delete guards for Product Master (DDL-24n). Unused nodes may be
 * removed so mnemonic sku_code can be reused; anything with direct
 * dependents is blocked with an itemized 409.
 */
import { appError } from '../../lib/errors.js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toPersianCount(n) {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

const SAMPLE_LIMIT = 12;

/**
 * @param {{
 *   code: string,
 *   entityLabel: string,
 *   dependencyLabel: string,
 *   items: Array<{ id?: string, name?: string, sku?: string, code?: string, skuCode?: string }>,
 *   verb?: string,
 * }} args
 */
export function throwInUse({
  code,
  entityLabel,
  dependencyLabel,
  items,
  verb = 'فراخوانی',
}) {
  const count = items.length;
  const labels = items.slice(0, SAMPLE_LIMIT).map((item) => {
    const name = item.name || '';
    const code = item.sku || item.code || item.skuCode || '';
    if (name && code && name !== code) return `${name} (${code})`;
    return name || code || item.id;
  });
  const more = count > SAMPLE_LIMIT ? ` و ${toPersianCount(count - SAMPLE_LIMIT)} مورد دیگر` : '';
  const sample = labels.length ? ` شامل: ${labels.join('، ')}${more}` : '';
  throw appError(
    code,
    `این ${entityLabel} در ${toPersianCount(count)} ${dependencyLabel} ${verb} شده است و امکان حذف نیست.${sample}`,
    409,
    {
      count,
      dependencyKind: dependencyLabel,
      items: items.slice(0, 20).map((item) => ({
        id: item.id,
        name: item.name || null,
        sku: item.sku || null,
        code: item.code || item.skuCode || null,
      })),
    },
  );
}

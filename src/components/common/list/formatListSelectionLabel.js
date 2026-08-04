/**
 * Shared selection-count copy for list selection bars.
 * Never use for permanent header totals.
 *
 * @param {number} selectedCount
 * @param {number} [totalCount=0] — selectable / processable row count
 * @returns {string}
 */
export function formatListSelectionLabel(selectedCount, totalCount = 0) {
  const selected = Number(selectedCount) || 0;
  if (selected <= 0) return '';

  const n = selected.toLocaleString('fa-IR');
  const total = Number(totalCount) || 0;
  if (total > 0 && selected >= total) {
    return `تمام ${n} سطر انتخاب شده`;
  }
  return `${n} سطر انتخاب شده`;
}

export default formatListSelectionLabel;

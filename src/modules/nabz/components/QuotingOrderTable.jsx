import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import { getTargetInquiry } from '../inquiryService';
import { formatAmountRial } from '../orderCode';
import {
  formatMarginCellValue,
  formatPriceLine,
  SalePriceColumnHeader,
  InquiryCompact,
} from './quickInquiryParts';
import TruncatedText from './TruncatedText';

export const QUOTING_ORDER_TABLE_COLUMNS = [
  { key: 'row', defaultWidth: 52, resizable: false },
  { key: 'name', defaultWidth: 200 },
  { key: 'description', defaultWidth: 220 },
  { key: 'qty', defaultWidth: 72 },
  { key: 'unit', defaultWidth: 72 },
  { key: 'supply', defaultWidth: 260 },
  { key: 'margin', defaultWidth: 110 },
  { key: 'sale', defaultWidth: 160 },
  { key: 'total', defaultWidth: 130 },
];

const COLUMN_LABELS = {
  row: 'ردیف',
  name: 'شرح کالا',
  description: 'توضیحات',
  qty: 'مقدار',
  unit: 'واحد',
  supply: 'استعلام هدف',
  margin: 'حاشیه سود',
  total: 'قیمت کل',
};

/**
 * جدول فشردهٔ اقلام مظنه/سفارش — مشترک بین نمایش سریع و ماشه تأمین
 */
export default function QuotingOrderTable({
  order,
  preview,
  lineMarginMode,
  showSupplier = true,
  saleType,
  storageKey = 'nabz-quoting-order-table',
  showVatToggle = false,
  vatToggleDisabled = false,
  onVatInclusiveChange,
}) {
  const vatInclusive = Boolean(preview?.vatInclusive);
  const isOfficialSale = saleType === 'رسمی';
  const items = order.items || [];
  const { widths, startResize } = useResizableColumns(storageKey, QUOTING_ORDER_TABLE_COLUMNS);

  return (
    <div className="nabz-quick-table-wrap">
      <table className="nabz-quick-table data-table--resizable">
        <ResizableColGroup columns={QUOTING_ORDER_TABLE_COLUMNS} widths={widths} />
        <thead>
          <tr>
            {QUOTING_ORDER_TABLE_COLUMNS.map((col) => (
              <ResizableTh
                key={col.key}
                columnKey={col.key}
                resizable={col.resizable !== false}
                onResizeStart={startResize}
              >
                {col.key === 'sale' && isOfficialSale ? (
                  <SalePriceColumnHeader
                    saleType={saleType}
                    vatInclusive={vatInclusive}
                    showToggle={showVatToggle}
                    disabled={vatToggleDisabled}
                    onChange={onVatInclusiveChange}
                  />
                ) : (
                  COLUMN_LABELS[col.key] || (col.key === 'sale' ? 'قیمت فروش' : '')
                )}
              </ResizableTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={QUOTING_ORDER_TABLE_COLUMNS.length} className="nabz-items-table__empty">
                اقلامی ثبت نشده است.
              </td>
            </tr>
          ) : (
            items.map((item, itemIndex) => {
              const linePreview = preview.lines[itemIndex];
              return (
                <tr key={itemIndex} className="nabz-quick-table__row">
                  <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
                  <td className="nabz-quick-table__name">
                    <TruncatedText text={item.name} empty="—" />
                  </td>
                  <td className="nabz-quick-table__desc">
                    <TruncatedText text={item.description} empty="—" />
                  </td>
                  <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
                  <td>{item.unit || '—'}</td>
                  <td className="nabz-quick-table__supply">
                    <div className="nabz-supply-strip">
                      {(item.inquiries || []).map((inq) => (
                        <InquiryCompact
                          key={inq.id}
                          inquiry={inq}
                          selectable={false}
                          isTarget={getTargetInquiry(item)?.id === inq.id}
                          showSupplier={showSupplier}
                          readOnly
                        />
                      ))}
                    </div>
                  </td>
                  <td className="nabz-quick-table__margin">
                    <span className="nabz-quick-table__margin-badge">
                      {formatMarginCellValue(lineMarginMode, linePreview)}
                    </span>
                  </td>
                  <td className="nabz-quick-table__final">
                    {linePreview?.hasTarget && linePreview.saleUnitPrice > 0 ? (
                      <div className="nabz-price-line nabz-price-line--emphasis">
                        <span className="nabz-price-line__value">{formatAmountRial(linePreview.saleUnitPrice)}</span>
                      </div>
                    ) : (
                      <span className="nabz-quick-table__muted">—</span>
                    )}
                  </td>
                  <td className="nabz-quick-table__final">
                    {linePreview?.hasTarget && linePreview.lineTotal > 0 ? (
                      <div className="nabz-price-line nabz-price-line--emphasis">
                        {formatPriceLine(linePreview.lineTotal)}
                      </div>
                    ) : (
                      <span className="nabz-quick-table__muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

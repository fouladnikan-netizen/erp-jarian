import { useEffect, useMemo, useState } from 'react';
import { listCarriers } from '../../../carriers';
import { getFulfilledPurchaseRows, getOrderShippingRecord } from '../../../shippingService';
import { JarianProductCell } from '../../../../../components/jarian/JarianPresentation';
import GatewaySelect from '../gateway/GatewaySelect';

export default function DeliveryOrderSelectionModal({
  open,
  order,
  onClose,
  onConfirm,
}) {
  const rows = useMemo(
    () => (open && order ? getFulfilledPurchaseRows(order) : []),
    [open, order],
  );
  const rowKeys = useMemo(
    () => rows.map((row) => row.shippingRowKey),
    [rows],
  );
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [carrierId, setCarrierId] = useState('');
  const carriers = useMemo(() => listCarriers(), []);
  const carrierOptions = useMemo(
    () => carriers.map((carrier) => ({ value: carrier.id, label: carrier.name })),
    [carriers],
  );
  const shippingRecord = getOrderShippingRecord(order);

  useEffect(() => {
    if (!open) return;
    setSelectedKeys(rows.map((row) => row.shippingRowKey));
    setCarrierId(shippingRecord?.carrierId || '');
  }, [open, order?.id, shippingRecord?.carrierId, rows]);

  if (!open) return null;

  const allSelected = rowKeys.length > 0 && selectedKeys.length === rowKeys.length;
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < rowKeys.length;

  const toggleRow = (key) => {
    setSelectedKeys((prev) => (
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    ));
  };

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? [] : [...rowKeys]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedKeys.length) {
      window.alert('حداقل یک قلم کالا را برای سفارش ارسال انتخاب کنید.');
      return;
    }
    if (!carrierId) {
      window.alert('باربری را انتخاب کنید.');
      return;
    }
    onConfirm?.(carrierId, selectedKeys);
  };

  return (
    <div className="tadarok-modal" role="presentation">
      <button type="button" className="tadarok-modal__backdrop" aria-label="بستن" onClick={onClose} />
      <div
        className="tadarok-modal__panel delivery-order-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-order-modal-title"
      >
        <header className="tadarok-modal__header">
          <div>
            <h2 id="delivery-order-modal-title" className="tadarok-modal__title">سفارش ارسال</h2>
            <p className="tadarok-modal__subtitle">
              سفارش
              {' '}
              {order?.code}
              {' · '}
              انتخاب اقلام و صدور حواله باربری
            </p>
          </div>
          <button type="button" className="tadarok-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <form className="tadarok-modal__form" onSubmit={handleSubmit}>
          <div className="delivery-order-modal__table-wrap">
            <table className="jarian-table delivery-order-modal__table">
              <thead>
                <tr>
                  <th scope="col" className="delivery-order-modal__check-col">
                    <input
                      type="checkbox"
                      className="delivery-order-modal__row-check"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      disabled={rowKeys.length === 0}
                      aria-label="انتخاب همه اقلام"
                    />
                  </th>
                  <th scope="col">ردیف</th>
                  <th scope="col">شرح کالا</th>
                  <th scope="col">مقدار</th>
                  <th scope="col">واحد</th>
                  <th scope="col">حواله انبار</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="tadarok-stage__empty">
                      قلم خریدشده‌ای برای ارسال وجود ندارد. ابتدا در تدارک حداقل یک سفارش خرید صادر کنید.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const key = row.shippingRowKey;
                    const checked = selectedKeys.includes(key);
                    return (
                      <tr key={key} className={checked ? 'is-selected' : undefined}>
                        <td className="delivery-order-modal__check-cell">
                          <input
                            type="checkbox"
                            className="delivery-order-modal__row-check"
                            checked={checked}
                            onChange={() => toggleRow(key)}
                            aria-label={`انتخاب ردیف ${row.rowNumber}`}
                          />
                        </td>
                        <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                        <td className="jarian-td-product">
                          <JarianProductCell name={row.name} description={row.description} />
                        </td>
                        <td>{row.qty.toLocaleString('fa-IR')}</td>
                        <td>{row.unit}</td>
                        <td>{row.warehouseVoucherCode}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <label className="tadarok-form__field tadarok-form__field--full">
            <span>انتخاب باربری</span>
            <GatewaySelect
              value={carrierId}
              onChange={setCarrierId}
              options={carrierOptions}
              ariaLabel="انتخاب باربری"
              placeholder="انتخاب از کانون..."
            />
          </label>

          <footer className="tadarok-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={rows.length === 0}
            >
              تأیید و صدور سفارش ارسال
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

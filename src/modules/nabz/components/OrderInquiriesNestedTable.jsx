import { Fragment, useMemo, useState } from 'react';
import { isDiscrepancySupplyType, INQUIRY_STATUS_LABEL } from '../inquiryConfig';
import {
  getEmptyInquiryDraft,
  validateInquiryDraft,
} from '../inquiryService';
import {
  JarianMoney,
  JarianProductName,
  JarianSupplier,
} from '../../../components/jarian/JarianPresentation';
import { getSupplierName } from '../suppliers';
import InquiryDraftForm from './InquiryDraftForm';

function draftSlotKey(orderId, itemIndex, slotId) {
  return `${orderId}-${itemIndex}-${slotId}`;
}

export default function OrderInquiriesNestedTable({ order, onAddInquiry, editable = false }) {
  const [draftSlots, setDraftSlots] = useState({});
  const [draftData, setDraftData] = useState({});

  const items = order.items || [];

  const openNewDraft = (itemIndex) => {
    const slotId = `s${Date.now()}`;
    const key = draftSlotKey(order.id, itemIndex, slotId);
    setDraftSlots((prev) => ({
      ...prev,
      [itemIndex]: [...(prev[itemIndex] || []), slotId],
    }));
    setDraftData((prev) => ({ ...prev, [key]: getEmptyInquiryDraft() }));
  };

  const updateDraft = (key, next) => {
    setDraftData((prev) => ({ ...prev, [key]: next }));
  };

  const closeDraft = (itemIndex, slotId) => {
    const key = draftSlotKey(order.id, itemIndex, slotId);
    setDraftSlots((prev) => ({
      ...prev,
      [itemIndex]: (prev[itemIndex] || []).filter((id) => id !== slotId),
    }));
    setDraftData((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submitDraft = (itemIndex, slotId) => {
    const key = draftSlotKey(order.id, itemIndex, slotId);
    const draft = draftData[key];
    const validation = validateInquiryDraft(draft);
    if (!validation.valid) return;

    onAddInquiry?.(order.id, itemIndex, draft);
    closeDraft(itemIndex, slotId);
  };

  const hasInquiries = useMemo(
    () => items.some((item) => (item.inquiries || []).length > 0),
    [items],
  );

  if (!items.length) {
    return <p className="nabz-inquiries-empty">اقلامی برای استعلام وجود ندارد.</p>;
  }

  return (
    <div className="nabz-inquiries-nested">
      {items.map((item, itemIndex) => {
        const inquiries = item.inquiries || [];
        const slots = draftSlots[itemIndex] || [];

        return (
          <section key={itemIndex} className="nabz-inquiries-nested__group">
            <header className="nabz-inquiries-nested__head">
              <span className="nabz-inquiries-nested__item-name">
                {(itemIndex + 1).toLocaleString('fa-IR')}
                .
                {' '}
                <JarianProductName text={item.name} />
              </span>
              <span className="nabz-inquiries-nested__item-meta">
                {item.qty?.toLocaleString('fa-IR') ?? '—'}
                {' '}
                {item.unit || ''}
              </span>
            </header>

            {inquiries.length > 0 ? (
              <table className="nabz-inquiries-table jarian-table">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>نوع تامین</th>
                    <th>تامین‌کننده</th>
                    <th>فی</th>
                    <th>توضیحات</th>
                    <th>مغایرت</th>
                    <th>وضعیت</th>
                    <th>ثبت</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry, inquiryIndex) => (
                    <tr key={inquiry.id}>
                      <td>{(inquiryIndex + 1).toLocaleString('fa-IR')}</td>
                      <td>{inquiry.supplyType}</td>
                      <td>
                        <JarianSupplier
                          name={getSupplierName(inquiry.supplierId)}
                          supplyType={inquiry.supplyType}
                        />
                      </td>
                      <td className="jarian-td-money">
                        <JarianMoney amount={inquiry.unitPrice} />
                      </td>
                      <td>{inquiry.notes || '—'}</td>
                      <td>
                        {isDiscrepancySupplyType(inquiry.supplyType) ? (
                          <span className="nabz-inquiries-table__discrepancy">
                            {inquiry.discrepancyDescription}
                            <br />
                            وزن:
                            {' '}
                            {inquiry.discrepancyWeight}
                            {' · '}
                            فی:
                            {' '}
                            <JarianMoney amount={inquiry.discrepancyUnitPrice} />
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{INQUIRY_STATUS_LABEL[inquiry.status] || 'پیش‌نویس'}</td>
                      <td className="nabz-inquiries-table__meta">
                        {inquiry.registeredAt}
                        <br />
                        {inquiry.registeredBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !editable && <p className="nabz-inquiries-nested__none">استعلامی ثبت نشده است.</p>
            )}

            {editable && (
              <>
                {slots.map((slotId) => {
                  const key = draftSlotKey(order.id, itemIndex, slotId);
                  return (
                    <div key={key} className="nabz-inquiries-nested__draft">
                      <InquiryDraftForm
                        draft={draftData[key]}
                        onChange={(next) => updateDraft(key, next)}
                        onSubmit={() => submitDraft(itemIndex, slotId)}
                        onCancel={() => closeDraft(itemIndex, slotId)}
                        compact
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="nabz-inquiry-add-btn"
                  onClick={() => openNewDraft(itemIndex)}
                  aria-label="افزودن استعلام جدید"
                >
                  +
                </button>
              </>
            )}
          </section>
        );
      })}

      {!hasInquiries && !editable && (
        <p className="nabz-inquiries-empty">هنوز استعلامی ثبت نشده است.</p>
      )}
    </div>
  );
}

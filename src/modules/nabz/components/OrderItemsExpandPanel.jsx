import { Fragment, useState } from 'react';
import {
  getEmptyInquiryDraft,
  validateInquiryDraft,
} from '../inquiryService';
import InquiryDraftForm from './InquiryDraftForm';
import InquirySavedCard from './InquirySavedCard';

function draftSlotKey(orderId, itemIndex, slotId) {
  return `${orderId}-${itemIndex}-${slotId}`;
}

export default function OrderItemsExpandPanel({ order, onAddInquiry }) {
  const [draftSlots, setDraftSlots] = useState({});
  const [draftData, setDraftData] = useState({});

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

    onAddInquiry(order.id, itemIndex, draft);
    closeDraft(itemIndex, slotId);
  };

  const items = order.items || [];

  return (
    <div className="nabz-expand-panel">
      <table className="nabz-items-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>شرح کالا</th>
            <th>توضیحات</th>
            <th>مقدار</th>
            <th>واحد</th>
            <th aria-label="عملیات" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="nabz-items-table__empty">اقلامی ثبت نشده است.</td>
            </tr>
          ) : (
            items.map((item, itemIndex) => {
              const inquiries = item.inquiries || [];
              const slots = draftSlots[itemIndex] || [];

              return (
                <Fragment key={`group-${itemIndex}`}>
                  <tr className="nabz-items-table__item-row">
                    <td>{(itemIndex + 1).toLocaleString('fa-IR')}</td>
                    <td>{item.name}</td>
                    <td>{item.description || '—'}</td>
                    <td>{item.qty?.toLocaleString('fa-IR') ?? '—'}</td>
                    <td>{item.unit || '—'}</td>
                    <td />
                  </tr>

                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="nabz-inquiry-row nabz-inquiry-row--saved">
                      <td colSpan={6}>
                        <InquirySavedCard inquiry={inquiry} />
                      </td>
                    </tr>
                  ))}

                  {slots.map((slotId) => {
                    const key = draftSlotKey(order.id, itemIndex, slotId);
                    return (
                      <tr key={key} className="nabz-inquiry-row nabz-inquiry-row--draft">
                        <td colSpan={6}>
                          <InquiryDraftForm
                            draft={draftData[key]}
                            onChange={(next) => updateDraft(key, next)}
                            onSubmit={() => submitDraft(itemIndex, slotId)}
                            onCancel={() => closeDraft(itemIndex, slotId)}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="nabz-inquiry-row nabz-inquiry-row--add">
                    <td colSpan={6}>
                      <button
                        type="button"
                        className="nabz-inquiry-add-btn"
                        onClick={() => openNewDraft(itemIndex)}
                        aria-label="افزودن استعلام جدید"
                      >
                        +
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

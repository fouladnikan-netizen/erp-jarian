/**
 * Temporary in-memory correspondence SoR (DDL-12).
 */

import { create } from 'zustand';
import { getTodayJalali } from '../../nabz/dateUtils';
import {
  CORRESPONDENCE_DIRECTION,
  CORRESPONDENCE_STATUS,
  CORRESPONDENCE_TYPE,
  normalizeCorrespondence,
} from '../models/correspondence';

function seedRecords() {
  const today = getTodayJalali();
  return [
    normalizeCorrespondence({
      id: 'corr-seed-in-1',
      direction: CORRESPONDENCE_DIRECTION.INCOMING,
      type: CORRESPONDENCE_TYPE.OFFICIAL,
      status: CORRESPONDENCE_STATUS.REGISTERED,
      subject: 'درخواست استعلام قیمت ورق',
      category: 'استعلام',
      priority: 'NORMAL',
      letterNumber: '۱۴۰۴/۱۲۳',
      externalNumber: 'EXT-۸۸۱',
      letterDate: '1404/01/18',
      receivedDate: '1404/01/18',
      senderName: 'صنایع فولاد پارس',
      companyId: 1,
      counterpartyName: 'صنایع فولاد پارس',
      attachments: [{ id: 'att-1', fileName: 'estelam.pdf', mimeType: 'application/pdf' }],
    }),
    normalizeCorrespondence({
      id: 'corr-seed-out-1',
      direction: CORRESPONDENCE_DIRECTION.OUTGOING,
      type: CORRESPONDENCE_TYPE.OFFICIAL,
      status: CORRESPONDENCE_STATUS.DRAFT,
      subject: 'پاسخ به استعلام قیمت',
      category: 'پاسخ',
      priority: 'NORMAL',
      letterDate: today || '1404/01/19',
      receiverName: 'صنایع فولاد پارس',
      companyId: 1,
      body: 'پیش‌نویس پاسخ استعلام',
      attachments: [],
    }),
    normalizeCorrespondence({
      id: 'corr-seed-in-2',
      direction: CORRESPONDENCE_DIRECTION.INCOMING,
      type: CORRESPONDENCE_TYPE.OFFICIAL,
      status: CORRESPONDENCE_STATUS.ACTION_NEEDED,
      subject: 'اعلامیه قرارداد سالانه',
      category: 'قرارداد',
      priority: 'HIGH',
      letterNumber: '۱۴۰۴/۱۲۸',
      externalNumber: 'K-۴۴۲',
      letterDate: '1404/01/16',
      receivedDate: '1404/01/16',
      senderName: 'صنایع فلزی کرمان',
      companyId: 2,
      attachments: [{ id: 'att-2', fileName: 'contract-notice.pdf' }],
    }),
    normalizeCorrespondence({
      id: 'corr-seed-internal-1',
      direction: CORRESPONDENCE_DIRECTION.OUTGOING,
      type: CORRESPONDENCE_TYPE.INTERNAL,
      status: CORRESPONDENCE_STATUS.SENT,
      subject: 'درخواست تایید مرخصی',
      category: 'داخلی',
      priority: 'NORMAL',
      letterNumber: 'INT-۰۱',
      letterDate: today || '1404/01/20',
      senderUserId: 'emp-a',
      receiverUserIds: ['emp-b'],
      senderName: 'کاربر الف',
      receiverName: 'کاربر ب',
      body: 'نامه داخلی آزمایشی — یک رکورد برای فرستنده و گیرنده',
      attachments: [],
    }),
  ].filter(Boolean);
}

export const useCorrespondenceStore = create((set, get) => ({
  records: seedRecords(),

  replaceAll: (records) => set({ records: Array.isArray(records) ? records : [] }),

  upsert: (record) => {
    const next = normalizeCorrespondence(record, { requireId: true });
    if (!next?.id) return null;
    set((state) => {
      const index = state.records.findIndex((item) => String(item.id) === String(next.id));
      if (index === -1) {
        return { records: [next, ...state.records] };
      }
      const merged = { ...state.records[index], ...next, updatedAt: new Date().toISOString() };
      const records = state.records.slice();
      records[index] = merged;
      return { records };
    });
    return get().records.find((item) => String(item.id) === String(next.id)) || null;
  },

  patch: (id, changes) => {
    if (id == null || id === '') return null;
    set((state) => {
      const index = state.records.findIndex((item) => String(item.id) === String(id));
      if (index === -1) return state;
      const merged = normalizeCorrespondence(
        { ...state.records[index], ...changes, id, updatedAt: new Date().toISOString() },
        { requireId: true },
      );
      if (!merged) return state;
      const records = state.records.slice();
      records[index] = merged;
      return { records };
    });
    return get().records.find((item) => String(item.id) === String(id)) || null;
  },
}));

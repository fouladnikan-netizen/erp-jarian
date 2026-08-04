/**
 * Legacy correspondence service adapter.
 * Delegates to officialRecordFacade — profile callers may migrate to facade directly.
 * @deprecated Prefer officialRecordFacade for new code.
 */

import { useMemo } from 'react';
import {
  createDraftRecord,
  listOfficialRecordsByCompany,
  saveOfficialRecord,
} from '../officialRecordFacade';
import { RECORD_DIRECTION } from '../models/officialRecord';
import { useOfficialRecordStore } from '../store/useOfficialRecordStore';

function mapToLegacyShape(item) {
  if (!item) return null;
  const isIncoming = item.direction === RECORD_DIRECTION.INCOMING;
  return {
    id: item.id,
    direction: item.direction,
    type: 'OFFICIAL',
    status: item.status,
    subject: item.subject,
    letterNumber: item.number,
    letterDate: item.date,
    receivedDate: isIncoming ? item.date : null,
    senderName: isIncoming ? item.displayParty : null,
    receiverName: isIncoming ? null : item.displayParty,
    counterpartyName: item.displayParty,
    category: null,
    companyId: item.companyId,
    attachments: item.hasAttachments ? [{ id: 'legacy', fileName: 'attachment' }] : [],
  };
}

export function listCompanyCorrespondence(companyId) {
  return listOfficialRecordsByCompany(companyId).map(mapToLegacyShape);
}

export function useCompanyCorrespondence(companyId) {
  const version = useOfficialRecordStore((state) => state.version);
  return useMemo(
    () => listCompanyCorrespondence(companyId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, version],
  );
}

export function createCorrespondence(payload = {}) {
  const direction = payload.direction === 'INCOMING'
    ? RECORD_DIRECTION.INCOMING
    : RECORD_DIRECTION.OUTGOING;
  const draft = createDraftRecord(direction);
  if (!draft) return null;
  const saved = saveOfficialRecord(draft.id, {
    subject: payload.subject || draft.subject,
    body: payload.body,
    participants: {
      sender: direction === RECORD_DIRECTION.INCOMING
        ? { name: payload.senderName || payload.counterpartyName }
        : draft.participants.sender,
      receiver: direction === RECORD_DIRECTION.OUTGOING
        ? { name: payload.receiverName || payload.counterpartyName }
        : draft.participants.receiver,
    },
    companyId: payload.companyId,
  });
  return mapToLegacyShape(saved);
}

export function updateCorrespondence(id, payload = {}) {
  const saved = saveOfficialRecord(id, {
    subject: payload.subject,
    body: payload.body,
    status: payload.status,
    number: payload.letterNumber,
  });
  return mapToLegacyShape(saved);
}

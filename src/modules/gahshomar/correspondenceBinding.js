/**
 * Gahshomar formal correspondence binding (shim).
 * @see officialRecordFacade.js
 */

export {
  listCompanyCorrespondence,
  createCorrespondence,
  updateCorrespondence,
  useCompanyCorrespondence,
} from './services/correspondenceService';

export {
  listOfficialRecords,
  getOfficialRecord,
  createReply,
  useOfficialRecordList,
  useCompanyOfficialRecords,
} from './officialRecordFacade';

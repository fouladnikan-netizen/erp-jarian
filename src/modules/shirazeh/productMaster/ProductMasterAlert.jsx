import JarianModal from '../../../components/ui/JarianModal';

const ENGLISH_LEAK = /duplicate key|unique constraint|violates |internal server|syntax error|ECONNREFUSED|Network Error|failed with status/i;
const HAS_PERSIAN = /[\u0600-\u06FF]/;

function isUserFacingPersian(text) {
  if (!text) return false;
  if (ENGLISH_LEAK.test(text)) return false;
  return HAS_PERSIAN.test(text);
}

export function productMasterErrorMessage(err, fallback = 'عملیات ناموفق بود.') {
  const data = err?.response?.data;
  const fieldErrors = data?.details?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const firstField = Object.values(fieldErrors).flat().find((item) => typeof item === 'string' && item.trim());
    if (isUserFacingPersian(String(firstField || ''))) return String(firstField).trim();
  }
  const api = String(data?.message || '').trim();
  if (isUserFacingPersian(api)) return api;
  const raw = String(err?.message || '').trim();
  if (isUserFacingPersian(raw)) return raw;
  return fallback;
}

export default function ProductMasterAlert({ message, onClose }) {
  return (
    <JarianModal
      open={Boolean(message)}
      onClose={onClose}
      title="خطا"
      size="sm"
      footer={(
        <button type="button" className="btn btn--primary font-meem" onClick={onClose}>
          متوجه شدم
        </button>
      )}
    >
      <p className="shirazeh-pm__alert-body">{message}</p>
    </JarianModal>
  );
}

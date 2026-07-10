import { useNavigate } from 'react-router-dom';

export function InquiryQuickIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="nabz-action-icon"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

export function ProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="nabz-action-icon"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function OrderRowActions({ orderCode, onOpenInquiry, showInquiry = true }) {
  const navigate = useNavigate();

  return (
    <div className="nabz-table__actions">
      {showInquiry && (
        <button
          type="button"
          className="nabz-table__action-btn nabz-table__action-btn--inquiry"
          onClick={onOpenInquiry}
          aria-label="ثبت سریع استعلام"
        >
          <InquiryQuickIcon />
        </button>
      )}
      <button
        type="button"
        className="nabz-table__action-btn"
        onClick={() => navigate(`/nabz/order/${encodeURIComponent(orderCode)}`)}
        aria-label="صفحه اختصاصی سفارش"
        title="نمایش پروفایل سفارش"
      >
        <ProfileIcon />
      </button>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, Users, X } from 'lucide-react';
import { listSegments } from './services/campaignFacade';

const ICON = { size: 16, strokeWidth: 1.75 };

/**
 * Pick an existing Audience Segment for a campaign.
 */
export default function SegmentPickerDrawer({
  open,
  onClose,
  onSelect,
  selectedId = null,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const segments = useMemo(
    () => listSegments({ query }),
    [query, open],
  );

  if (!open) return null;

  return createPortal(
    <div className="mowj-drawer-root" dir="rtl">
      <button type="button" className="mowj-drawer-backdrop" aria-label="بستن" onClick={onClose} />
      <aside
        className="mowj-drawer mowj-audience-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="سگمنت‌های مخاطب"
      >
        <header className="mowj-drawer__head">
          <div>
            <h2 className="mowj-drawer__title font-meem">سگمنت‌های مخاطب</h2>
            <p className="mowj-drawer__sub font-meem">انتخاب سگمنت موجود برای کمپین</p>
          </div>
          <button type="button" className="mowj-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="mowj-drawer__body">
          <label className="mowj-field font-meem">
            جستجو
            <span className="mowj-search-field">
              <Search size={15} strokeWidth={1.75} aria-hidden="true" />
              <input
                className="mowj-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="نام سگمنت…"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </span>
          </label>

          <ul className="mowj-segment-pick-list">
            {segments.map((seg) => {
              const selected = selectedId === seg.id;
              const count = Number(seg.estimatedCount || 0);
              return (
                <li key={seg.id}>
                  <button
                    type="button"
                    className={`mowj-segment-pick${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onSelect?.(seg);
                      onClose?.();
                    }}
                  >
                    <span className="mowj-segment-pick__icon" aria-hidden="true">
                      <Users {...ICON} />
                    </span>
                    <span className="mowj-segment-pick__body">
                      <span className="mowj-segment-pick__title font-meem">{seg.name}</span>
                      <span className="mowj-segment-pick__count font-yekan">
                        {count.toLocaleString('fa-IR')}
                        {' '}
                        نفر
                      </span>
                    </span>
                    {selected ? (
                      <span className="mowj-segment-pick__check" aria-hidden="true">
                        <Check size={14} strokeWidth={2} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {!segments.length ? (
            <p className="mowj-detail-hint font-meem">سگمنتی یافت نشد.</p>
          ) : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

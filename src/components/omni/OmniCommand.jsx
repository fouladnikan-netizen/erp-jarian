import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  User,
  FileText,
  ArrowUpRight,
  Command,
} from 'lucide-react';
import useDoubleShift from '../../hooks/useDoubleShift';
import './omni-command.css';

const ICON_PROPS = { size: 16, strokeWidth: 1.75 };

const QUICK_ACTIONS = [
  { id: 'qa-1', label: 'ثبت پیش‌فاکتور جدید', hint: 'نبض · سفارش جدید', to: '/nabz/new-order', Icon: Zap },
  { id: 'qa-2', label: 'مشاهده گاه‌شمار', hint: 'موتور تعهدات', to: '/gahshomar', Icon: Zap },
  { id: 'qa-3', label: 'پایپ‌لاین افق', hint: 'فرصت‌های فروش', to: '/ofogh', Icon: Zap },
  { id: 'qa-4', label: 'کانون مخاطبین', hint: 'فهرست مشتریان', to: '/', Icon: Zap },
];

const RECENT_CONTACTS = [
  { id: 'rc-1', label: 'فولاد پارس', hint: 'مشتری · تهران', to: '/kanoon/contact/1', Icon: User },
  { id: 'rc-2', label: 'صنایع فلزی کرمان', hint: 'مشتری · کرمان', to: '/kanoon/contact/2', Icon: User },
  { id: 'rc-3', label: 'ذوب آهن اصفهان', hint: 'مشتری · اصفهان', to: '/kanoon/contact/5', Icon: User },
  { id: 'rc-4', label: 'فولاد مبارکه', hint: 'تأمین‌کننده', to: '/kanoon/contact/4', Icon: User },
];

const OPEN_ORDERS = [
  { id: 'oo-1', label: 'JR050111002', hint: 'صنایع فلزی کرمان · مظنه', to: '/nabz/order/JR050111002', Icon: FileText },
  { id: 'oo-2', label: 'JR050106007', hint: 'فولاد پارس · کاوش', to: '/nabz/order/JR050106007', Icon: FileText },
  { id: 'oo-3', label: 'JR050107006', hint: 'ذوب آهن اصفهان · پیش‌کش', to: '/nabz/order/JR050107006', Icon: FileText },
  { id: 'oo-4', label: 'JR050108005', hint: 'فولاد مبارکه · کاوش', to: '/nabz/order/JR050108005', Icon: FileText },
];

const GROUPS = [
  { id: 'quick', title: 'دسترسی سریع', items: QUICK_ACTIONS },
  { id: 'contacts', title: 'مشتریان اخیر', items: RECENT_CONTACTS },
  { id: 'orders', title: 'سفارشات باز', items: OPEN_ORDERS },
];

function normalize(value) {
  return (value || '').toString().trim().toLowerCase();
}

function matchesQuery(item, query) {
  if (!query) return true;
  const haystack = normalize(`${item.label} ${item.hint || ''}`);
  return haystack.includes(query);
}

function OmniResultItem({ item, active, onSelect, onHover }) {
  const Icon = item.Icon;
  return (
    <button
      type="button"
      className={`omni-item${active ? ' is-active' : ''}`}
      onClick={() => onSelect(item)}
      onMouseEnter={onHover}
    >
      <span className="omni-item__icon">
        <Icon {...ICON_PROPS} />
      </span>
      <span className="omni-item__body">
        <span className="omni-item__label font-meem">{item.label}</span>
        {item.hint ? <span className="omni-item__hint">{item.hint}</span> : null}
      </span>
      <ArrowUpRight size={14} strokeWidth={1.75} className="omni-item__arrow" aria-hidden="true" />
    </button>
  );
}

export default function OmniCommand() {
  const { isOpen, close } = useDoubleShift(500);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredGroups = useMemo(() => {
    const q = normalize(query);
    return GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchesQuery(item, q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const flatItems = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups],
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
      return undefined;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(id);
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= flatItems.length) {
      setActiveIndex(Math.max(0, flatItems.length - 1));
    }
  }, [activeIndex, flatItems.length]);

  const selectItem = (item) => {
    if (!item?.to) return;
    close();
    navigate(item.to);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (flatItems.length ? (i + 1) % flatItems.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) selectItem(item);
    }
  };

  if (!isOpen) return null;

  let runningIndex = -1;

  return createPortal(
    <div className="omni-root" dir="rtl" role="presentation">
      <button
        type="button"
        className="omni-backdrop"
        aria-label="بستن جستجوی سراسری"
        onClick={close}
      />

      <div
        className="omni-panel"
        role="dialog"
        aria-modal="true"
        aria-label="جستجوی سراسری جریان"
        onKeyDown={onKeyDown}
      >
        <div className="omni-search">
          <Search size={20} strokeWidth={1.75} className="omni-search__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="omni-search__input font-meem"
            placeholder="جستجو در جریان یا تایپ دستور... (دوبار Shift)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="omni-search__kbd" title="دوبار Shift">
            <Command size={12} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-yekan">⇧⇧</span>
          </span>
        </div>

        <div className="omni-results">
          {filteredGroups.length === 0 ? (
            <div className="omni-empty font-meem">
              نتیجه‌ای برای «{query}» یافت نشد.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.id} className="omni-group">
                <h3 className="omni-group__title font-meem">{group.title}</h3>
                <div className="omni-group__list">
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    return (
                      <OmniResultItem
                        key={item.id}
                        item={item}
                        active={index === activeIndex}
                        onSelect={selectItem}
                        onHover={() => setActiveIndex(index)}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="omni-foot font-meem">
          <span>↑↓ حرکت</span>
          <span>Enter انتخاب</span>
          <span>Esc بستن</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

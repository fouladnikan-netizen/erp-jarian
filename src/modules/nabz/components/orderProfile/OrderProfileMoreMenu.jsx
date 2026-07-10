import { useEffect, useRef, useState } from 'react';
import OrderProfileConfirmDialog from './OrderProfileConfirmDialog';

export default function OrderProfileMoreMenu({ onEdit, onCancel }) {
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleCancelConfirm = () => {
    setConfirmCancel(false);
    setOpen(false);
    onCancel?.();
  };

  return (
    <>
      <div className="order-profile-more" ref={menuRef}>
        <button
          type="button"
          className="order-profile-more__trigger"
          aria-label="اقدامات بیشتر"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          ⋯
        </button>
        {open && (
          <div className="order-profile-more__menu" role="menu">
            <button
              type="button"
              className="order-profile-more__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit?.();
              }}
            >
              ویرایش کلی سفارش
            </button>
            <button
              type="button"
              className="order-profile-more__item order-profile-more__item--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmCancel(true);
              }}
            >
              لغو سفارش
            </button>
          </div>
        )}
      </div>

      <OrderProfileConfirmDialog
        open={confirmCancel}
        title="لغو سفارش"
        message="آیا از لغو این سفارش مطمئن هستید؟ این عمل قابل بازگشت نیست."
        confirmLabel="لغو سفارش"
        onConfirm={handleCancelConfirm}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}

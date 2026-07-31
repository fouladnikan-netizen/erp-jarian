import { useEffect, useRef, useState } from 'react';
import OrderProfileConfirmDialog from './OrderProfileConfirmDialog';

export default function OrderProfileMoreMenu({
  onEdit,
  onCancel,
  onArchive,
  onCloseOrder,
  canEdit = true,
  showEdit = true,
  showCancel = true,
}) {
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const menuRef = useRef(null);

  const hasVisibleItems = (showEdit && canEdit)
    || showCancel
    || Boolean(onArchive)
    || Boolean(onCloseOrder);

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

  if (!hasVisibleItems) return null;

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
            {showEdit && canEdit && (
              <button
                type="button"
                className="order-profile-more__item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit?.();
                }}
              >
                ویرایش سفارش
              </button>
            )}
            {onArchive && (
              <button
                type="button"
                className="order-profile-more__item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmArchive(true);
                }}
              >
                بایگانی
              </button>
            )}
            {showCancel && (
              <button
                type="button"
                className="order-profile-more__item order-profile-more__item--danger"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmCancel(true);
                }}
              >
                لغو
              </button>
            )}
            {onCloseOrder && (
              <button
                type="button"
                className="order-profile-more__item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmClose(true);
                }}
              >
                بستن سفارش
              </button>
            )}
          </div>
        )}
      </div>

      <OrderProfileConfirmDialog
        open={confirmCancel}
        title="لغو سفارش"
        message="آیا از لغو این سفارش مطمئن هستید؟ این عمل قابل بازگشت نیست."
        confirmLabel="لغو سفارش"
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel?.();
        }}
        onCancel={() => setConfirmCancel(false)}
      />
      <OrderProfileConfirmDialog
        open={confirmArchive}
        title="بایگانی سفارش"
        message="این سفارش بایگانی شود؟"
        confirmLabel="بایگانی"
        onConfirm={() => {
          setConfirmArchive(false);
          onArchive?.();
        }}
        onCancel={() => setConfirmArchive(false)}
      />
      <OrderProfileConfirmDialog
        open={confirmClose}
        title="بستن سفارش"
        message="این سفارش بسته شود؟"
        confirmLabel="بستن سفارش"
        onConfirm={() => {
          setConfirmClose(false);
          onCloseOrder?.();
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  );
}

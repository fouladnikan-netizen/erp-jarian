import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import SmartBackButton from '../../components/navigation/SmartBackButton';
import { normalizeOrderCode } from './orderCode';
import { useNabzStore } from './store/useNabzStore';
import {
  appendInquiryToOrder,
  setTargetInquiryOnOrder,
  updateInquiryOnOrder,
  updateOrderQuoting,
} from './inquiryService';
import OrderProfileView, { OrderProfileViewNotFound } from './components/orderProfile/OrderProfileView';
import './nabz.css';

function matchesOrderCode(order, orderCode) {
  if (!orderCode) return false;
  return normalizeOrderCode(order.code) === normalizeOrderCode(orderCode)
    || String(order.id) === String(orderCode);
}

export default function OrderDetailPage() {
  const { orderCode } = useParams();
  const orders = useNabzStore((s) => s.orders);
  const setOrders = useNabzStore((s) => s.setOrders);
  const fetchOrderById = useNabzStore((s) => s.fetchOrderById);
  const [missingCodes, setMissingCodes] = useState(() => new Set());

  const order = useMemo(
    () => orders.find((row) => matchesOrderCode(row, orderCode)) || null,
    [orders, orderCode],
  );

  useEffect(() => {
    if (!orderCode || order) return undefined;
    let cancelled = false;
    void fetchOrderById(orderCode).then((found) => {
      if (cancelled) return;
      if (!found) {
        setMissingCodes((prev) => {
          if (prev.has(orderCode)) return prev;
          const next = new Set(prev);
          next.add(orderCode);
          return next;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [order, orderCode, fetchOrderById]);

  const waitingForOrder = Boolean(orderCode) && !order && !missingCodes.has(orderCode);

  const addInquiry = (orderId, itemIndex, draft) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId ? appendInquiryToOrder(o, itemIndex, draft) : o
    )));
  };

  const updateInquiry = (orderId, itemIndex, inquiryId, draft) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId ? updateInquiryOnOrder(o, itemIndex, inquiryId, draft) : o
    )));
  };

  const setTargetInquiry = (orderId, itemIndex, inquiryId) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId ? setTargetInquiryOnOrder(o, itemIndex, inquiryId) : o
    )));
  };

  const updateQuoting = (orderId, patch) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId ? updateOrderQuoting(o, patch) : o
    )));
  };

  if (waitingForOrder) {
    return (
      <div className="module-page nabz-page nabz-order-profile-shell">
        <div className="order-profile-smart-back">
          <SmartBackButton fallbackTo="/nabz" fallbackName="لیست سفارشات" />
        </div>
        <p className="order-profile-loading">در حال بارگذاری سفارش...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="module-page nabz-page nabz-order-profile-shell">
        <div className="order-profile-smart-back">
          <SmartBackButton fallbackTo="/nabz" fallbackName="لیست سفارشات" />
        </div>
        <OrderProfileViewNotFound />
      </div>
    );
  }

  return (
    <div className="module-page nabz-page nabz-order-profile-shell">
      <div className="order-profile-smart-back">
        <SmartBackButton fallbackTo="/nabz" fallbackName="لیست سفارشات" />
      </div>
      <OrderProfileView
        order={order}
        onUpdateOrder={setOrders}
        onAddInquiry={addInquiry}
        onUpdateInquiry={updateInquiry}
        onSetTargetInquiry={setTargetInquiry}
        onUpdateQuoting={updateQuoting}
      />
    </div>
  );
}

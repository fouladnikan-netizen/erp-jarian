import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import SmartBackButton from '../../components/navigation/SmartBackButton';
import { normalizeOrderCode } from './orderCode';
import { useNabzOrders } from './NabzOrdersContext';
import {
  appendInquiryToOrder,
  setTargetInquiryOnOrder,
  updateInquiryOnOrder,
  updateOrderQuoting,
} from './inquiryService';
import OrderProfileView, { OrderProfileViewNotFound } from './components/orderProfile/OrderProfileView';
import './nabz.css';

export default function OrderDetailPage() {
  const { orderCode } = useParams();
  const { orders, setOrders } = useNabzOrders();

  const order = useMemo(
    () => orders.find((o) => normalizeOrderCode(o.code) === normalizeOrderCode(orderCode)),
    [orders, orderCode],
  );

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

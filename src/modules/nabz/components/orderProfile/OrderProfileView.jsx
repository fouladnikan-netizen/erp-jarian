import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ORDER_TABS } from '../../config';
import { ORDER_PROFILE_TABS } from '../../orderProfileConfig';
import { getOrderGatewayPhase } from '../../gatewayService';
import {
  executeGatewayHeaderAction,
  getGatewayCurrentStage,
} from '../../gatewayLifecycleService';
import { getOrderOperationalPhase } from '../../phase2Service';
import { markOrderCancelled } from '../../orderProfileService';
import {
  appendCrmActivity,
  updateCrmActivity,
} from '../../orderCrmService';
import { canEditWholeOrder } from '../../orderEditPermissions';
import QuickActivityModal from '../QuickActivityModal';
import CreateOrderDrawer from '../CreateOrderDrawer';
import OrderProfileChrome from './OrderProfileChrome';
import OrderProfileGatewayTab from './OrderProfileGatewayTab';
import OrderProfileCrmTab from './OrderProfileCrmTab';
import OrderProfilePlaceholderTab from './OrderProfilePlaceholderTab';

const PLACEHOLDER_MESSAGES = {
  [ORDER_PROFILE_TABS.TIMELINE]: 'محتوای تب سوابق و تایم‌لاین در اینجا قرار می‌گیرد.',
  [ORDER_PROFILE_TABS.ATTACHMENTS]: 'محتوای تب اسناد و فایل‌ها در اینجا قرار می‌گیرد.',
};

export default function OrderProfileView({
  order,
  onUpdateOrder,
  onAddInquiry,
  onUpdateInquiry,
  onSetTargetInquiry,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(ORDER_PROFILE_TABS.GATEWAY);
  const orderPhase = getOrderGatewayPhase(order);
  const operationalPhase = getOrderOperationalPhase(order);
  const currentStage = getGatewayCurrentStage(order);
  const [viewPhase, setViewPhase] = useState(orderPhase);
  const [operationalViewPhase, setOperationalViewPhase] = useState(operationalPhase);
  const [viewMode, setViewMode] = useState(
    order.status === ORDER_TABS.SUCCESS ? 'operations' : 'gateway',
  );
  const [activityModal, setActivityModal] = useState({ open: false, editActivity: null });
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  useEffect(() => {
    setViewPhase(orderPhase);
  }, [order.id, orderPhase]);

  useEffect(() => {
    setOperationalViewPhase(operationalPhase);
  }, [order.id, operationalPhase]);

  useEffect(() => {
    if (order.status === ORDER_TABS.SUCCESS) {
      setViewMode('operations');
      setOperationalViewPhase(getOrderOperationalPhase(order));
    } else {
      setViewMode('gateway');
    }
  }, [order.id, order.status, order.stageId]);

  const updateOrder = (orderUpdater) => {
    onUpdateOrder((prev) => prev.map((item) => {
      if (item.id !== order.id) return item;
      const next = orderUpdater(item);
      if (next.stageId !== item.stageId || next.status !== item.status) {
        setOperationalViewPhase(getOrderOperationalPhase(next));
        if (next.status === ORDER_TABS.SUCCESS && item.status !== ORDER_TABS.SUCCESS) {
          setViewMode('operations');
        }
      }
      return next;
    }));
  };

  const handleGatewayAdvance = (nextOrder) => {
    updateOrder(() => nextOrder);
    setViewPhase(getOrderGatewayPhase(nextOrder));
    if (nextOrder.status === ORDER_TABS.SUCCESS) {
      setOperationalViewPhase(getOrderOperationalPhase(nextOrder));
      setViewMode('operations');
    }
  };

  const handlePhaseChange = (phase) => {
    setViewMode('gateway');
    setViewPhase(phase);
  };

  const handleOperationalPhaseChange = (phase) => {
    setViewMode('operations');
    setOperationalViewPhase(phase);
  };

  const handleNextAction = (actionId) => {
    const result = executeGatewayHeaderAction(order, actionId);
    if (!result.accepted) {
      window.alert(result.error || 'امکان انجام این اقدام وجود ندارد.');
      return;
    }
    handleGatewayAdvance(result.order);
  };

  const openActivityModal = (editActivity = null) => {
    setActivityModal({ open: true, editActivity });
  };

  const closeActivityModal = () => {
    setActivityModal({ open: false, editActivity: null });
  };

  const handleActivityModalSubmit = (input) => {
    if (input.id) {
      updateOrder((current) => updateCrmActivity(current, input.id, {
        type: input.type,
        body: input.body,
        followUp: input.followUp,
      }));
    } else {
      updateOrder((current) => appendCrmActivity(current, input));
    }
    closeActivityModal();
  };

  return (
    <div className="order-profile-view" data-module="nabz">
      <div className="order-profile-view__sticky">
        <OrderProfileChrome
          order={order}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          orderPhase={orderPhase}
          operationalPhase={operationalPhase}
          operationalViewPhase={operationalViewPhase}
          viewPhase={viewPhase}
          viewMode={viewMode}
          onPhaseChange={handlePhaseChange}
          onOperationalPhaseChange={handleOperationalPhaseChange}
          onCancelOrder={(reason) => {
            updateOrder((current) => markOrderCancelled(current, reason));
            navigate(`/nabz?tab=${ORDER_TABS.FAILED}`);
          }}
          onEditOrder={() => {
            if (!canEditWholeOrder()) {
              window.alert('ویرایش کلی سفارش فقط برای نقش شوالیه فعال است.');
              return;
            }
            setEditDrawerOpen(true);
          }}
          onNextAction={handleNextAction}
          onOpenActivityModal={() => openActivityModal()}
        />
      </div>

      {editDrawerOpen && (
        <CreateOrderDrawer
          key={`edit-${order.id}`}
          mode="edit"
          order={order}
          orders={[]}
          onClose={() => setEditDrawerOpen(false)}
          onSave={(nextOrder) => {
            updateOrder(() => nextOrder);
            setEditDrawerOpen(false);
          }}
        />
      )}

      <QuickActivityModal
        open={activityModal.open}
        order={order}
        editActivity={activityModal.editActivity}
        onClose={closeActivityModal}
        onSubmit={handleActivityModalSubmit}
      />

      <div className="order-profile-view__body">
        {activeTab === ORDER_PROFILE_TABS.GATEWAY && (
          <div
            className="order-profile-panel order-profile-panel--gateway"
            role="tabpanel"
            id="order-profile-panel-gateway"
            aria-labelledby="order-profile-tab-gateway"
          >
            <OrderProfileGatewayTab
              order={order}
              viewPhase={viewPhase}
              viewMode={viewMode}
              orderPhase={orderPhase}
              currentStage={currentStage}
              operationalViewPhase={operationalViewPhase}
              onAddInquiry={onAddInquiry}
              onUpdateInquiry={onUpdateInquiry}
              onSetTargetInquiry={onSetTargetInquiry}
              onUpdateOrder={updateOrder}
              onAdvancePhase={handleGatewayAdvance}
              onOperationalPhaseChange={handleOperationalPhaseChange}
              onReturnToGateway={handlePhaseChange}
            />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.COMMENTS && (
          <div
            className="order-profile-panel order-profile-panel--crm"
            role="tabpanel"
            id="order-profile-panel-comments"
            aria-labelledby="order-profile-tab-comments"
          >
            <OrderProfileCrmTab
              order={order}
              onUpdateOrder={updateOrder}
              onOpenActivityModal={openActivityModal}
            />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.TIMELINE && (
          <div
            className="order-profile-panel"
            role="tabpanel"
            id="order-profile-panel-timeline"
            aria-labelledby="order-profile-tab-timeline"
          >
            <OrderProfilePlaceholderTab message={PLACEHOLDER_MESSAGES[ORDER_PROFILE_TABS.TIMELINE]} />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.ATTACHMENTS && (
          <div
            className="order-profile-panel"
            role="tabpanel"
            id="order-profile-panel-attachments"
            aria-labelledby="order-profile-tab-attachments"
          >
            <OrderProfilePlaceholderTab message={PLACEHOLDER_MESSAGES[ORDER_PROFILE_TABS.ATTACHMENTS]} />
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderProfileViewNotFound() {
  return (
    <div className="order-profile-view order-profile-view--empty">
      <div className="order-profile-view__empty">
        <p>سفارش یافت نشد.</p>
        <Link to="/nabz" className="btn btn--outline">بازگشت به نبض</Link>
      </div>
    </div>
  );
}

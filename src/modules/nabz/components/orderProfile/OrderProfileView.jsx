import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ORDER_TABS } from '../../config';
import { ORDER_PROFILE_TABS } from '../../orderProfileConfig';
import { getOrderGatewayPhase } from '../../gatewayService';
import {
  executeGatewayHeaderAction,
  getGatewayCurrentStage,
  sendProformaToCustomer,
} from '../../gatewayLifecycleService';
import { getOrderOperationalPhase } from '../../phase2Service';
import { markOrderCancelled, appendProfileAttachment, appendSignedProformaRecord, archivePreviousSignedProforma } from '../../orderProfileService';
import { issueProforma, updateProforma, getLatestProformaVersion } from '../../proformaService';
import {
  openStoredProformaPreview,
  PROFORMA_SEND_MESSAGE_TYPE,
  PROFORMA_SIGNED_MESSAGE_TYPE,
} from '../../proformaPrint';
import {
  appendCrmActivity,
  updateCrmActivity,
} from '../../orderCrmService';
import { canEditWholeOrder } from '../../orderEditPermissions';
import {
  markGatewayDecisionFailed,
  markGatewayDecisionSuccess,
} from '../../gatewayDecisionService';
import QuickActivityModal from '../QuickActivityModal';
import CreateOrderDrawer from '../CreateOrderDrawer';
import OrderProfileChrome from './OrderProfileChrome';
import OrderProfileGatewayTab from './OrderProfileGatewayTab';
import OrderProfileCrmTab from './OrderProfileCrmTab';
import OrderProfileTimelineTab from './OrderProfileTimelineTab';
import OrderProfileAttachmentsTab from './OrderProfileAttachmentsTab';
import OrderActionDrawer from './OrderActionDrawer';
import { GATEWAY_PHASES } from '../../gatewayConfig';

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
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false);

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

  const handleSendProforma = (version) => {
    updateOrder((current) => sendProformaToCustomer(current));
    const label = version?.documentNumber || order.code;
    window.alert(`پیش‌فاکتور ${label} برای ${order.customer} ارسال شد.`);
  };

  const handleIssueProforma = () => {
    const result = issueProforma(order);
    if (result.changed) {
      updateOrder(() => result.order);
    }
    openStoredProformaPreview(result.payload);
  };

  const handleViewProforma = () => {
    const latest = getLatestProformaVersion(order);
    if (!latest) return;
    openStoredProformaPreview({
      viewModel: latest.viewModel,
      terms: latest.terms,
      termsCustom: latest.termsCustom,
      orderId: order.id,
      versionId: latest.id,
      signed: Boolean(order.proforma?.signed),
    });
  };

  const handleUpdateProforma = () => {
    const withArchive = archivePreviousSignedProforma(order);
    const result = updateProforma(withArchive);
    if (result.changed) {
      updateOrder(() => result.order);
    }
    openStoredProformaPreview(result.payload);
  };

  const handleDecisionSuccess = (payload) => {
    updateOrder((current) => markGatewayDecisionSuccess(current, payload));
    setDecisionDrawerOpen(false);
  };

  const handleDecisionFailed = (payload) => {
    updateOrder((current) => markGatewayDecisionFailed(current, payload));
    setDecisionDrawerOpen(false);
  };

  const handleOpenDecisionDrawer = () => {
    setActiveTab(ORDER_PROFILE_TABS.GATEWAY);
    setViewMode('gateway');
    setViewPhase(GATEWAY_PHASES.PISHKESH);
    setDecisionDrawerOpen(true);
  };

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data) return;
      if (data.orderId != null && data.orderId !== order.id) return;

      if (data.type === PROFORMA_SEND_MESSAGE_TYPE) {
        handleSendProforma({ documentNumber: data.documentNumber });
        return;
      }

      if (data.type === PROFORMA_SIGNED_MESSAGE_TYPE) {
        updateOrder((current) => appendSignedProformaRecord(current, {
          ...(data.attachment || {}),
          documentNumber: data.documentNumber,
        }));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [order.id, order.customer]);

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
          onIssueProforma={handleIssueProforma}
          onViewProforma={handleViewProforma}
          onUpdateProforma={handleUpdateProforma}
          onOpenDecisionDrawer={handleOpenDecisionDrawer}
        />
      </div>

      <OrderActionDrawer
        open={decisionDrawerOpen}
        order={order}
        viewPhase={GATEWAY_PHASES.PISHKESH}
        orderPhase={orderPhase}
        onClose={() => setDecisionDrawerOpen(false)}
        onSubmitSuccess={handleDecisionSuccess}
        onSubmitFailed={handleDecisionFailed}
      />

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
            <OrderProfileTimelineTab
              order={order}
              onSendProformaVersion={handleSendProforma}
            />
          </div>
        )}
        {activeTab === ORDER_PROFILE_TABS.ATTACHMENTS && (
          <div
            className="order-profile-panel"
            role="tabpanel"
            id="order-profile-panel-attachments"
            aria-labelledby="order-profile-tab-attachments"
          >
            <OrderProfileAttachmentsTab
              order={order}
              onUpload={(file) => updateOrder((current) => appendProfileAttachment(current, file))}
            />
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

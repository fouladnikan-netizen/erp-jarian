import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { computeNabzKpis, filterOrders, filterKanbanOrders } from './kpi';
import {
  ORDER_TABS,
  ORDER_TAB_META,
  VIEW_MODES,
  getKanbanStages,
} from './config';
import { useNabzOrders } from './NabzOrdersContext';
import {
  appendInquiryToOrder,
  completeOrderInquiries,
  completeOrderQuoting,
  setTargetInquiryOnOrder,
  updateInquiryOnOrder,
  updateOrderQuoting,
} from './inquiryService';
import { updateOrderProforma } from './proformaService';
import { MOZENE_LOCKED_MESSAGE, tryChangeOrderStage } from './orderStageService';
import {
  markGatewayDecisionFailed,
  markGatewayDecisionSuccess,
} from './gatewayDecisionService';
import NabzKpis from './components/NabzKpis';
import NabzToolbar from './components/NabzToolbar';
import NabzOrderTable from './components/NabzOrderTable';
import NabzKanban from './components/NabzKanban';
import OrderProfileDrawer from './components/OrderProfileDrawer';
import CustomerPreviewDrawer from './components/CustomerPreviewDrawer';
import CreateOrderDrawer from './components/CreateOrderDrawer';
import QuickInquiryModal from './components/QuickInquiryModal';
import './nabz.css';

export default function NabzPage() {
  const {
    orders, setOrders, orderDraft, clearOrderDraft,
  } = useNabzOrders();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewOrderRoute = location.pathname === '/nabz/new-order';
  const [activeTab, setActiveTab] = useState(ORDER_TABS.CURRENT);
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [search, setSearch] = useState('');
  const [profileOrder, setProfileOrder] = useState(null);
  const [previewCustomerId, setPreviewCustomerId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftCustomerId, setDraftCustomerId] = useState(null);
  const [inquiryModalOrderId, setInquiryModalOrderId] = useState(null);
  const [stageRejectMessage, setStageRejectMessage] = useState('');

  // ورود مستقیم به فرم ثبت سفارش (مسیر /nabz/new-order)
  useEffect(() => {
    if (isNewOrderRoute) setCreateOpen(true);
  }, [isNewOrderRoute]);

  // پل طلایی: مصرف پیش‌نویس ارجاع‌شده از افق — فرم با مشتری پیش‌پرشده باز می‌شود
  useEffect(() => {
    if (!orderDraft) return;
    setDraftCustomerId(orderDraft.contactId);
    setCreateOpen(true);
    clearOrderDraft();
  }, [orderDraft, clearOrderDraft]);

  const closeCreateDrawer = () => {
    setCreateOpen(false);
    setDraftCustomerId(null);
    if (isNewOrderRoute) navigate('/nabz', { replace: true });
  };

  const kpis = useMemo(() => computeNabzKpis(orders), [orders]);

  const listOrders = useMemo(
    () => filterOrders(orders, { tab: activeTab, search }),
    [orders, activeTab, search],
  );

  const kanbanOrders = useMemo(
    () => filterKanbanOrders(orders, activeTab, search),
    [orders, activeTab, search],
  );

  const kanbanStages = useMemo(
    () => getKanbanStages(activeTab),
    [activeTab],
  );

  useEffect(() => {
    setSearch('');
    if (activeTab === ORDER_TABS.FAILED) {
      setViewMode(VIEW_MODES.LIST);
    }
  }, [activeTab]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === ORDER_TABS.FAILED || tab === ORDER_TABS.CURRENT || tab === ORDER_TABS.SUCCESS) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const code = searchParams.get('order');
    if (!code) return;
    const match = orders.find((o) => o.code === code);
    if (match) setProfileOrder(match);
  }, [searchParams, orders]);

  const openCustomerPreview = (customerId) => {
    if (!customerId) return;
    setPreviewCustomerId(customerId);
  };

  const addInquiry = (orderId, itemIndex, draft) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? appendInquiryToOrder(order, itemIndex, draft) : order
    )));
  };

  const updateInquiry = (orderId, itemIndex, inquiryId, draft) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? updateInquiryOnOrder(order, itemIndex, inquiryId, draft) : order
    )));
  };

  const completeInquiry = (orderId) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? completeOrderInquiries(order) : order
    )));
    setInquiryModalOrderId(null);
  };

  const completeQuoting = (orderId) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? completeOrderQuoting(order) : order
    )));
    setInquiryModalOrderId(null);
  };

  const setTargetInquiry = (orderId, itemIndex, inquiryId) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? setTargetInquiryOnOrder(order, itemIndex, inquiryId) : order
    )));
  };

  const updateProforma = (orderId, patch) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? updateOrderProforma(order, patch) : order
    )));
  };

  const updateQuoting = (orderId, patch) => {
    setOrders((prev) => prev.map((order) => (
      order.id === orderId ? updateOrderQuoting(order, patch) : order
    )));
  };

  const updateOrderById = (updater) => {
    setOrders(updater);
  };

  const changeOrderStage = (orderId, targetStageId) => {
    setOrders((prev) => {
      let rejectReason = '';
      const next = prev.map((order) => {
        if (order.id !== orderId) return order;
        const result = tryChangeOrderStage(order, targetStageId);
        if (!result.accepted) {
          rejectReason = result.reason || MOZENE_LOCKED_MESSAGE;
          return result.order;
        }
        return result.order;
      });

      if (rejectReason) {
        setStageRejectMessage(rejectReason);
        window.setTimeout(() => setStageRejectMessage(''), 3200);
      } else {
        setStageRejectMessage('');
      }

      return next;
    });
  };

  const inquiryModalOrder = useMemo(
    () => orders.find((o) => o.id === inquiryModalOrderId) || null,
    [orders, inquiryModalOrderId],
  );

  const showKanban = activeTab !== ORDER_TABS.FAILED && viewMode === VIEW_MODES.KANBAN;
  const listTitle = ORDER_TAB_META[activeTab].listTitle;

  return (
    <div className="module-page nabz-page" data-module="nabz">
      <NabzKpis kpis={kpis} />

      <NabzToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => setCreateOpen(true)}
      />

      {showKanban ? (
        <NabzKanban
          orders={kanbanOrders}
          stages={kanbanStages}
          tab={activeTab}
          onOrderClick={setProfileOrder}
          onCustomerClick={openCustomerPreview}
          onStageChange={changeOrderStage}
          onStageReject={setStageRejectMessage}
          stageRejectMessage={stageRejectMessage}
        />
      ) : (
        <NabzOrderTable
          orders={listOrders}
          tab={activeTab}
          listTitle={listTitle}
          onOrderClick={setProfileOrder}
          onCustomerClick={openCustomerPreview}
          onOpenInquiryModal={(order) => setInquiryModalOrderId(order.id)}
        />
      )}

      {profileOrder && (
        <OrderProfileDrawer
          order={profileOrder}
          onClose={() => setProfileOrder(null)}
          onCustomerClick={openCustomerPreview}
          onAddInquiry={addInquiry}
          onSetTargetInquiry={setTargetInquiry}
          onStageChange={changeOrderStage}
          onUpdateOrder={updateOrderById}
        />
      )}

      {previewCustomerId && (
        <CustomerPreviewDrawer
          customerId={previewCustomerId}
          stacked={Boolean(profileOrder)}
          onClose={() => setPreviewCustomerId(null)}
        />
      )}

      {createOpen && (
        <CreateOrderDrawer
          orders={orders}
          initialCustomerId={draftCustomerId}
          onClose={closeCreateDrawer}
          onSubmit={(order) => {
            setOrders((prev) => [order, ...prev]);
            setActiveTab(ORDER_TABS.CURRENT);
            setViewMode(VIEW_MODES.LIST);
          }}
        />
      )}

      {inquiryModalOrder && (
        <QuickInquiryModal
          order={inquiryModalOrder}
          onClose={() => setInquiryModalOrderId(null)}
          onSaveInquiry={addInquiry}
          onUpdateInquiry={updateInquiry}
          onSetTargetInquiry={setTargetInquiry}
          onUpdateQuoting={updateQuoting}
          onCompleteInquiry={completeInquiry}
          onCompleteQuoting={completeQuoting}
          onUpdateProforma={updateProforma}
          onDecisionSuccess={(payload) => {
            setOrders((prev) => prev.map((item) => (
              item.id === inquiryModalOrder.id
                ? markGatewayDecisionSuccess(item, payload)
                : item
            )));
            setInquiryModalOrderId(null);
          }}
          onDecisionFailed={(payload) => {
            setOrders((prev) => prev.map((item) => (
              item.id === inquiryModalOrder.id
                ? markGatewayDecisionFailed(item, payload)
                : item
            )));
            setInquiryModalOrderId(null);
          }}
          onUpdateOrder={updateOrderById}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { computeNabzKpis } from './kpi';
import {
  ORDER_TABS,
  ORDER_TAB_META,
  VIEW_MODES,
  ALL_STAGES,
} from './config';
import { ORDER_STATUS, ORDER_CLOSURE, resolveClosure } from '../../domain/order/orderLifecycle.js';
import { useNabzStore } from './store/useNabzStore';
import {
  appendInquiryToOrder,
  completeOrderInquiries,
  completeOrderQuoting,
  setTargetInquiryOnOrder,
  updateInquiryOnOrder,
  updateOrderQuoting,
} from './inquiryService';
import { updateOrderProforma } from './proformaService';
import { MOZENE_LOCKED_MESSAGE, getEffectiveStageId, tryChangeOrderStage } from './orderStageService';
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
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import CreateOrderDrawer from './components/CreateOrderDrawer';
import QuickInquiryModal from './components/QuickInquiryModal';
import { useCan } from '../../stores/useSessionStore';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';
import './nabz.css';

const NABZ_VIEW_STAGE_IDS = {
  opportunities: [1, 2, 3],
  supply: [4, 5],
  operations: [7],
  outcome: [8],
};

const NABZ_VIEW_TABS = {
  opportunities: [
    { id: 'current', label: 'سفارشات جاری' },
    { id: 'archive', label: 'بایگانی سفارشات' },
  ],
  supply: [
    { id: 'approval', label: 'در انتظار مجوز' },
    { id: 'procurement', label: 'در انتظار تأمین' },
  ],
  operations: [
    { id: 'rahespar', label: 'رهسپار' },
  ],
  outcome: [
    { id: 'open', label: 'سفارشات سرانجام' },
    { id: 'closed', label: 'سفارشات بسته‌شده' },
  ],
};

function resolveViewTab(view, tab) {
  if (view === 'opportunities') return tab === 'archive' ? 'archive' : 'current';
  if (view === 'supply') return tab === 'procurement' ? 'procurement' : 'approval';
  if (view === 'operations') return 'rahespar';
  if (view === 'outcome') return tab === 'closed' ? 'closed' : 'open';
  if (
    tab === ORDER_TABS.FAILED
    || tab === ORDER_TABS.CURRENT
    || tab === ORDER_TABS.SUCCESS
    || tab === ORDER_TABS.CLOSED
  ) {
    return tab;
  }
  return ORDER_TABS.CURRENT;
}

function toPresentationTab(view, tab) {
  if (!NABZ_VIEW_STAGE_IDS[view]) return tab;
  if (view === 'opportunities') {
    return tab === 'archive' ? ORDER_TABS.FAILED : ORDER_TABS.CURRENT;
  }
  if (view === 'outcome' && tab === 'closed') return ORDER_TABS.CLOSED;
  return ORDER_TABS.SUCCESS;
}

function matchesViewTab(order, view, tab) {
  if (view === 'opportunities') {
    const status = order.status;
    if (tab === 'archive') return status === ORDER_STATUS.FAILED;
    return status === ORDER_STATUS.CURRENT;
  }
  if (view === 'supply') {
    const stageId = getEffectiveStageId(order);
    return tab === 'procurement' ? stageId === 5 : stageId === 4;
  }
  if (view === 'outcome') {
    const closure = resolveClosure(order);
    return tab === 'closed'
      ? closure === ORDER_CLOSURE.CLOSED
      : closure === ORDER_CLOSURE.OPEN;
  }
  return true;
}

function filterBySearch(orders, search) {
  const filtered = !search
    ? orders
    : orders.filter((order) => {
      const haystack = [
        order.code,
        order.customer,
        order.assignee,
        order.amountRial,
        order.failReason,
        ...(order.items || []).map((item) => item.name),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  return filtered.map((order, index) => ({ order, index })).sort((a, b) => {
    const ta = a.order.updatedAt || a.order.updated_at || 0;
    const tb = b.order.updatedAt || b.order.updated_at || 0;
    if (tb !== ta) return tb - ta;
    return a.index - b.index;
  }).map(({ order }) => order);
}

export default function NabzPage() {
  const orders = useNabzStore((s) => s.orders);
  const setOrders = useNabzStore((s) => s.setOrders);
  const selectedOrderId = useNabzStore((s) => s.selectedOrderId);
  const selectOrder = useNabzStore((s) => s.selectOrder);
  const orderDraft = useNabzStore((s) => s.orderDraft);
  const clearOrderDraft = useNabzStore((s) => s.clearOrderDraft);
  const canWriteOrders = useCan(PERMISSIONS.ORDERS_WRITE);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewOrderRoute = location.pathname === '/nabz/new-order';
  const view = searchParams.get('view');
  const isContextualView = Boolean(NABZ_VIEW_STAGE_IDS[view]);
  const [unscopedTab, setUnscopedTab] = useState(ORDER_TABS.CURRENT);
  const activeTab = isContextualView
    ? resolveViewTab(view, searchParams.get('tab'))
    : unscopedTab;
  const presentationTab = toPresentationTab(view, activeTab);
  const toolbarTabs = isContextualView ? NABZ_VIEW_TABS[view] : [];
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [search, setSearch] = useState('');
  const [previewCustomerId, setPreviewCustomerId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftCustomerId, setDraftCustomerId] = useState(null);
  const [inquiryModalOrderId, setInquiryModalOrderId] = useState(null);
  const [stageRejectMessage, setStageRejectMessage] = useState('');

  const profileOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

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

  const scopedOrders = useMemo(() => {
    const stageIds = NABZ_VIEW_STAGE_IDS[view];
    if (!stageIds) return orders;
    return orders.filter((order) => stageIds.includes(getEffectiveStageId(order)));
  }, [orders, view]);

  const listOrders = useMemo(() => {
    if (!isContextualView) {
      return filterBySearch(scopedOrders, search);
    }
    return filterBySearch(
      scopedOrders.filter((order) => matchesViewTab(order, view, activeTab)),
      search,
    );
  }, [scopedOrders, isContextualView, view, activeTab, search]);

  const kanbanOrders = useMemo(() => {
    if (!isContextualView) return filterBySearch(scopedOrders, search);
    return [];
  }, [isContextualView, scopedOrders, search]);

  const kanbanStages = ALL_STAGES;

  useEffect(() => {
    setSearch('');
    if (presentationTab === ORDER_TABS.FAILED || presentationTab === ORDER_TABS.CLOSED) {
      setViewMode(VIEW_MODES.LIST);
    }
  }, [activeTab, presentationTab]);

  useEffect(() => {
    if (isContextualView) return;
    const tab = searchParams.get('tab');
    if (
      tab === ORDER_TABS.FAILED
      || tab === ORDER_TABS.CURRENT
      || tab === ORDER_TABS.SUCCESS
      || tab === ORDER_TABS.CLOSED
    ) {
      setUnscopedTab(tab);
    }
  }, [searchParams, isContextualView]);

  const handleTabChange = (tabId) => {
    if (!isContextualView) {
      setUnscopedTab(tabId);
      return;
    }
    if (view === 'operations') return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const code = searchParams.get('order');
    if (!code) return;
    const match = orders.find((o) => o.code === code);
    if (match) selectOrder(match.id);
  }, [searchParams, orders, selectOrder]);

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

  const showKanban = !isContextualView;
  const listTitle = isContextualView
    ? (toolbarTabs.find((tab) => tab.id === activeTab)?.label || '')
    : ORDER_TAB_META[activeTab]?.listTitle;

  return (
    <ListPageLayout
      moduleId="nabz"
      className="nabz-page"
      kpis={<NabzKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          className="nabz-toolbar"
          searchPlaceholder="جستجو در سفارشات..."
          searchValue={search}
          onSearchChange={setSearch}
          primaryLabel={view === 'opportunities' ? 'ثبت سفارش جدید' : ''}
          onPrimaryClick={view === 'opportunities' ? () => setCreateOpen(true) : undefined}
          primaryDisabled={!canWriteOrders}
          primaryTitle={canWriteOrders ? undefined : 'شما مجوز ایجاد سفارش را ندارید.'}
          filters={(
            <NabzToolbar
              tabs={toolbarTabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showViewToggle={false}
            />
          )}
        />
      )}
    >
      {showKanban ? (
        <NabzKanban
          orders={kanbanOrders}
          stages={kanbanStages}
          tab={null}
          onOrderClick={(order) => selectOrder(order.id)}
          onCustomerClick={openCustomerPreview}
          onStageChange={canWriteOrders ? changeOrderStage : undefined}
          onStageReject={setStageRejectMessage}
          stageRejectMessage={stageRejectMessage}
        />
      ) : (
        <NabzOrderTable
          orders={listOrders}
          tab={presentationTab}
          listTitle={listTitle}
          onOrderClick={(order) => selectOrder(order.id)}
          onCustomerClick={openCustomerPreview}
          onOpenInquiryModal={(order) => setInquiryModalOrderId(order.id)}
        />
      )}

      {profileOrder && (
        <OrderProfileDrawer
          order={profileOrder}
          onClose={() => selectOrder(null)}
          onCustomerClick={openCustomerPreview}
          onAddInquiry={addInquiry}
          onSetTargetInquiry={setTargetInquiry}
          onStageChange={canWriteOrders ? changeOrderStage : undefined}
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
            if (!isContextualView) setUnscopedTab(ORDER_TABS.CURRENT);
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
            if (view === 'opportunities') {
              selectOrder(null);
              if (searchParams.get('order')) {
                const next = new URLSearchParams(searchParams);
                next.delete('order');
                setSearchParams(next, { replace: true });
              }
            }
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
    </ListPageLayout>
  );
}

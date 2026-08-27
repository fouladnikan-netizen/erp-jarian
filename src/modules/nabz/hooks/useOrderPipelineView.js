import { useEffect, useState } from 'react';
import { ORDER_TABS } from '../config';
import { getOrderGatewayPhase } from '../gatewayService';
import { getOrderOperationalPhase, shouldShowOperationalPhases } from '../phase2Service';

export function useOrderPipelineView(order) {
  const orderPhase = getOrderGatewayPhase(order);
  const operationalPhase = getOrderOperationalPhase(order);
  const [viewPhase, setViewPhase] = useState(orderPhase);
  const [operationalViewPhase, setOperationalViewPhase] = useState(operationalPhase);
  const [viewMode, setViewMode] = useState(
    shouldShowOperationalPhases(order) || order.status === ORDER_TABS.SUCCESS
      ? 'operations'
      : 'gateway',
  );

  useEffect(() => {
    setViewPhase(orderPhase);
  }, [order.id, orderPhase]);

  useEffect(() => {
    setOperationalViewPhase(operationalPhase);
  }, [order.id, operationalPhase]);

  useEffect(() => {
    if (shouldShowOperationalPhases(order) || order.status === ORDER_TABS.SUCCESS) {
      setViewMode('operations');
      setOperationalViewPhase(getOrderOperationalPhase(order));
    } else {
      setViewMode('gateway');
    }
  }, [order.id, order.status, order.stageId, order.phase2EnteredAt, order.gatewayDecision?.outcome]);

  const handlePhaseChange = (phase) => {
    setViewMode('gateway');
    setViewPhase(phase);
  };

  const handleOperationalPhaseChange = (phase) => {
    setViewMode('operations');
    setOperationalViewPhase(phase);
  };

  const syncAfterOrderUpdate = (nextOrder) => {
    setViewPhase(getOrderGatewayPhase(nextOrder));
    setOperationalViewPhase(getOrderOperationalPhase(nextOrder));
    if (shouldShowOperationalPhases(nextOrder) || nextOrder.status === ORDER_TABS.SUCCESS) {
      setViewMode('operations');
    }
  };

  return {
    orderPhase,
    operationalPhase,
    viewPhase,
    operationalViewPhase,
    viewMode,
    handlePhaseChange,
    handleOperationalPhaseChange,
    syncAfterOrderUpdate,
    setViewPhase,
    setOperationalViewPhase,
    setViewMode,
  };
}

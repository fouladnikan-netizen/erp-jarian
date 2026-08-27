import { useEffect, useMemo } from 'react';
import { useActivitiesVersion } from '../../../pooyesh/public/index.js';
import {
  completeOrderFollowUp,
  createOrderActivity,
  fetchOrderActivities,
  listOrderActivities,
  listPendingOrderActivities,
} from '../../orderActivityBridge';
import ActivityComposer from './crm/ActivityComposer';
import ActivityTimeline from './crm/ActivityTimeline';
import PendingActivitiesPanel from './crm/PendingActivitiesPanel';

export default function OrderProfileCrmTab({
  order,
  onUpdateOrder,
  onOpenActivityModal,
}) {
  const activitiesVersion = useActivitiesVersion();

  useEffect(() => {
    void fetchOrderActivities(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when order/customer changes
  }, [order.id, order.customerId]);

  const activities = useMemo(
    () => listOrderActivities(order),
    // activitiesVersion: invalidate when canonical Activity cache updates
    [order, activitiesVersion],
  );

  const pendingActivities = useMemo(
    () => listPendingOrderActivities(order),
    [order, activitiesVersion],
  );

  const handleSubmit = (activityInput) => {
    const { updater, async } = createOrderActivity(order, activityInput);
    if (updater) onUpdateOrder?.(updater);
    if (async) void async;
  };

  const handleCompleteFollowUp = (activityId) => {
    const { updater, async } = completeOrderFollowUp(order, activityId);
    if (updater) onUpdateOrder?.(updater);
    if (async) void async;
  };

  return (
    <div className="order-profile-crm">
      <ActivityComposer onSubmit={handleSubmit} />
      <div className="order-crm-column">
        <PendingActivitiesPanel
          activities={pendingActivities}
          onComplete={handleCompleteFollowUp}
          onEdit={(activity) => onOpenActivityModal?.(activity)}
          onAddNew={() => onOpenActivityModal?.()}
        />
        <ActivityTimeline
          activities={activities}
          onCompleteFollowUp={handleCompleteFollowUp}
        />
      </div>
    </div>
  );
}

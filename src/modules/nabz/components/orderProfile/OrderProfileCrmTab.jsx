import { useMemo } from 'react';
import {
  appendCrmActivity,
  completeCrmFollowUp,
  getOrderCrmActivities,
} from '../../orderCrmService';
import ActivityComposer from './crm/ActivityComposer';
import ActivityTimeline from './crm/ActivityTimeline';
import PendingActivitiesPanel from './crm/PendingActivitiesPanel';

export default function OrderProfileCrmTab({
  order,
  onUpdateOrder,
  onOpenActivityModal,
}) {
  const activities = useMemo(() => getOrderCrmActivities(order), [order]);

  const handleSubmit = (activityInput) => {
    onUpdateOrder?.((current) => appendCrmActivity(current, activityInput));
  };

  const handleCompleteFollowUp = (activityId) => {
    onUpdateOrder?.((current) => completeCrmFollowUp(current, activityId));
  };

  return (
    <div className="order-profile-crm">
      <ActivityComposer onSubmit={handleSubmit} />
      <div className="order-crm-column">
        <PendingActivitiesPanel
          order={order}
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

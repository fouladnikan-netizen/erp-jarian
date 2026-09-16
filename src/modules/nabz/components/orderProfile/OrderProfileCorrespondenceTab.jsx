import GahshomarOrderCorrespondencePanel from '../../../gahshomar/components/GahshomarOrderCorrespondencePanel';

/**
 * Thin Nabz-side wrapper — the tab renders Gahshomar's own component so the
 * Correspondence read model, drawer, and print flows all stay owned by
 * Gahshomar (DDL-23 golden ownership rule / product rule 15).
 */
export default function OrderProfileCorrespondenceTab({ order }) {
  return (
    <div className="order-profile-card">
      <GahshomarOrderCorrespondencePanel orderId={order?.id} showHeader={false} />
    </div>
  );
}

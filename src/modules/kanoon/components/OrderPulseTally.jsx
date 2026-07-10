import { Link } from 'react-router-dom';
import { getOpenOrderItems } from '../columns';

const BAR_COLORS = ['#0ad1ba', '#0D9488', '#14b8a6', '#0f766e', '#2dd4bf'];
const MAX_BARS = 12;

export default function OrderPulseTally({ contact, onFallbackClick }) {
  const items = getOpenOrderItems(contact);

  if (!items.length) {
    return <span className="kanoon-table__muted">—</span>;
  }

  const visible = items.slice(0, MAX_BARS);
  const overflow = items.length - MAX_BARS;

  return (
    <div
      className="kanoon-pulse-tally"
      role="group"
      aria-label={`${items.length.toLocaleString('fa-IR')} سفارش باز`}
    >
      {visible.map((order, i) => {
        const bar = (
          <span
            className="kanoon-pulse-tally__bar"
            style={{ '--bar-color': BAR_COLORS[i % BAR_COLORS.length] }}
          />
        );

        if (order.id) {
          return (
            <Link
              key={order.id}
              to={`/nabz?order=${encodeURIComponent(order.id)}`}
              className="kanoon-pulse-tally__link"
              title={order.title ? `${order.id} — ${order.title}` : order.id}
              target="_blank"
              rel="noopener noreferrer"
            >
              {bar}
            </Link>
          );
        }

        return (
          <button
            key={`placeholder-${i}`}
            type="button"
            className="kanoon-pulse-tally__link"
            title="مشاهده سفارش‌های باز"
            onClick={() => onFallbackClick?.(contact)}
          >
            {bar}
          </button>
        );
      })}
      {overflow > 0 && (
        <span className="kanoon-pulse-tally__more" title={`${overflow} سفارش دیگر`}>
          +{overflow.toLocaleString('fa-IR')}
        </span>
      )}
    </div>
  );
}

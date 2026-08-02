import {
  Activity,
  Users,
  Plug,
  ShieldCheck,
} from 'lucide-react';
import { SYSTEM_HEALTH_CARDS } from '../config/systemHealth';

const ICON_MAP = {
  Activity,
  Users,
  Plug,
  ShieldCheck,
};

/**
 * Top-of-page system health strip — glass cards, config-driven.
 */
export default function SystemHealthCards({ items = SYSTEM_HEALTH_CARDS }) {
  return (
    <section className="shirazeh-health" aria-label="وضعیت سلامت سامانه">
      <div className="shirazeh-health__label font-meem">سلامت سامانه</div>
      <div className="shirazeh-health__grid">
        {items.map((card) => {
          const Icon = ICON_MAP[card.icon] || Activity;
          return (
            <article
              key={card.id}
              className={`shirazeh-health-card shirazeh-health-card--${card.tone || 'neutral'}`}
            >
              <div className="shirazeh-health-card__head">
                <span className="shirazeh-health-card__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="shirazeh-health-card__label font-meem">{card.label}</span>
              </div>
              <p className="shirazeh-health-card__value font-yekan">{card.value}</p>
              {card.hint ? (
                <p className="shirazeh-health-card__hint font-meem">{card.hint}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

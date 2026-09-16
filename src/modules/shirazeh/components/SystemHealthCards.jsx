import { useEffect, useMemo } from 'react';
import {
  Activity,
  Users,
  Plug,
  ShieldCheck,
} from 'lucide-react';
import { SYSTEM_HEALTH_CARDS } from '../config/systemHealth';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import { useUsersStore } from '../users/store/usersStore';
import { countActiveUsers } from '../users/config/usersDisplay';
import { toPersianDigits } from '../../../utils/numberUtils';

const ICON_MAP = {
  Activity,
  Users,
  Plug,
  ShieldCheck,
};

/**
 * Top-of-page system health strip — glass cards, config-driven.
 * User KPI is live from canonical users API; other cards may still be mock.
 */
export default function SystemHealthCards({ items = SYSTEM_HEALTH_CARDS }) {
  const canAdmin = useCan(PERMISSIONS.USERS_ADMIN);
  const users = useUsersStore((s) => s.users);
  const loaded = useUsersStore((s) => s.loaded);
  const loading = useUsersStore((s) => s.loading);
  const error = useUsersStore((s) => s.error);
  const loadUsers = useUsersStore((s) => s.loadUsers);

  useEffect(() => {
    if (canAdmin && !loaded && !loading) {
      void loadUsers().catch(() => {});
    }
  }, [canAdmin, loaded, loading, loadUsers]);

  const resolved = useMemo(() => {
    return items.flatMap((card) => {
      if (card.live !== 'activeUsers') return [card];
      if (!canAdmin) return [];
      const value = loaded
        ? (error && !users.length ? '—' : toPersianDigits(countActiveUsers(users)))
        : '…';
      return [{ ...card, value }];
    });
  }, [items, canAdmin, loaded, users, error]);

  return (
    <section className="shirazeh-health" aria-label="وضعیت سلامت سامانه">
      <div className="shirazeh-health__label font-meem">سلامت سامانه</div>
      <div className="shirazeh-health__grid">
        {resolved.map((card) => {
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

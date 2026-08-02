import {
  BadgeCheck,
  Loader2,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Plug,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { getCategoryLabel } from '../config/integrationsRegistry';
import { useIntegrationUIStore } from '../store/integrationUIStore';
import ConnectionForm from './ConnectionForm';
import ConnectionStatus from './ConnectionStatus';

const ICON_MAP = {
  MessageSquare,
  MessageCircle,
  Send,
  MessagesSquare,
  Smartphone,
  Sparkles,
  BadgeCheck,
  Plug,
};

/**
 * Single integration card — collapsed summary, expanded credentials + actions.
 * "تست اتصال" and "ذخیره اعتبارنامه" are intentionally separate.
 */
export default function IntegrationCard({ integration }) {
  const expandedId = useIntegrationUIStore((s) => s.expandedId);
  const health = useIntegrationUIStore((s) => s.health[integration.id]);
  const testingId = useIntegrationUIStore((s) => s.testingId);
  const testResult = useIntegrationUIStore((s) => s.testResults[integration.id]);
  const toggleExpand = useIntegrationUIStore((s) => s.toggleExpand);
  const testConnection = useIntegrationUIStore((s) => s.testConnection);

  const expanded = expandedId === integration.id;
  const testing = testingId === integration.id;
  const connected = Boolean(health?.connected);
  const Icon = ICON_MAP[integration.icon] || Plug;
  const categoryLabel = getCategoryLabel(integration.category);

  return (
    <article
      className={`shirazeh-int-card${expanded ? ' shirazeh-int-card--expanded' : ''}`}
    >
      <button
        type="button"
        className="shirazeh-int-card__hit"
        onClick={() => toggleExpand(integration.id)}
        aria-expanded={expanded}
      >
        <div className="shirazeh-int-card__top">
          <span className="shirazeh-int-card__icon" aria-hidden="true">
            <Icon size={20} strokeWidth={1.75} />
          </span>
          <div className="shirazeh-int-card__titles">
            <h3 className="shirazeh-int-card__name font-meem">{integration.name}</h3>
            <span className="shirazeh-int-card__category font-meem">{categoryLabel}</span>
          </div>
          <ConnectionStatus connected={connected} compact />
        </div>

        <p className="shirazeh-int-card__desc font-meem">{integration.description}</p>
      </button>

      <div className="shirazeh-int-card__actions">
        <button
          type="button"
          className="shirazeh-btn shirazeh-btn--ghost font-meem"
          onClick={() => toggleExpand(integration.id)}
        >
          <Settings2 size={15} strokeWidth={1.75} aria-hidden="true" />
          تنظیمات
        </button>
        <button
          type="button"
          className="shirazeh-btn shirazeh-btn--primary font-meem"
          disabled={testing}
          onClick={() => {
            void testConnection(integration.id);
          }}
        >
          {testing ? (
            <Loader2 className="shirazeh-conn__spin" size={15} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Plug size={15} strokeWidth={1.75} aria-hidden="true" />
          )}
          تست اتصال
        </button>
      </div>

      <div
        className={`shirazeh-int-card__expand${expanded ? ' shirazeh-int-card__expand--open' : ''}`}
        aria-hidden={!expanded}
      >
        <ConnectionForm integration={integration} />
        {(testing || testResult?.status === 'success' || testResult?.status === 'error') ? (
          <div className="shirazeh-int-card__test-result">
            <ConnectionStatus
              connected={connected}
              testing={testing}
              testStatus={testResult?.status || 'idle'}
              message={testResult?.message || ''}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

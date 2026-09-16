import { INTEGRATIONS_REGISTRY } from '../config/integrationsRegistry';
import IntegrationCard from './IntegrationCard';

/**
 * Responsive grid of integration cards from the registry.
 */
export default function IntegrationGrid({ items = INTEGRATIONS_REGISTRY }) {
  return (
    <div className="shirazeh-int-grid" role="list">
      {items.map((integration) => (
        <div key={integration.id} role="listitem">
          <IntegrationCard integration={integration} />
        </div>
      ))}
    </div>
  );
}

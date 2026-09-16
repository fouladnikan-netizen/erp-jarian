import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

/**
 * Compact connection status indicator for cards and forms.
 */
export default function ConnectionStatus({
  connected = false,
  testing = false,
  testStatus = 'idle',
  message = '',
  compact = false,
}) {
  if (testing) {
    return (
      <span className={`shirazeh-conn${compact ? ' shirazeh-conn--compact' : ''}`}>
        <Loader2 className="shirazeh-conn__spin" size={14} strokeWidth={2} aria-hidden="true" />
        <span className="shirazeh-conn__text font-meem">در حال تست…</span>
      </span>
    );
  }

  if (testStatus === 'success') {
    return (
      <span className={`shirazeh-conn shirazeh-conn--success${compact ? ' shirazeh-conn--compact' : ''}`}>
        <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
        <span className="shirazeh-conn__text font-meem">{message || 'اتصال موفق بود'}</span>
      </span>
    );
  }

  if (testStatus === 'error') {
    return (
      <span className={`shirazeh-conn shirazeh-conn--error${compact ? ' shirazeh-conn--compact' : ''}`}>
        <XCircle size={14} strokeWidth={2} aria-hidden="true" />
        <span className="shirazeh-conn__text font-meem">{message || 'اتصال برقرار نشد'}</span>
      </span>
    );
  }

  return (
    <span
      className={[
        'shirazeh-conn',
        connected ? 'shirazeh-conn--online' : 'shirazeh-conn--offline',
        compact ? 'shirazeh-conn--compact' : '',
      ].filter(Boolean).join(' ')}
    >
      <Circle
        size={10}
        strokeWidth={0}
        fill="currentColor"
        aria-hidden="true"
      />
      <span className="shirazeh-conn__text font-meem">
        {connected ? 'متصل' : 'قطع'}
      </span>
    </span>
  );
}

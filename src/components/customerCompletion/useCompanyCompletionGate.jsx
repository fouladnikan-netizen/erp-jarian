import { useCallback, useState } from 'react';
import IncompleteCompanyDialog from './IncompleteCompanyDialog';
import { evaluateCompanyCompletion } from '../../domain/customerCompletion';
import { useContactsStore } from '../../stores/useContactsStore';

/**
 * Shared gate for Nabz / Ofogh / Poyesh / Gahshomar.
 *
 * ensureOperational(companyOrId, onReady) →
 *   true  if already operational (and calls onReady immediately)
 *   false if dialog opened; onReady runs after ContactPerson is added
 */
export function useCompanyCompletionGate() {
  const [gate, setGate] = useState(null);

  const ensureOperational = useCallback((companyOrId, onReady) => {
    const company = typeof companyOrId === 'object' && companyOrId
      ? companyOrId
      : useContactsStore.getState().contacts.find(
        (c) => String(c.id) === String(companyOrId),
      );

    if (!company) return false;

    const evaluation = evaluateCompanyCompletion(company);
    if (evaluation.isOperational) {
      onReady?.(company);
      return true;
    }

    setGate({
      companyId: company.id,
      onReady: typeof onReady === 'function' ? onReady : null,
    });
    return false;
  }, []);

  const closeGate = useCallback(() => setGate(null), []);

  const handleResolved = useCallback((company) => {
    const cb = gate?.onReady;
    setGate(null);
    cb?.(company);
  }, [gate]);

  const gateDialog = gate ? (
    <IncompleteCompanyDialog
      open
      companyId={gate.companyId}
      onClose={closeGate}
      onResolved={handleResolved}
    />
  ) : null;

  return { ensureOperational, gateDialog, isGateOpen: Boolean(gate) };
}

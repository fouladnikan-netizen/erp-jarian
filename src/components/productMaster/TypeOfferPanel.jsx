import { useEffect, useState } from 'react';
import { seedOfferSettingsFromType } from '../../domain/productMaster/offerSettings';
import OfferSettingsFields from './OfferSettingsFields';

export default function TypeOfferPanel({ type, uoms, canManage, onSave, busy, saveLabel = 'ذخیره واحد و عرضه' }) {
  const [values, setValues] = useState(() => seedOfferSettingsFromType(type));

  useEffect(() => {
    setValues(seedOfferSettingsFromType(type));
  }, [type?.id, type?.defaultCountUnitId, type?.defaultSalesUnitId, type?.defaultUnitWeight, type?.customLengthAllowed]);

  if (!type) return null;

  const handleSave = (e) => {
    e.preventDefault();
    void onSave({
      defaultCountUnitId: values.countUnitId || null,
      defaultSalesUnitId: values.salesUnitId || null,
    });
  };

  return (
    <form className="offer-settings__form" onSubmit={handleSave}>
      <OfferSettingsFields
        variant="type"
        idPrefix={`type-${type.id}`}
        uoms={uoms}
        values={values}
        onChange={setValues}
        disabled={!canManage || busy}
      />
      {canManage && (
        <div className="offer-settings__actions">
          <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
            {saveLabel}
          </button>
        </div>
      )}
    </form>
  );
}

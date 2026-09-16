import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import { useBrandsStore } from '../../../stores/useBrandsStore';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';
import { useUomStore } from '../../../stores/useUomStore';
import {
  TYPE_WIZARD_STEPS,
  hasEnumAttributes,
  nextWizardStep,
  prevWizardStep,
} from '../../../domain/productMaster/typeCompletion';
import TaxonomyTab from '../../shirazeh/productMaster/TaxonomyTab';
import AttributesTab from '../../shirazeh/productMaster/AttributesTab';
import TypeOfferPanel from '../../../components/productMaster/TypeOfferPanel';
import TypeContextBar from './TypeContextBar';
import TypeStepper from './TypeStepper';
import TypeBrandsPanel from './TypeBrandsPanel';
import useTypeContext from './useTypeContext';
import { productMasterErrorMessage } from '../../shirazeh/productMaster/ProductMasterAlert';

const STEP_IDS = TYPE_WIZARD_STEPS.map((step) => step.id);

function typeEditPath(id, step, fromSummary) {
  const suffix = fromSummary ? '?from=summary' : '';
  return `/vitrin/structure/types/${id}/edit/${step}${suffix}`;
}

export default function TypeWizardPage({ isNew = false }) {
  const { typeId: paramTypeId, step: paramStep } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSummary = new URLSearchParams(location.search).get('from') === 'summary';
  const canManageTaxonomy = useCan(PERMISSIONS.PRODUCTS_MANAGE_TAXONOMY);
  const canManageBrands = useCan(PERMISSIONS.PRODUCTS_MANAGE_BRANDS);
  const updateType = useProductTaxonomyStore((s) => s.updateType);
  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);
  const brands = useBrandsStore((s) => s.brands);
  const fetchBrands = useBrandsStore((s) => s.fetchAll);
  const [selectedTypeId, setSelectedTypeId] = useState(paramTypeId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const typeId = paramTypeId || selectedTypeId;
  const { type, schema, schemaLoaded, breadcrumb } = useTypeContext(typeId);
  const stepId = STEP_IDS.includes(paramStep) ? paramStep : 'classification';

  useEffect(() => { void fetchUoms(); }, [fetchUoms]);
  useEffect(() => { void fetchBrands(); }, [fetchBrands]);
  useEffect(() => {
    if (paramTypeId) setSelectedTypeId(paramTypeId);
  }, [paramTypeId]);

  useEffect(() => {
    if (fromSummary || stepId !== 'allowed-values' || !schemaLoaded || !typeId) return;
    if (hasEnumAttributes(schema)) return;
    const next = nextWizardStep('attributes', schema);
    if (next) navigate(typeEditPath(typeId, next, fromSummary), { replace: true });
  }, [stepId, schema, schemaLoaded, typeId, fromSummary, navigate]);

  const goToStep = (step) => {
    if (!typeId) return;
    navigate(typeEditPath(typeId, step, fromSummary));
  };

  const handleSelectType = useCallback((id) => {
    setSelectedTypeId(id);
    if (isNew && id && id !== paramTypeId) {
      navigate(typeEditPath(id, 'classification'), { replace: true });
    }
  }, [isNew, paramTypeId, navigate]);

  const goNext = () => {
    if (!typeId) return;
    if (fromSummary) {
      navigate(`/vitrin/structure/types/${typeId}`);
      return;
    }
    const next = nextWizardStep(stepId, schema);
    if (!next) {
      navigate(`/vitrin/structure/types/${typeId}`);
      return;
    }
    navigate(typeEditPath(typeId, next, fromSummary));
  };

  const goPrev = () => {
    if (!typeId) {
      navigate('/vitrin/structure');
      return;
    }
    if (fromSummary) {
      navigate(`/vitrin/structure/types/${typeId}`);
      return;
    }
    const prev = prevWizardStep(stepId, schema);
    if (!prev) {
      navigate('/vitrin/structure');
      return;
    }
    navigate(typeEditPath(typeId, prev, fromSummary));
  };

  const saveThen = async (patch, after) => {
    setBusy(true);
    setError('');
    try {
      await updateType(typeId, patch);
      after();
    } catch (err) {
      setError(productMasterErrorMessage(err, 'ذخیره ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const nextLabel = fromSummary ? 'بازگشت به خلاصه' : (nextWizardStep(stepId, schema) ? 'ادامه' : 'مشاهده خلاصه');

  return (
    <section className="vitrin-structure__wizard">
      <TypeStepper
        currentStepId={stepId}
        type={type}
        schema={schema}
        onSelect={goToStep}
        allowJump={Boolean(typeId)}
      />
      <TypeContextBar breadcrumb={breadcrumb} />
      {error ? <p className="shirazeh-pm__alert">{error}</p> : null}

      {stepId === 'classification' && (
        <TaxonomyTab
          canManage={canManageTaxonomy}
          onSelectType={handleSelectType}
          initialTypeId={typeId}
        />
      )}
      {stepId === 'attributes' && (
        <AttributesTab canManage={canManageTaxonomy} selectedTypeId={typeId} mode="binding" />
      )}
      {stepId === 'allowed-values' && (
        <AttributesTab canManage={canManageTaxonomy} selectedTypeId={typeId} mode="allowed-values" />
      )}
      {stepId === 'offer' && (
        <TypeOfferPanel
          type={type}
          uoms={uoms}
          canManage={canManageTaxonomy}
          busy={busy}
          saveLabel={fromSummary ? 'ذخیره و بازگشت' : 'ذخیره و ادامه'}
          onSave={(patch) => saveThen(patch, fromSummary
            ? () => navigate(`/vitrin/structure/types/${typeId}`)
            : goNext)}
        />
      )}
      {stepId === 'brands' && (
        <TypeBrandsPanel
          type={type}
          brands={brands}
          canManage={canManageBrands}
          busy={busy}
          saveLabel={fromSummary ? 'ذخیره و بازگشت' : 'ذخیره و ادامه'}
          onSave={(patch) => saveThen(patch, fromSummary
            ? () => navigate(`/vitrin/structure/types/${typeId}`)
            : goNext)}
        />
      )}

      {stepId !== 'offer' && stepId !== 'brands' ? (
        <div className="vitrin-structure__footer">
          <button type="button" className="shirazeh-pm__btn" onClick={goPrev}>
            {fromSummary ? 'بازگشت به خلاصه' : 'قبلی'}
          </button>
          <button
            type="button"
            className="shirazeh-pm__btn shirazeh-pm__btn--primary"
            onClick={goNext}
            disabled={!typeId}
          >
            {nextLabel}
          </button>
        </div>
      ) : (
        <div className="vitrin-structure__footer">
          <button type="button" className="shirazeh-pm__btn" onClick={goPrev}>
            {fromSummary ? 'بازگشت به خلاصه' : 'قبلی'}
          </button>
        </div>
      )}
    </section>
  );
}

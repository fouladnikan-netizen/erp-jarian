import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import { useBrandsStore } from '../../../stores/useBrandsStore';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';
import { useUomStore } from '../../../stores/useUomStore';
import { typeBreadcrumb } from '../../../domain/productMaster/typeCompletion';
import AttributesTab from '../../shirazeh/productMaster/AttributesTab';
import TypeOfferPanel from '../../../components/productMaster/TypeOfferPanel';
import StructureAccordion from './StructureAccordion';
import TypeBrandsPanel from './TypeBrandsPanel';
import TypeDisplayNamePanel from './TypeDisplayNamePanel';
import { productMasterErrorMessage } from '../../shirazeh/productMaster/ProductMasterAlert';
import { useState } from 'react';

export default function TypeDetailPanel({ type, group, category, schema }) {
  const canManageTaxonomy = useCan(PERMISSIONS.PRODUCTS_MANAGE_TAXONOMY);
  const canManageBrands = useCan(PERMISSIONS.PRODUCTS_MANAGE_BRANDS);
  const updateType = useProductTaxonomyStore((s) => s.updateType);
  const uoms = useUomStore((s) => s.uoms);
  const brands = useBrandsStore((s) => s.brands);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!type) return null;

  const breadcrumb = typeBreadcrumb({ group, category, type });
  const hasEnum = (schema || []).some((entry) => entry.definition?.dataType === 'ENUM');

  const saveType = async (patch) => {
    setBusy(true);
    setError('');
    try {
      await updateType(type.id, patch);
    } catch (err) {
      setError(productMasterErrorMessage(err, 'ذخیره ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="vitrin-structure__detail" aria-label={`جزئیات ${type.name}`}>
      <header className="vitrin-structure__detail-head">
        <h2 className="vitrin-structure__detail-title">{type.name}</h2>
        <p className="vitrin-structure__detail-path">{breadcrumb}</p>
      </header>
      {error ? <p className="shirazeh-pm__alert">{error}</p> : null}

      <StructureAccordion title="ویژگی‌ها" hint="از بانک ویژگی‌ها انتخاب می‌شود." defaultOpen>
        <AttributesTab canManage={canManageTaxonomy} selectedTypeId={type.id} mode="binding" compact />
      </StructureAccordion>

      <StructureAccordion title="واحد و عرضه" hint="از واحد‌های تعریف‌شده انتخاب می‌شود.">
        <TypeOfferPanel
          type={type}
          uoms={uoms}
          canManage={canManageTaxonomy}
          busy={busy}
          saveLabel="ذخیره"
          onSave={saveType}
        />
      </StructureAccordion>

      {hasEnum ? (
        <StructureAccordion title="مقادیر مجاز" hint="فقط برای ویژگی‌های فهرستی همین نوع.">
          <AttributesTab canManage={canManageTaxonomy} selectedTypeId={type.id} mode="allowed-values" compact />
        </StructureAccordion>
      ) : null}

      <StructureAccordion title="برندها" hint="اختیاری است. خالی بماند یعنی محدودیتی روی برند نیست؛ همهٔ دسته‌ها برند ندارند.">
        <TypeBrandsPanel
          type={type}
          brands={brands}
          canManage={canManageBrands}
          busy={busy}
          onSave={saveType}
        />
      </StructureAccordion>

      <StructureAccordion title="نحوه نمایش نام محصول" hint="ترتیب نام نمایشی. واحد از بانک واحد خوانده می‌شود؛ عنوان فیلد جداست.">
        <TypeDisplayNamePanel
          type={type}
          group={group}
          category={category}
          schema={schema}
          canManage={canManageTaxonomy}
          busy={busy}
          onSave={saveType}
        />
      </StructureAccordion>
    </section>
  );
}

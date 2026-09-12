import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBrandsStore } from '../../../stores/useBrandsStore';
import { useUomStore } from '../../../stores/useUomStore';
import {
  resolveTypeCompletion,
  TYPE_COMPLETION,
} from '../../../domain/productMaster/typeCompletion';
import TypeContextBar from './TypeContextBar';
import useTypeContext from './useTypeContext';

function uomName(uoms, id) {
  return uoms.find((item) => item.id === id)?.nameFa || '—';
}

export default function TypeSummaryPage() {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const { type, schema, breadcrumb } = useTypeContext(typeId);
  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);
  const brands = useBrandsStore((s) => s.brands);
  const fetchBrands = useBrandsStore((s) => s.fetchAll);

  useEffect(() => { void fetchUoms(); }, [fetchUoms]);
  useEffect(() => { void fetchBrands(); }, [fetchBrands]);

  if (!type) {
    return <p className="vitrin-structure__skip">نوع کالا یافت نشد.</p>;
  }

  const status = resolveTypeCompletion(type, schema);
  const enumEntries = schema.filter((entry) => entry.definition?.dataType === 'ENUM');
  const brandNames = (type.allowedBrandIds || [])
    .map((id) => brands.find((item) => item.id === id)?.brandName)
    .filter(Boolean);
  const edit = (step) => `/vitrin/structure/types/${typeId}/edit/${step}?from=summary`;

  return (
    <section className="vitrin-structure__summary">
      <header className="vitrin-structure__summary-head">
        <h2 className="vitrin-structure__summary-title">{type.name}</h2>
        <span className={`vitrin-structure__status${status.id === TYPE_COMPLETION.complete.id ? ' vitrin-structure__status--complete' : ''}`}>
          {status.label}
        </span>
        <button type="button" className="vitrin-structure__link-btn" onClick={() => navigate('/vitrin/structure')}>
          بازگشت
        </button>
      </header>
      <TypeContextBar breadcrumb={breadcrumb} />

      <article className="vitrin-structure__section">
        <div>
          <h3 className="vitrin-structure__section-title">طبقه‌بندی</h3>
          <p className="vitrin-structure__section-body">{breadcrumb}</p>
        </div>
        <Link className="vitrin-structure__link-btn" to={edit('classification')}>ویرایش</Link>
      </article>

      <article className="vitrin-structure__section">
        <div>
          <h3 className="vitrin-structure__section-title">ویژگی‌ها</h3>
          <p className="vitrin-structure__section-body">
            {schema.length ? `${schema.length.toLocaleString('fa-IR')} ویژگی` : 'ویژگی متصل نشده'}
          </p>
        </div>
        <Link className="vitrin-structure__link-btn" to={edit('attributes')}>ویرایش</Link>
      </article>

      <article className="vitrin-structure__section">
        <div>
          <h3 className="vitrin-structure__section-title">مقادیر مجاز</h3>
          <p className="vitrin-structure__section-body">
            {enumEntries.length
              ? enumEntries.map((entry) => {
                const count = (entry.binding.effectiveAllowedValues || entry.definition.allowedValues || []).length;
                return `${entry.definition.nameFa}: ${count.toLocaleString('fa-IR')} گزینه`;
              }).join('، ')
              : 'ویژگی فهرستی ندارد'}
          </p>
        </div>
        {enumEntries.length ? <Link className="vitrin-structure__link-btn" to={edit('allowed-values')}>ویرایش</Link> : null}
      </article>

      <article className="vitrin-structure__section">
        <div>
          <h3 className="vitrin-structure__section-title">واحد و عرضه</h3>
          <p className="vitrin-structure__section-body">
            {uomName(uoms, type.defaultCountUnitId)} / {uomName(uoms, type.defaultSalesUnitId)}
            {type.customLengthAllowed ? ' — طول سفارشی مجاز' : ''}
          </p>
        </div>
        <Link className="vitrin-structure__link-btn" to={edit('offer')}>ویرایش</Link>
      </article>

      <article className="vitrin-structure__section">
        <div>
          <h3 className="vitrin-structure__section-title">برندها</h3>
          <p className="vitrin-structure__section-body">
            {brandNames.length
              ? `${brandNames.length.toLocaleString('fa-IR')} برند — ${brandNames.join('، ')}`
              : 'بدون محدودیت برند (اختیاری)'}
          </p>
        </div>
        <Link className="vitrin-structure__link-btn" to={edit('brands')}>ویرایش</Link>
      </article>
    </section>
  );
}

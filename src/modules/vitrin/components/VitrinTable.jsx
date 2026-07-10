import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import StatusTag from '../../../components/module/StatusTag';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import VitrinRowActions from './VitrinRowActions';

const VITRIN_COLUMNS = [
  { key: 'check', defaultWidth: 48, resizable: false },
  { key: 'row', defaultWidth: 56, resizable: false },
  { key: 'code', defaultWidth: 110 },
  { key: 'title', defaultWidth: 200 },
  { key: 'group', defaultWidth: 120 },
  { key: 'subgroup', defaultWidth: 120 },
  { key: 'unit', defaultWidth: 90 },
  { key: 'status', defaultWidth: 90 },
  { key: 'actions', defaultWidth: 100, resizable: false },
];

const COLUMN_LABELS = {
  check: '',
  row: 'ردیف',
  code: 'کد کالا',
  title: 'شرح محصول',
  group: 'گروه کالا',
  subgroup: 'زیرگروه کالا',
  unit: 'واحد سنجش',
  status: 'وضعیت',
  actions: 'عملیات',
};

function getGroupName(groups, groupId) {
  return groups.find((g) => g.id === groupId)?.name || '—';
}

function getSubgroupName(groups, groupId, subgroupId) {
  return groups.find((g) => g.id === groupId)?.subgroups.find((s) => s.id === subgroupId)?.name || '—';
}

export default function VitrinTable({
  products,
  groups,
  listTitle,
  selectedIds,
  onSelectionChange,
  onTitleClick,
  onEdit,
  onToggleActive,
}) {
  const { widths, startResize } = useResizableColumns('vitrin-products', VITRIN_COLUMNS);

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(products.map((p) => p.id)));
    }
  };

  return (
    <section className="section-data vitrin-table-section" aria-label="فهرست محصولات">
      <div className="data-table-header">
        <span className="data-table-header__title">{listTitle}</span>
        <span className="data-table-header__count">
          {products.length.toLocaleString('fa-IR')} رکورد
        </span>
      </div>
      <div className="data-table-wrap vitrin-table-wrap">
        <table className="data-table vitrin-table data-table--resizable">
          <ResizableColGroup columns={VITRIN_COLUMNS} widths={widths} />
          <thead className="vitrin-table__head">
            <tr>
              {VITRIN_COLUMNS.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={startResize}
                  className={`vitrin-table__sticky-th${
                    col.key === 'check' ? ' vitrin-table__check-col' : ''
                  }${col.key === 'actions' ? ' vitrin-table__actions-col' : ''}`}
                >
                  {col.key === 'check' ? (
                    <input
                      type="checkbox"
                      aria-label="انتخاب همه"
                      checked={products.length > 0 && selectedIds.size === products.length}
                      onChange={toggleSelectAll}
                    />
                  ) : (
                    COLUMN_LABELS[col.key]
                  )}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={VITRIN_COLUMNS.length}>
                  <div className="empty-state">
                    <div className="empty-state__icon">📦</div>
                    <p>محصولی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product, index) => (
                <tr
                  key={product.id}
                  className={`vitrin-table__row${product.isActive === false ? ' is-inactive' : ''}`}
                >
                  <td className="vitrin-table__check-col">
                    <input
                      type="checkbox"
                      aria-label={`انتخاب ${product.title}`}
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>
                  <td>{(index + 1).toLocaleString('fa-IR')}</td>
                  <td className="vitrin-table__code">{product.code}</td>
                  <td>
                    <button
                      type="button"
                      className="vitrin-table__title-link"
                      onClick={() => onTitleClick(product)}
                    >
                      {product.title}
                    </button>
                  </td>
                  <td>{getGroupName(groups, product.groupId)}</td>
                  <td>{getSubgroupName(groups, product.groupId, product.subgroupId)}</td>
                  <td>{product.unit}</td>
                  <td>
                    <StatusTag
                      value={product.isActive !== false ? 'tag:active:فعال' : 'tag:danger:غیرفعال'}
                    />
                  </td>
                  <td className="vitrin-table__actions-col">
                    <VitrinRowActions product={product} onEdit={onEdit} onToggleActive={onToggleActive} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

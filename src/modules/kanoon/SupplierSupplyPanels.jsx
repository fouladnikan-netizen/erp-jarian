import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { useNabzOrders } from '../nabz/NabzOrdersContext';
import { withReturnParams } from '../../components/navigation/SmartBackButton';
import { ProfileTabSectionHeader } from '../../components/profileLayout';
import EntityMentionText from '../../components/navigation/EntityMentionText';
import { getDisplayName } from './columns';
import {
  listSupplierInquiries,
  listSupplierPurchaseOrders,
} from './supplierSupplyBinding';
import './customerProfile.css';

function formatFilterValue(value) {
  return String(value || '').trim().toLowerCase();
}

function SupplyFilters({ filters, onChange, supplyTypes }) {
  return (
    <div className="kprofile-supply-filters kprofile-glass" role="search" aria-label="فیلترها">
      <label className="kprofile-supply-filters__field font-meem">
        <span>تاریخ</span>
        <input
          type="text"
          className="kprofile-supply-filters__input font-yekan"
          placeholder="مثلاً ۱۴۰۴/۰۱"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
        />
      </label>
      <label className="kprofile-supply-filters__field font-meem">
        <span>سفارش هدف</span>
        <input
          type="text"
          className="kprofile-supply-filters__input font-yekan"
          placeholder="کد سفارش"
          value={filters.orderCode}
          onChange={(e) => onChange({ ...filters, orderCode: e.target.value })}
        />
      </label>
      <label className="kprofile-supply-filters__field font-meem">
        <span>قیمت</span>
        <input
          type="text"
          className="kprofile-supply-filters__input font-yekan"
          placeholder="جستجو در مبلغ"
          value={filters.price}
          onChange={(e) => onChange({ ...filters, price: e.target.value })}
        />
      </label>
      <label className="kprofile-supply-filters__field font-meem">
        <span>نوع تامین</span>
        <select
          className="kprofile-supply-filters__input font-meem"
          value={filters.supplyType}
          onChange={(e) => onChange({ ...filters, supplyType: e.target.value })}
        >
          <option value="">همه</option>
          {supplyTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="kprofile-supply-filters__field font-meem kprofile-supply-filters__field--wide">
        <span>شرح</span>
        <input
          type="text"
          className="kprofile-supply-filters__input font-meem"
          placeholder="نام کالا یا توضیحات"
          value={filters.description}
          onChange={(e) => onChange({ ...filters, description: e.target.value })}
        />
      </label>
    </div>
  );
}

function applySupplyFilters(rows, filters) {
  const dateQ = formatFilterValue(filters.date);
  const orderQ = formatFilterValue(filters.orderCode);
  const priceQ = formatFilterValue(filters.price);
  const typeQ = String(filters.supplyType || '').trim();
  const descQ = formatFilterValue(filters.description);

  return rows.filter((row) => {
    if (dateQ && !formatFilterValue(row.date).includes(dateQ)) return false;
    if (orderQ && !formatFilterValue(row.orderCode).includes(orderQ)) return false;
    if (priceQ && !formatFilterValue(row.unitPriceLabel).includes(priceQ)
      && !String(row.unitPrice ?? '').includes(filters.price.trim())) return false;
    if (typeQ && String(row.supplyType || '') !== typeQ) return false;
    if (descQ) {
      const blob = `${row.productName || ''} ${row.description || ''} ${row.notes || ''}`;
      if (!formatFilterValue(blob).includes(descQ)) return false;
    }
    return true;
  });
}

const EMPTY_FILTERS = {
  date: '',
  orderCode: '',
  price: '',
  supplyType: '',
  description: '',
};

function SupplyRowCard({ row, returnTo, returnName }) {
  const orderPath = `/nabz/order/${encodeURIComponent(row.orderCode)}`;
  return (
    <Link
      to={withReturnParams(orderPath, returnTo, returnName)}
      className="kprofile-supply-row"
    >
      <div className="kprofile-supply-row__main">
        <span className="kprofile-supply-row__product font-meem">{row.productName}</span>
        {row.description ? (
          <span className="kprofile-supply-row__desc font-meem">{row.description}</span>
        ) : null}
      </div>
      <span className="kprofile-supply-row__order font-yekan">
        <EntityMentionText text={row.orderCode} returnTo={returnTo} returnName={returnName} />
      </span>
      <span className="kprofile-supply-row__date font-yekan">{row.date || '—'}</span>
      <span className="kprofile-supply-row__price font-yekan">{row.unitPriceLabel}</span>
      <span className="kprofile-supply-row__type font-meem">{row.supplyType}</span>
    </Link>
  );
}

export function SupplierPurchaseOrdersPanel({ contact }) {
  const { orders } = useNabzOrders();
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const rows = useMemo(
    () => listSupplierPurchaseOrders(contact.id, orders),
    [contact.id, orders],
  );
  const filtered = useMemo(() => applySupplyFilters(rows, filters), [rows, filters]);
  const supplyTypes = useMemo(
    () => [...new Set(rows.map((r) => r.supplyType).filter((t) => t && t !== '—'))],
    [rows],
  );

  const returnTo = `/kanoon/contact/${contact.id}?tab=purchases`;
  const returnName = getDisplayName(contact) || 'پروفایل تامین‌کننده';

  return (
    <div className="kprofile-supply-hub">
      <ProfileTabSectionHeader
        title="سفارشات خرید"
        subtitle="سفارش‌های خرید و خطوط تدارک مرتبط با این تامین‌کننده"
        Icon={Package}
      />
      <SupplyFilters filters={filters} onChange={setFilters} supplyTypes={supplyTypes} />
      {!filtered.length ? (
        <div className="kprofile-empty font-meem">
          {rows.length ? 'موردی با این فیلترها پیدا نشد.' : 'سفارش خریدی برای این تامین‌کننده ثبت نشده است.'}
        </div>
      ) : (
        <div className="kprofile-supply-list" role="list">
          <div className="kprofile-supply-list__head font-meem" aria-hidden="true">
            <span>کالا / شرح</span>
            <span>سفارش هدف</span>
            <span>تاریخ</span>
            <span>قیمت</span>
            <span>نوع تامین</span>
          </div>
          {filtered.map((row) => (
            <SupplyRowCard
              key={row.id}
              row={row}
              returnTo={returnTo}
              returnName={returnName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SupplierInquiriesPanel({ contact }) {
  const { orders } = useNabzOrders();
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const rows = useMemo(
    () => listSupplierInquiries(contact.id, orders),
    [contact.id, orders],
  );
  const filtered = useMemo(() => applySupplyFilters(rows, filters), [rows, filters]);
  const supplyTypes = useMemo(
    () => [...new Set(rows.map((r) => r.supplyType).filter((t) => t && t !== '—'))],
    [rows],
  );

  const returnTo = `/kanoon/contact/${contact.id}?tab=inquiries`;
  const returnName = getDisplayName(contact) || 'پروفایل تامین‌کننده';

  return (
    <div className="kprofile-supply-hub">
      <ProfileTabSectionHeader
        title="استعلام‌ها"
        subtitle="استعلام‌های قیمت و نوع تامین ثبت‌شده برای این تامین‌کننده"
        Icon={Search}
      />
      <SupplyFilters filters={filters} onChange={setFilters} supplyTypes={supplyTypes} />
      {!filtered.length ? (
        <div className="kprofile-empty font-meem">
          {rows.length ? 'موردی با این فیلترها پیدا نشد.' : 'استعلامی برای این تامین‌کننده ثبت نشده است.'}
        </div>
      ) : (
        <div className="kprofile-supply-list" role="list">
          <div className="kprofile-supply-list__head font-meem" aria-hidden="true">
            <span>کالا / شرح</span>
            <span>سفارش هدف</span>
            <span>تاریخ</span>
            <span>قیمت</span>
            <span>نوع تامین</span>
          </div>
          {filtered.map((row) => (
            <SupplyRowCard
              key={row.id}
              row={row}
              returnTo={returnTo}
              returnName={returnName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

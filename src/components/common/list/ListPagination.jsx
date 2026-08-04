import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { LIST_PAGE_SIZES } from '../../../hooks/list/usePagination';
import './list-infra.css';

function buildPageWindow(currentPage, pageCount, windowSize = 5) {
  if (pageCount <= windowSize) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  let end = start + windowSize - 1;
  if (end > pageCount) {
    end = pageCount;
    start = Math.max(1, end - windowSize + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Shared list pagination footer — RTL, tokenized, reusable.
 */
export default function ListPagination({
  currentPage,
  pageSize,
  pageCount,
  totalItems,
  rangeStart,
  rangeEnd,
  pageSizes = LIST_PAGE_SIZES,
  setPage,
  setPageSize,
  className = '',
}) {
  const pages = buildPageWindow(currentPage, pageCount);
  const disabledPrev = currentPage <= 1;
  const disabledNext = currentPage >= pageCount;

  return (
    <footer
      className={`jarian-list-pagination font-meem${className ? ` ${className}` : ''}`}
      dir="rtl"
      aria-label="صفحه‌بندی فهرست"
    >
      <div className="jarian-list-pagination__summary font-yekan">
        {totalItems === 0
          ? 'هیچ رکوردی نیست'
          : `نمایش ${rangeStart.toLocaleString('fa-IR')}–${rangeEnd.toLocaleString('fa-IR')} از ${totalItems.toLocaleString('fa-IR')} رکورد`}
      </div>

      <div className="jarian-list-pagination__controls">
        <label className="jarian-list-pagination__size font-meem">
          <span>تعداد در صفحه</span>
          <select
            className="jarian-list-pagination__size-select font-yekan"
            value={pageSize}
            onChange={(event) => setPageSize?.(Number(event.target.value))}
            aria-label="تعداد ردیف در صفحه"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size.toLocaleString('fa-IR')}</option>
            ))}
          </select>
        </label>

        <div className="jarian-list-pagination__nav" role="group" aria-label="ناوبری صفحات">
          <button
            type="button"
            className="jarian-list-pagination__btn"
            disabled={disabledPrev}
            onClick={() => setPage?.(1)}
            aria-label="اولین صفحه"
          >
            <ChevronsRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="jarian-list-pagination__btn"
            disabled={disabledPrev}
            onClick={() => setPage?.(currentPage - 1)}
            aria-label="صفحه قبل"
          >
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`jarian-list-pagination__page font-yekan${page === currentPage ? ' is-active' : ''}`}
              aria-current={page === currentPage ? 'page' : undefined}
              onClick={() => setPage?.(page)}
            >
              {page.toLocaleString('fa-IR')}
            </button>
          ))}

          <button
            type="button"
            className="jarian-list-pagination__btn"
            disabled={disabledNext}
            onClick={() => setPage?.(currentPage + 1)}
            aria-label="صفحه بعد"
          >
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="jarian-list-pagination__btn"
            disabled={disabledNext}
            onClick={() => setPage?.(pageCount)}
            aria-label="آخرین صفحه"
          >
            <ChevronsLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}

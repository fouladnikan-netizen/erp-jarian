/**
 * Virtual spacer rows — keeps native <table> API while windowing body rows.
 */
export function VirtualSpacerRows({ virtual, colSpan }) {
  if (!virtual) return null;
  return (
    <>
      {virtual.offsetTop > 0 ? (
        <tr className="jarian-virtual-spacer" aria-hidden="true">
          <td colSpan={colSpan} style={{ height: virtual.offsetTop, padding: 0, border: 0 }} />
        </tr>
      ) : null}
    </>
  );
}

export function VirtualSpacerBottom({ virtual, colSpan }) {
  if (!virtual || virtual.offsetBottom <= 0) return null;
  return (
    <tr className="jarian-virtual-spacer" aria-hidden="true">
      <td colSpan={colSpan} style={{ height: virtual.offsetBottom, padding: 0, border: 0 }} />
    </tr>
  );
}

export function InfiniteSentinelRow({ show, sentinelRef, colSpan, loading, hasMore }) {
  if (!show) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="jarian-infinite-sentinel font-meem">
        <div ref={sentinelRef} className="jarian-infinite-sentinel__inner">
          {loading ? 'در حال بارگذاری…' : hasMore ? 'اسکرول برای موارد بیشتر' : 'پایان فهرست'}
        </div>
      </td>
    </tr>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { UserRepository } from '../../../../../api/repositories/UserRepository';
import { getApiErrorMessage } from '../../../../../api/apiErrors';
import { ORG_POSITION_SUGGESTIONS, collectUserIds, findNodeById } from '../treeUtils';
import { useOrganizationStore } from '../store/organizationStore';

export default function AssignUserDialog() {
  const parentId = useOrganizationStore((s) => s.assignPickerParentId);
  const tree = useOrganizationStore((s) => s.tree);
  const closeAssignPicker = useOrganizationStore((s) => s.closeAssignPicker);
  const assignUser = useOrganizationStore((s) => s.assignUser);
  const assignedIds = useMemo(() => collectUserIds(tree), [tree]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState('');
  const [position, setPosition] = useState('کارشناس فروش');
  const [isManager, setIsManager] = useState(false);

  const parent = useMemo(
    () => (parentId ? findNodeById(tree, parentId) : null),
    [tree, parentId],
  );

  useEffect(() => {
    if (!parentId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUserId('');
    setPosition('کارشناس فروش');
    setIsManager(false);
    UserRepository.listUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'بارگذاری کاربران ناموفق بود.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  if (!parentId) return null;

  const assignable = users.filter((user) => user.isActive !== false);

  const submit = (event) => {
    event.preventDefault();
    const selected = users.find((user) => user.id === userId);
    if (!selected) return;
    assignUser(parentId, selected, { position: position.trim(), isManager });
  };

  return (
    <div className="org-confirm" role="dialog" aria-modal="true" aria-labelledby="org-assign-title">
      <form className="org-confirm__card org-confirm__card--wide" onSubmit={submit}>
        <h3 id="org-assign-title" className="org-confirm__title font-meem">
          انتساب کاربر واقعی
        </h3>
        <p className="org-confirm__text font-meem">
          واحد: {parent?.name || '—'} — هویت از جدول کاربران است؛ کاربر ساختگی ایجاد نمی‌شود.
        </p>
        {loading ? <p className="org-confirm__meta font-meem">در حال بارگذاری کاربران…</p> : null}
        {error ? <p className="org-confirm__meta font-meem">{error}</p> : null}
        <label className="org-drawer__field font-meem">
          کاربر
          <select
            className="org-drawer__input font-meem"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            required
            disabled={loading || !assignable.length}
          >
            <option value="">انتخاب کاربر</option>
            {assignable.map((user) => (
              <option key={user.id} value={user.id}>
              {user.fullName || user.displayName}
                {user.mobile ? ` — ${user.mobile}` : ''}
                {assignedIds.includes(user.id) ? ' — انتقال' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="org-drawer__field font-meem">
          سمت سازمانی
          <input
            className="org-drawer__input font-meem"
            list="org-position-suggestions"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
        </label>
        <datalist id="org-position-suggestions">
          {ORG_POSITION_SUGGESTIONS.map((title) => (
            <option key={title} value={title} />
          ))}
        </datalist>
        <label className="org-drawer__check font-meem">
          <input
            type="checkbox"
            checked={isManager}
            onChange={(event) => setIsManager(event.target.checked)}
          />
          مدیر این واحد
        </label>
        {!assignable.length && !loading ? (
          <p className="org-confirm__meta font-meem">کاربر فعالی برای انتساب وجود ندارد.</p>
        ) : null}
        <div className="org-confirm__actions">
          <button type="button" className="org-toolbar__btn font-meem" onClick={closeAssignPicker}>
            انصراف
          </button>
          <button
            type="submit"
            className="org-toolbar__btn org-toolbar__btn--primary font-meem"
            disabled={!userId || loading}
          >
            انتساب
          </button>
        </div>
      </form>
    </div>
  );
}

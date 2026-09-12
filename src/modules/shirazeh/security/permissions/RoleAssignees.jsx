import { toPersianDigits } from '../../../../utils/numberUtils';
import { countRoleAssignees } from './countRoleAssignees';

/**
 * Compact assigned-user list for the selected role (read-only).
 */
export default function RoleAssignees({ users, loading }) {
  const { active, inactive, total } = countRoleAssignees(users);

  if (loading && total === 0) {
    return (
      <p className="role-mgmt__assignees-empty font-meem">در حال بارگذاری کاربران…</p>
    );
  }

  if (total === 0) {
    return (
      <p className="role-mgmt__assignees-empty font-meem" role="status">
        این نقش به هیچ کاربری اختصاص داده نشده است.
      </p>
    );
  }

  return (
    <div className="role-mgmt__assignees">
      <div className="role-mgmt__assignees-summary font-meem" role="status">
        <p>{toPersianDigits(active)} کاربر فعال</p>
        <p>{toPersianDigits(inactive)} کاربر غیرفعال</p>
      </div>
      <h4 className="role-mgmt__assignees-title font-meem">کاربران دارای این نقش</h4>
      <ul className="role-mgmt__assignees-list">
        {users.map((user) => {
          const activeUser = user.isActive !== false;
          return (
            <li key={user.id} className="role-mgmt__assignee">
              <div className="role-mgmt__assignee-copy">
                <span className="role-mgmt__assignee-name font-meem">
                  {user.displayName || user.username}
                </span>
                <span className="role-mgmt__assignee-user font-yekan" dir="ltr">
                  {user.username}
                </span>
              </div>
              <span
                className={`shirazeh-users-status ${activeUser ? 'shirazeh-users-status--active' : 'shirazeh-users-status--inactive'}`}
              >
                {activeUser ? 'فعال' : 'غیرفعال'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

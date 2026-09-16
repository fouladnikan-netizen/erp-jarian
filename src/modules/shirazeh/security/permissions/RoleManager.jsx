import RoleList from './RoleList';
import RoleDetails from './RoleDetails';
import PermissionMatrix from './PermissionMatrix';
import CreateRoleModal from './CreateRoleModal';
import EditRoleModal from './EditRoleModal';
import '../../users/users.css';

export default function RoleManager() {
  return (
    <div className="role-mgmt" dir="rtl">
      <RoleList />
      <div className="role-mgmt__main">
        <RoleDetails />
        <PermissionMatrix />
      </div>
      <CreateRoleModal />
      <EditRoleModal />
    </div>
  );
}

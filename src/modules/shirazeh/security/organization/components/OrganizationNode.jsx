import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useOrganizationStore } from '../store/organizationStore';

function MemberBadge({ count }) {
  return (
    <span className="org-node__meta font-yekan">
      <Users size={12} strokeWidth={1.75} aria-hidden="true" />
      {Number(count || 0).toLocaleString('fa-IR')} نفر
    </span>
  );
}

export const DepartmentNode = memo(function DepartmentNode({ id, data, selected }) {
  const selectNode = useOrganizationStore((s) => s.selectNode);
  const addUser = useOrganizationStore((s) => s.addUser);
  const deleteNode = useOrganizationStore((s) => s.deleteNode);

  return (
    <div
      className={`org-node org-node--department${selected ? ' org-node--selected' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        selectNode(id);
      }}
    >
      <Handle type="target" position={Position.Top} className="org-node__handle" />
      <div className="org-node__body">
        <span className="org-node__icon" aria-hidden="true">
          <Building2 size={16} strokeWidth={1.75} />
        </span>
        <div className="org-node__text">
          <p className="org-node__title font-meem">{data.name}</p>
          <MemberBadge count={data.memberCount} />
        </div>
      </div>
      <div className="org-node__actions">
        <button
          type="button"
          className="org-node__action"
          title="ویرایش"
          onClick={(event) => {
            event.stopPropagation();
            selectNode(id);
          }}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="org-node__action"
          title="افزودن کاربر"
          onClick={(event) => {
            event.stopPropagation();
            addUser(id);
          }}
        >
          <UserPlus size={13} strokeWidth={1.75} />
        </button>
        {id !== 'root' ? (
          <button
            type="button"
            className="org-node__action org-node__action--danger"
            title="حذف"
            onClick={(event) => {
              event.stopPropagation();
              deleteNode(id);
            }}
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="org-node__handle" />
    </div>
  );
});

export const UserNode = memo(function UserNode({ id, data, selected }) {
  const selectNode = useOrganizationStore((s) => s.selectNode);
  const deleteNode = useOrganizationStore((s) => s.deleteNode);
  const initials = String(data.name || '؟')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <div
      className={`org-node org-node--user${selected ? ' org-node--selected' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        selectNode(id);
      }}
    >
      <Handle type="target" position={Position.Top} className="org-node__handle" />
      <div className="org-node__body">
        <span className="org-node__avatar font-meem" aria-hidden="true">
          {initials}
        </span>
        <div className="org-node__text">
          <p className="org-node__title font-meem">{data.name}</p>
          <p className="org-node__subtitle font-meem">{data.position}</p>
          <p className="org-node__role font-yekan">{data.role}</p>
        </div>
      </div>
      <div className="org-node__actions">
        <button
          type="button"
          className="org-node__action"
          title="ویرایش"
          onClick={(event) => {
            event.stopPropagation();
            selectNode(id);
          }}
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="org-node__action org-node__action--danger"
          title="حذف"
          onClick={(event) => {
            event.stopPropagation();
            deleteNode(id);
          }}
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
});

export const organizationNodeTypes = {
  orgDepartment: DepartmentNode,
  orgUser: UserNode,
};

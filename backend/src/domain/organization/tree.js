/**
 * Organization tree projection (DDL-37).
 * Units + assignments → canvas department/user nodes.
 * User node id === users.id. Position ≠ Role.
 */

export const ROOT_UNIT_ID = 'ou_root';

export function mapUnitRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    code: row.code,
    name: row.name,
    sortOrder: Number(row.sort_order) || 0,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPositionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    unitId: row.unit_id,
    code: row.code || null,
    title: row.title,
    sortOrder: Number(row.sort_order) || 0,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssignmentRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    unitId: row.unit_id,
    positionId: row.position_id || null,
    positionTitle: row.position_title || null,
    isManager: row.is_manager === true,
    isPrimary: row.is_primary !== false,
    displayName: row.display_name || null,
    username: row.username || null,
    mobile: row.mobile || null,
    userIsActive: row.user_is_active !== false,
    unitName: row.unit_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildOrganizationTree(units, assignments) {
  const activeUnits = (Array.isArray(units) ? units : []).filter((u) => u.isActive !== false);
  const byParent = new Map();
  activeUnits.forEach((unit) => {
    const key = unit.parentId || '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(unit);
  });
  byParent.forEach((list) => list.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'fa')));

  const peopleByUnit = new Map();
  (Array.isArray(assignments) ? assignments : []).forEach((row) => {
    if (!peopleByUnit.has(row.unitId)) peopleByUnit.set(row.unitId, []);
    peopleByUnit.get(row.unitId).push(row);
  });

  function unitNode(unit) {
    const childUnits = byParent.get(unit.id) || [];
    const people = peopleByUnit.get(unit.id) || [];
    people.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), 'fa'));
    return {
      id: unit.id,
      type: 'department',
      name: unit.name,
      code: unit.code,
      sortOrder: unit.sortOrder,
      isActive: unit.isActive !== false,
      children: [
        ...childUnits.map(unitNode),
        ...people.map((person) => ({
          id: person.userId,
          type: 'user',
          userId: person.userId,
          name: person.displayName || person.username || person.userId,
          username: person.username || '',
          mobile: person.mobile || '',
          position: person.positionTitle || '',
          positionId: person.positionId || null,
          isManager: person.isManager === true,
          userIsActive: person.userIsActive !== false,
        })),
      ],
    };
  }

  const root = activeUnits.find((u) => u.id === ROOT_UNIT_ID)
    || activeUnits.find((u) => !u.parentId)
    || null;
  if (!root) {
    return {
      id: ROOT_UNIT_ID,
      type: 'department',
      name: 'سازمان',
      code: 'ROOT',
      sortOrder: 0,
      isActive: true,
      children: [],
    };
  }
  return unitNode(root);
}

export function flattenTreeUnits(node, parentId = null, acc = []) {
  if (!node || node.type === 'user') return acc;
  acc.push({
    id: node.id,
    parentId,
    name: node.name,
    code: node.code || '',
    sortOrder: node.sortOrder || acc.length,
    isActive: node.isActive !== false,
  });
  (node.children || []).forEach((child) => {
    if (child.type !== 'user') flattenTreeUnits(child, node.id, acc);
  });
  return acc;
}

export function flattenTreeAssignments(node, acc = []) {
  if (!node) return acc;
  (node.children || []).forEach((child) => {
    if (child.type === 'user') {
      acc.push({
        userId: child.userId || child.id,
        unitId: node.id,
        positionTitle: child.position || '',
        positionId: child.positionId || null,
        isManager: child.isManager === true,
        isPrimary: true,
      });
    } else if (child.type === 'department') {
      flattenTreeAssignments(child, acc);
    }
  });
  return acc;
}

/**
 * Mock organization hierarchy for Shirazeh Security → Organization Designer.
 *
 * Concepts (do not mix):
 * - type "department" | "user"
 * - position = organizational job title (Persian label for humans)
 * - role = system RBAC code (SALES_MANAGER, …) — independent from position
 */

export const ORGANIZATION_TREE = {
  id: 'root',
  type: 'department',
  name: 'مدیرعامل',
  defaultRole: 'ORG_ADMIN',
  children: [
    {
      id: 'sales',
      type: 'department',
      name: 'فروش',
      defaultRole: 'SALES_EXPERT',
      children: [
        {
          id: 'sales-mgmt',
          type: 'department',
          name: 'مدیریت فروش',
          defaultRole: 'SALES_MANAGER',
          children: [
            {
              id: 'user-sara',
              type: 'user',
              name: 'سارا موسوی',
              position: 'مدیر فروش',
              role: 'SALES_MANAGER',
            },
          ],
        },
        {
          id: 'user-ali',
          type: 'user',
          name: 'علی احمدی',
          position: 'کارشناس فروش',
          role: 'SALES_EXPERT',
        },
        {
          id: 'user-hossein',
          type: 'user',
          name: 'حسین کریمی',
          position: 'کارشناس فروش',
          role: 'SALES_EXPERT',
        },
      ],
    },
    {
      id: 'procurement',
      type: 'department',
      name: 'تأمین',
      defaultRole: 'PROCUREMENT_EXPERT',
      children: [
        {
          id: 'user-maryam',
          type: 'user',
          name: 'مریم احمدی',
          position: 'کارشناس تأمین',
          role: 'PROCUREMENT_EXPERT',
        },
      ],
    },
    {
      id: 'ops',
      type: 'department',
      name: 'عملیات',
      defaultRole: 'OPS_COORDINATOR',
      children: [
        {
          id: 'user-reza',
          type: 'user',
          name: 'رضا نوری',
          position: 'هماهنگ‌کننده عملیات',
          role: 'OPS_COORDINATOR',
        },
      ],
    },
  ],
};

export function cloneOrganizationTree(tree = ORGANIZATION_TREE) {
  return structuredClone(tree);
}

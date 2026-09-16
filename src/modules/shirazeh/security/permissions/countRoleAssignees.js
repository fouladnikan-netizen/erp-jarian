export function countRoleAssignees(users = []) {
  let active = 0;
  let inactive = 0;
  for (const user of users) {
    if (user?.isActive) active += 1;
    else inactive += 1;
  }
  return { active, inactive, total: active + inactive };
}

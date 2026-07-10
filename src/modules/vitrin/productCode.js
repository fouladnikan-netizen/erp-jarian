function pad(value, length) {
  return String(value).padStart(length, '0');
}

export function formatProductCode(groupId, subgroupId, serial) {
  return `${pad(groupId, 2)}${pad(subgroupId, 2)}${pad(serial, 3)}`;
}

export function nextSerial(products, groupId, subgroupId, excludeId = null) {
  const matches = products.filter(
    (p) => p.groupId === groupId && p.subgroupId === subgroupId && p.id !== excludeId,
  );
  if (!matches.length) return 1;
  return Math.max(...matches.map((p) => p.serial)) + 1;
}

export function buildProductCode(products, groupId, subgroupId, excludeId = null) {
  const serial = nextSerial(products, groupId, subgroupId, excludeId);
  return { serial, code: formatProductCode(groupId, subgroupId, serial) };
}

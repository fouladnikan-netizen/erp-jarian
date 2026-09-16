/**
 * Merge Linka linkaIdentity into Kanoon officialSpecs / governance for display.
 * Does not overwrite user-edited fields.
 */
export function enrichLegalFieldsFromPayload(payload = {}) {
  const linka = payload?.linkaIdentity;
  const gazette = payload?.linkaGazette;
  const officialSpecs = { ...(payload.officialSpecs || {}) };
  const setIfEmpty = (key, value) => {
    if (value == null || value === '') return;
    if (!officialSpecs[key]) officialSpecs[key] = String(value);
  };

  if (linka && typeof linka === 'object') {
    setIfEmpty('registrationNumber', linka.registrationNumber);
    setIfEmpty('establishmentDate', linka.registrationDate);
    setIfEmpty('economicCode', linka.economicCode);
    setIfEmpty('postalCode', linka.postalCode);
    setIfEmpty('latestCapital', linka.registeredCapital);
    setIfEmpty('address', linka.address);
    setIfEmpty('companyType', linka.companyType);
    setIfEmpty('companyStatus', linka.legalStatus);
    setIfEmpty('city', linka.city);
  }

  if (gazette && typeof gazette === 'object') {
    setIfEmpty('latestGazette', gazette.latestSummary);
  }

  const governance = { ...(payload.governance || {}) };
  if (linka && typeof linka === 'object' && !governance.signatureRight && linka.signatureAuthority) {
    governance.signatureRight = String(linka.signatureAuthority);
  }

  return {
    ...payload,
    officialSpecs,
    governance,
  };
}

export default { enrichLegalFieldsFromPayload };

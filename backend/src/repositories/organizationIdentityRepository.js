/**
 * Organization Identity PostgreSQL adapter — SQL only. DDL-28 / DDL-31 / DDL-32 / DDL-33.
 */
import { query } from '../db/pool.js';
import { presentIdentityCollections } from '../domain/organizationIdentity/collections.js';

export const ORG_IDENTITY_ID = 'org';

function asList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapLogoMeta(row) {
  if (!row?.logo_file_id) return null;
  return {
    fileName: row.logo_file_name || '',
    mimeType: row.logo_mime_type || '',
    sizeBytes: Number(row.logo_size_bytes) || 0,
  };
}

function mapRow(row) {
  if (!row) return null;
  const logoFileId = row.logo_file_id || null;
  const presented = presentIdentityCollections({
    phones: asList(row.phones),
    addresses: asList(row.addresses),
    bankAccounts: asList(row.bank_accounts),
    phone: row.phone,
    province: row.province,
    city: row.city,
    officialAddress: row.official_address,
    postalCode: row.postal_code,
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    iban: row.iban,
    legalName: row.legal_name,
  });
  return {
    tradeName: row.trade_name ?? '',
    legalName: row.legal_name ?? '',
    nationalId: row.national_id ?? '',
    legalPersonType: row.legal_person_type ?? '',
    registrationNumber: row.registration_number ?? '',
    economicNumber: row.economic_number ?? '',
    phones: presented.phones,
    addresses: presented.addresses,
    bankAccounts: presented.bankAccounts,
    phone: presented.phone,
    email: row.email ?? '',
    website: row.website ?? '',
    fax: row.fax ?? '',
    province: presented.province,
    city: presented.city,
    officialAddress: presented.officialAddress,
    postalCode: presented.postalCode,
    bankName: presented.bankName,
    bankAccountNumber: presented.bankAccountNumber,
    iban: presented.iban,
    logoFileId,
    logo: mapLogoMeta(row),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

const IDENTITY_SELECT = `
  SELECT i.*,
    l.file_name AS logo_file_name,
    l.mime_type AS logo_mime_type,
    l.size_bytes AS logo_size_bytes
  FROM organization_identity i
  LEFT JOIN organization_identity_logo l ON l.id = i.logo_file_id
  WHERE i.id = $1
`;

function runner(client) {
  return client ? client.query.bind(client) : query;
}

export async function get(client = null) {
  const run = runner(client);
  const res = await run(IDENTITY_SELECT, [ORG_IDENTITY_ID]);
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function upsert(fields, actorUserId) {
  await query(
    `INSERT INTO organization_identity (
       id, trade_name, legal_name, national_id,
       registration_number, economic_number,
       phone, email, website, fax,
       province, city, official_address, postal_code,
       bank_name, bank_account_number, iban,
       phones, addresses, bank_accounts,
       updated_by
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6,
       $7, $8, $9, $10,
       $11, $12, $13, $14,
       $15, $16, $17,
       $18::jsonb, $19::jsonb, $20::jsonb,
       $21
     )
     ON CONFLICT (id) DO UPDATE SET
       trade_name = EXCLUDED.trade_name,
       legal_name = EXCLUDED.legal_name,
       national_id = EXCLUDED.national_id,
       registration_number = EXCLUDED.registration_number,
       economic_number = EXCLUDED.economic_number,
       phone = EXCLUDED.phone,
       email = EXCLUDED.email,
       website = EXCLUDED.website,
       fax = EXCLUDED.fax,
       province = EXCLUDED.province,
       city = EXCLUDED.city,
       official_address = EXCLUDED.official_address,
       postal_code = EXCLUDED.postal_code,
       bank_name = EXCLUDED.bank_name,
       bank_account_number = EXCLUDED.bank_account_number,
       iban = EXCLUDED.iban,
       phones = EXCLUDED.phones,
       addresses = EXCLUDED.addresses,
       bank_accounts = EXCLUDED.bank_accounts,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [
      ORG_IDENTITY_ID,
      fields.tradeName,
      fields.legalName,
      fields.nationalId,
      fields.registrationNumber,
      fields.economicNumber,
      fields.phone,
      fields.email,
      fields.website,
      fields.fax,
      fields.province,
      fields.city,
      fields.officialAddress,
      fields.postalCode,
      fields.bankName,
      fields.bankAccountNumber,
      fields.iban,
      JSON.stringify(fields.phones || []),
      JSON.stringify(fields.addresses || []),
      JSON.stringify(fields.bankAccounts || []),
      actorUserId || null,
    ],
  );
  return get();
}

export async function getLogo(client = null) {
  const run = runner(client);
  const identity = await get(client);
  if (!identity?.logoFileId) return null;
  const res = await run(
    `SELECT id, file_name, mime_type, size_bytes, data_base64
     FROM organization_identity_logo WHERE id = $1`,
    [identity.logoFileId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes) || 0,
    dataBase64: row.data_base64,
  };
}

export async function insertLogo({ id, fileName, mimeType, sizeBytes, dataBase64, actorUserId }, client) {
  const run = runner(client);
  await run(
    `INSERT INTO organization_identity_logo (
       id, file_name, mime_type, size_bytes, data_base64, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, fileName, mimeType, sizeBytes, dataBase64, actorUserId || null],
  );
}

export async function pointLogo(logoId, actorUserId, client) {
  const run = runner(client);
  await run(
    `UPDATE organization_identity
     SET logo_file_id = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $1`,
    [ORG_IDENTITY_ID, logoId, actorUserId || null],
  );
}

export async function readLogoFileId(client) {
  const run = runner(client);
  const res = await run(
    `SELECT logo_file_id FROM organization_identity WHERE id = $1`,
    [ORG_IDENTITY_ID],
  );
  return res.rows[0]?.logo_file_id || null;
}

export async function deleteLogo(logoId, client) {
  if (!logoId) return;
  const run = runner(client);
  await run(`DELETE FROM organization_identity_logo WHERE id = $1`, [logoId]);
}

export default {
  get,
  upsert,
  getLogo,
  insertLogo,
  pointLogo,
  readLogoFileId,
  deleteLogo,
  ORG_IDENTITY_ID,
};

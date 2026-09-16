/**
 * Idempotent Persona seed (DDL-42). Inserts missing codes only.
 * Never UPDATEs name/domain — edited rows survive re-seed.
 */
import { INITIAL_PERSONAS } from '../domain/persona/initialPersonas.js';

export async function seedInitialPersonas(queryFn) {
  for (const persona of INITIAL_PERSONAS) {
    await queryFn(
      `INSERT INTO personas (id, code, name, domain, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (code) DO NOTHING`,
      [persona.id, persona.code, persona.name, persona.domain],
    );
  }
}

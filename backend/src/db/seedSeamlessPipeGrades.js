/**
 * Idempotent: append seamless mill grades onto the shared `grade` ENUM and
 * bind that subset to لوله مانیسمان. Does not create a new Attribute Definition.
 */
import {
  SEAMLESS_PIPE_GRADE_BINDING,
  SEAMLESS_PIPE_GRADE_OPTIONS,
  SEAMLESS_PIPE_GRADE_VALUES,
  SEAMLESS_PIPE_TYPE_NAME,
} from '../domain/productMaster/seamlessPipeCatalog.js';
import * as attrService from '../services/attributeDefinitionService.js';
import * as taxonomyService from '../services/productTaxonomyService.js';

const GRADE_CODE = 'grade';

function mergeEnumOptions(existing, additions) {
  const next = [...(existing || [])];
  const have = new Set(next.map((item) => item.value));
  let added = 0;
  for (const item of additions) {
    if (have.has(item.value)) continue;
    next.push(item);
    have.add(item.value);
    added += 1;
  }
  return { options: next, added };
}

function sameSubset(current, wanted) {
  const a = [...(current || [])].map(String);
  const b = [...(wanted || [])].map(String);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export async function seedSeamlessPipeGrades(actorUserId) {
  const defs = await attrService.listDefinitions({ includeInactive: true });
  const definition = defs.find((row) => row.code === GRADE_CODE);
  if (!definition) {
    throw new Error('attribute definition grade is missing — do not create a second grade');
  }

  const merged = mergeEnumOptions(definition.allowedValues, SEAMLESS_PIPE_GRADE_OPTIONS);
  let grade = definition;
  if (merged.added) {
    grade = await attrService.updateDefinition(definition.id, {
      allowedValues: merged.options,
    }, actorUserId);
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const type = types.find((row) => row.name === SEAMLESS_PIPE_TYPE_NAME);
  if (!type) {
    return {
      added: merged.added,
      bound: false,
      missingType: SEAMLESS_PIPE_TYPE_NAME,
      definitionId: grade.id,
    };
  }

  const schema = await attrService.getEffectiveSchema(type.id, { includeInactive: true });
  const existing = schema.find((entry) => entry.definition.id === grade.id);
  const subsetUnchanged = sameSubset(
    existing?.binding?.overrideAllowedValues,
    SEAMLESS_PIPE_GRADE_VALUES,
  );
  const flagsMatch = existing?.binding
    && existing.binding.isActive !== false
    && existing.binding.isRequired === SEAMLESS_PIPE_GRADE_BINDING.isRequired
    && existing.binding.valueScope === SEAMLESS_PIPE_GRADE_BINDING.valueScope;
  if (existing?.binding?.id && subsetUnchanged && flagsMatch) {
    return {
      added: merged.added,
      bound: true,
      alreadyOk: true,
      typeId: type.id,
      definitionId: grade.id,
    };
  }
  if (existing?.binding?.id) {
    await attrService.updateBinding(existing.binding.id, {
      isActive: true,
      ...SEAMLESS_PIPE_GRADE_BINDING,
    }, actorUserId);
  } else {
    await attrService.bindAttributeToType({
      productTypeId: type.id,
      attributeDefinitionId: grade.id,
      ...SEAMLESS_PIPE_GRADE_BINDING,
    }, actorUserId);
  }

  return {
    added: merged.added,
    bound: true,
    alreadyOk: false,
    typeId: type.id,
    definitionId: grade.id,
    subset: SEAMLESS_PIPE_GRADE_VALUES.length,
  };
}

export default { seedSeamlessPipeGrades };

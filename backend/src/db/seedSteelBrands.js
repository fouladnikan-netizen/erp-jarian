/**
 * Idempotent carbon-steel Brand seed. Inserts missing brands; binds
 * allowedBrandIds on matching Product Types when those types exist.
 * Never overwrites an existing brand's name/sku.
 */
import { STEEL_BRANDS, TYPE_BRAND_SKUS, TYPE_NAME_ALIASES } from '../domain/productMaster/steelBrandCatalog.js';
import { skuCodeKey } from '../domain/productMaster/skuCode.js';
import * as brandService from '../services/brandService.js';
import * as taxonomyService from '../services/productTaxonomyService.js';

export async function seedSteelBrands(actorUserId) {
  const created = [];
  const reused = [];
  const bySku = new Map();

  const existing = await brandService.listBrands({ includeInactive: true });
  const bySkuExisting = new Map(
    existing.filter((b) => b.skuCode).map((b) => [skuCodeKey(b.skuCode), b]),
  );

  for (const entry of STEEL_BRANDS) {
    const { exact } = await brandService.checkBrandDuplicate(entry.brandName);
    if (exact) {
      reused.push(exact);
      bySku.set(entry.skuCode, exact);
      continue;
    }
    const skuTaken = bySkuExisting.get(skuCodeKey(entry.skuCode));
    if (skuTaken) {
      throw new Error(
        `[seed-steel-brands] sku ${entry.skuCode} already used by «${skuTaken.brandName}»; cannot create «${entry.brandName}».`,
      );
    }
    const row = await brandService.createBrand(
      {
        brandName: entry.brandName,
        legalName: entry.legalName,
        nameLatin: entry.nameLatin || entry.skuCode,
        skuCode: entry.skuCode,
        confirmDuplicate: true,
      },
      actorUserId,
    );
    created.push(row);
    bySku.set(entry.skuCode, row);
    bySkuExisting.set(skuCodeKey(row.skuCode), row);
  }

  const types = await taxonomyService.listTypes({ includeInactive: true });
  const typeByName = new Map(types.map((t) => [t.name, t]));
  const bound = [];
  const missingTypes = [];

  for (const [rawName, skus] of Object.entries(TYPE_BRAND_SKUS)) {
    const typeName = TYPE_NAME_ALIASES[rawName] || rawName;
    const type = typeByName.get(typeName);
    if (!type) {
      missingTypes.push(typeName);
      continue;
    }
    const current = Array.isArray(type.allowedBrandIds) ? type.allowedBrandIds : [];
    if (current.length) continue;
    const allowedBrandIds = skus.map((sku) => {
      const brand = bySku.get(sku);
      if (!brand) throw new Error(`[seed-steel-brands] catalog brand ${sku} was not resolved`);
      return brand.id;
    });
    const updated = await taxonomyService.updateType(type.id, { allowedBrandIds }, actorUserId);
    bound.push({ typeName, count: allowedBrandIds.length, id: updated.id });
  }

  return {
    created: created.length,
    reused: reused.length,
    total: STEEL_BRANDS.length,
    boundTypes: bound,
    missingTypes,
  };
}

export default { seedSteelBrands };

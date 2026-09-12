/**
 * Catalog invariants for the carbon-steel Brand seed (not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SKU_CODE_PATTERN } from '../domain/productMaster/skuCode.js';
import { normalizeBrandName } from '../domain/productMaster/normalize.js';
import {
  ALLOY_REBAR_BRAND_SKUS,
  ALLOY_REBAR_MILLS,
  COIL_REBAR_BRAND_SKUS,
  COIL_REBAR_MILLS,
  GALVANIZED_PIPE_BRAND_SKUS,
  GALVANIZED_PIPE_MILLS,
  GAS_TEST_PIPE_BRAND_SKUS,
  GAS_TEST_PIPE_MILLS,
  SPIRAL_PIPE_BRAND_SKUS,
  SPIRAL_PIPE_MILLS,
  STEEL_BRANDS,
  WATER_TEST_PIPE_BRAND_SKUS,
  WATER_TEST_PIPE_MILLS,
  WELL_CASING_PIPE_BRAND_SKUS,
  WELL_CASING_PIPE_MILLS,
  THERMAL_REBAR_BRAND_SKUS,
  THERMAL_REBAR_MILLS,
  TYPE_BRAND_SKUS,
  TYPE_NAME_ALIASES,
} from '../domain/productMaster/steelBrandCatalog.js';

describe('steel brand catalog', () => {
  it('has unique sku_code values that match the SKU pattern', () => {
    const seen = new Set();
    for (const brand of STEEL_BRANDS) {
      assert.match(brand.skuCode, SKU_CODE_PATTERN, brand.skuCode);
      const key = brand.skuCode.toUpperCase();
      assert.equal(seen.has(key), false, `duplicate sku ${brand.skuCode}`);
      seen.add(key);
    }
  });

  it('has unique normalized brand names', () => {
    const seen = new Set();
    for (const brand of STEEL_BRANDS) {
      const key = normalizeBrandName(brand.brandName);
      assert.ok(key, brand.brandName);
      assert.equal(seen.has(key), false, `duplicate name ${brand.brandName}`);
      seen.add(key);
    }
  });

  it('maps every type allow-list sku to a catalog brand', () => {
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b]));
    for (const [typeName, skus] of Object.entries(TYPE_BRAND_SKUS)) {
      const unique = new Set(skus);
      assert.equal(unique.size, skus.length, `duplicate sku on ${typeName}`);
      for (const sku of skus) {
        assert.ok(bySku.has(sku), `${typeName} → missing brand ${sku}`);
      }
    }
  });

  it('aliases ورق سیاه to the hot-rolled sheet type', () => {
    assert.equal(TYPE_NAME_ALIASES['ورق سیاه'], 'ورق ساده فولادی');
    assert.equal(TYPE_NAME_ALIASES['ورق آجدار'], 'ورق آجدار فولادی');
    assert.ok(TYPE_BRAND_SKUS['ورق ساده فولادی']?.length);
    assert.deepEqual(TYPE_BRAND_SKUS['ورق A283'], TYPE_BRAND_SKUS['ورق ساده فولادی']);
    assert.deepEqual(TYPE_BRAND_SKUS['ورق A36'], TYPE_BRAND_SKUS['ورق ساده فولادی']);
    assert.deepEqual(TYPE_BRAND_SKUS['ورق A516'], TYPE_BRAND_SKUS['ورق ST52']);
  });

  it('keeps گروه ملی, کوثر اهواز, and لوله‌سازی اهواز as three brands', () => {
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b.brandName]));
    assert.equal(bySku.get('INSIG'), 'گروه ملی');
    assert.equal(bySku.get('KOSAR'), 'کوثر اهواز');
    assert.equal(bySku.get('AHPIPE'), 'لوله‌سازی اهواز');
    assert.ok(TYPE_BRAND_SKUS['میلگرد آجدار'].includes('INSIG'));
    assert.ok(TYPE_BRAND_SKUS['میلگرد آجدار'].includes('KOSAR'));
    assert.ok(TYPE_BRAND_SKUS['تیرآهن IPE'].includes('KOSAR'));
    assert.equal(TYPE_BRAND_SKUS['تیرآهن IPE'].includes('INSIG'), false);
    assert.ok(TYPE_BRAND_SKUS['لوله مانیسمان'].includes('AHPIPE'));
    assert.equal(TYPE_BRAND_SKUS['لوله مانیسمان'].includes('INSIG'), false);
  });

  it('reuses existing mills for میلگرد کلاف and adds the missing six', () => {
    assert.deepEqual([...COIL_REBAR_BRAND_SKUS], [
      'ESCO', 'KAVIR', 'NATANZ', 'MALAYER', 'BOSTAN', 'EHTESH',
      'INSIG', 'ALIGUDARZ', 'SPIRAL', 'ARIAN', 'SAVEH', 'SHAMS', 'PERSIAN',
    ]);
    assert.equal(TYPE_BRAND_SKUS['میلگرد کلاف'], COIL_REBAR_BRAND_SKUS);
    assert.equal(TYPE_BRAND_SKUS['میلگرد آلیاژی'], ALLOY_REBAR_BRAND_SKUS);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b.brandName]));
    assert.equal(bySku.get('MALAYER'), 'فولاد ملایر');
    assert.equal(bySku.get('BOSTAN'), 'بستان آباد');
    assert.equal(bySku.get('EHTESH'), 'فولاد یزد (احتشامی)');
    assert.equal(bySku.get('ALIGUDARZ'), 'فولاد الیگودرز');
    assert.equal(bySku.get('SAVEH'), 'نورد ساوه');
    assert.equal(bySku.get('SHAMS'), 'فولاد شمس گلستان');
    assert.equal(bySku.get('YAZD'), 'فولاد یزد احرامیان');
    assert.notEqual(bySku.get('EHTESH'), bySku.get('YAZD'));
    assert.equal(COIL_REBAR_MILLS.filter((mill) => mill.existingBrandName).length, 7);
    assert.equal(COIL_REBAR_MILLS.filter((mill) => !mill.existingBrandName).length, 6);
  });

  it('binds the alloy-steel mill set to میلگرد آلیاژی, not the coil mills', () => {
    assert.deepEqual([...ALLOY_REBAR_BRAND_SKUS], [
      'IASCO', 'EIC', 'IASB', 'EHTESH', 'DSS', 'KRASNY',
      'CHINA', 'ASIL', 'BOHLER', 'POLDI', 'SEAH',
    ]);
    assert.equal(TYPE_BRAND_SKUS['میلگرد آلیاژی'], ALLOY_REBAR_BRAND_SKUS);
    assert.equal(ALLOY_REBAR_MILLS.filter((mill) => mill.existingBrandName).length, 1);
    assert.equal(ALLOY_REBAR_MILLS.filter((mill) => mill.skuCode === 'EHTESH')[0].existingBrandName, 'فولاد یزد (احتشامی)');
  });

  it('reuses existing mills for میلگرد حرارتی and adds هشترود', () => {
    assert.deepEqual([...THERMAL_REBAR_BRAND_SKUS], [
      'ESCO', 'KAVIR', 'NATANZ', 'KSC', 'BOSTAN', 'EHTESH',
      'INSIG', 'ARIAN', 'PERSIAN', 'MISCO', 'SIADAN', 'HASHTROOD',
    ]);
    assert.equal(TYPE_BRAND_SKUS['میلگرد حرارتی'], THERMAL_REBAR_BRAND_SKUS);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b.brandName]));
    assert.equal(bySku.get('HASHTROOD'), 'هشترود');
    assert.equal(bySku.get('MISCO'), 'فولاد آذربایجان');
    assert.equal(bySku.get('KSC'), 'فولاد خراسان');
    assert.equal(THERMAL_REBAR_MILLS.filter((mill) => mill.existingBrandName).length, 11);
    assert.equal(THERMAL_REBAR_MILLS.filter((mill) => !mill.existingBrandName).length, 1);
  });

  it('binds nine distinct spiral-pipe mills on لوله اسپیرال', () => {
    assert.deepEqual([...SPIRAL_PIPE_BRAND_SKUS], [
      'IRSPIRAL', 'KALUP', 'SAFA', 'SPPC', 'PGPIPE', 'ARYANAV', 'NEYZAR', 'SADID', 'ISSPIRAL',
    ]);
    assert.equal(TYPE_BRAND_SKUS['لوله اسپیرال'], SPIRAL_PIPE_BRAND_SKUS);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b]));
    assert.equal(bySku.get('IRSPIRAL').brandName, 'ایران اسپیرال');
    assert.equal(bySku.get('KALUP').brandName, 'کالوپ');
    assert.equal(bySku.get('SAFA').legalName, 'شرکت نورد و لوله صفا');
    assert.equal(bySku.get('SPPC').nameLatin, 'SPPC');
    assert.equal(bySku.get('PGPIPE').brandName, 'خلیج فارس');
    assert.equal(bySku.get('ARYANAV').brandName, 'آریا نورد خلیج فارس');
    assert.equal(bySku.get('NEYZAR').brandName, 'نیزار');
    assert.equal(bySku.get('SADID').nameLatin, 'Sadid Pipe');
    assert.equal(bySku.get('ISSPIRAL').brandName, 'اسپیرال اصفهان');
    assert.equal(bySku.get('SPIRAL').brandName, 'اسپیرال');
    assert.notEqual(bySku.get('ISSPIRAL').skuCode, bySku.get('SPIRAL').skuCode);
    assert.notEqual(bySku.get('SPPC').skuCode, bySku.get('PARDIS').skuCode);
    assert.notEqual(bySku.get('SADID').skuCode, bySku.get('AGS').skuCode);
    assert.notEqual(bySku.get('PGPIPE').skuCode, bySku.get('ATIYEH').skuCode);
    assert.equal(SPIRAL_PIPE_MILLS.every((mill) => mill.existingBrandName == null), true);
  });

  it('binds four galvanized-pipe mills and reuses SAVEH for ساوه', () => {
    assert.deepEqual([...GALVANIZED_PIPE_BRAND_SKUS], [
      'SEPANTA', 'SAVEH', 'SEPAHAN', 'QAZVIN',
    ]);
    assert.equal(TYPE_BRAND_SKUS['لوله گالوانیزه'], GALVANIZED_PIPE_BRAND_SKUS);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b]));
    assert.equal(bySku.get('SEPANTA').brandName, 'سپنتا');
    assert.equal(bySku.get('SEPANTA').nameLatin, 'Sepanta');
    assert.equal(bySku.get('SAVEH').brandName, 'نورد ساوه');
    assert.equal(bySku.get('SEPAHAN').brandName, 'سپاهان');
    assert.equal(bySku.get('SEPAHAN').nameLatin, 'Sepahan');
    assert.equal(bySku.get('QAZVIN').brandName, 'قزوین');
    assert.equal(bySku.get('QAZVIN').legalName, 'نورد و لوله قزوین');
    assert.equal(bySku.get('QAZVIN').nameLatin, 'Qazvin Pipe');
    assert.notEqual(bySku.get('SEPAHAN').skuCode, bySku.get('SEPEHR').skuCode);
    const savehMill = GALVANIZED_PIPE_MILLS.find((mill) => mill.skuCode === 'SAVEH');
    assert.equal(savehMill.existingBrandName, 'نورد ساوه');
    assert.equal(GALVANIZED_PIPE_MILLS.filter((mill) => mill.existingBrandName).length, 1);
    assert.equal(GALVANIZED_PIPE_MILLS.filter((mill) => !mill.existingBrandName).length, 3);
  });

  it('reuses five existing mills on لوله تست آب and does not add a sixth', () => {
    assert.deepEqual([...WATER_TEST_PIPE_BRAND_SKUS], [
      'SAVEH', 'SEPANTA', 'SEPAHAN', 'KALUP', 'QAZVIN',
    ]);
    assert.equal(TYPE_BRAND_SKUS['لوله تست آب'], WATER_TEST_PIPE_BRAND_SKUS);
    assert.equal(WATER_TEST_PIPE_MILLS.every((mill) => mill.existingBrandName), true);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b.brandName]));
    assert.equal(bySku.get('SAVEH'), 'نورد ساوه');
    assert.equal(bySku.get('SEPANTA'), 'سپنتا');
    assert.equal(bySku.get('SEPAHAN'), 'سپاهان');
    assert.equal(bySku.get('KALUP'), 'کالوپ');
    assert.equal(bySku.get('QAZVIN'), 'قزوین');
    assert.equal(WATER_TEST_PIPE_MILLS.find((mill) => mill.skuCode === 'SAVEH').existingBrandName, 'نورد ساوه');
    assert.equal(WATER_TEST_PIPE_MILLS.find((mill) => mill.skuCode === 'KALUP').existingBrandName, 'کالوپ');
  });

  it('binds six gas-test mills and reuses SEPAHAN, SAVEH, SEPANTA', () => {
    assert.deepEqual([...GAS_TEST_PIPE_BRAND_SKUS], [
      'SEPAHAN', 'SAVEH', 'SEPANTA', 'KEYHAN', 'YARAN', 'KACHO',
    ]);
    assert.equal(TYPE_BRAND_SKUS['لوله تست گاز'], GAS_TEST_PIPE_BRAND_SKUS);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b]));
    assert.equal(bySku.get('SEPAHAN').brandName, 'سپاهان');
    assert.equal(bySku.get('SAVEH').brandName, 'نورد ساوه');
    assert.equal(bySku.get('SEPANTA').brandName, 'سپنتا');
    assert.equal(bySku.get('KEYHAN').brandName, 'کیهان');
    assert.equal(bySku.get('KEYHAN').nameLatin, 'Keyhan Pipe');
    assert.equal(bySku.get('YARAN').brandName, 'یاران');
    assert.equal(bySku.get('YARAN').legalName, 'شرکت نورد و لوله یاران');
    assert.equal(bySku.get('KACHO').brandName, 'کچو');
    assert.equal(bySku.get('KACHO').nameLatin, 'Kacho');
    assert.notEqual(bySku.get('YARAN').skuCode, bySku.get('ZANJAN')?.skuCode);
    assert.equal(GAS_TEST_PIPE_MILLS.filter((mill) => mill.existingBrandName).length, 3);
    assert.equal(GAS_TEST_PIPE_MILLS.filter((mill) => !mill.existingBrandName).length, 3);
  });

  it('binds five well-casing mills and reuses KALUP and NEYZAR', () => {
    assert.deepEqual([...WELL_CASING_PIPE_BRAND_SKUS], [
      'KALUP', 'KIANP', 'TSHARGH', 'NEYZAR', 'ATENA',
    ]);
    assert.equal(TYPE_BRAND_SKUS['لوله جدار چاه'], WELL_CASING_PIPE_BRAND_SKUS);
    const bySku = new Map(STEEL_BRANDS.map((b) => [b.skuCode, b]));
    assert.equal(bySku.get('KALUP').brandName, 'کالوپ');
    assert.equal(bySku.get('NEYZAR').brandName, 'نیزار');
    assert.equal(bySku.get('KIANP').brandName, 'کیان پرشیا');
    assert.equal(bySku.get('KIANP').nameLatin, 'Kian Persia');
    assert.equal(bySku.get('TSHARGH').brandName, 'تهران شرق');
    assert.equal(bySku.get('TSHARGH').nameLatin, 'Tehran Shargh');
    assert.equal(bySku.get('ATENA').brandName, 'فولاد گستر آتنا');
    assert.equal(bySku.get('ATENA').legalName, 'شرکت فولاد گستر آتنا');
    assert.notEqual(bySku.get('KIANP').skuCode, bySku.get('PERSIAN').skuCode);
    assert.notEqual(bySku.get('TSHARGH').skuCode, bySku.get('TEHRAN').skuCode);
    assert.equal(WELL_CASING_PIPE_MILLS.filter((mill) => mill.existingBrandName).length, 2);
    assert.equal(WELL_CASING_PIPE_MILLS.filter((mill) => !mill.existingBrandName).length, 3);
  });
});

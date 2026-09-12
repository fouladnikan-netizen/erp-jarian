import { describe, expect, it } from 'vitest';
import {
  suggestAttributeCode,
  suggestLatinName,
  suggestSkuFromFa,
  suggestUomCode,
} from '../suggestLatinName.js';

describe('suggestLatinName', () => {
  it('maps catalog phrases, not letters', () => {
    expect(suggestLatinName('مقاطع فولادی')).toBe('Carbon Steel');
    expect(suggestLatinName('میلگرد آجدار')).toBe('Deformed Rebar');
    expect(suggestLatinName('ورق گرم')).toBe('Hot Rolled Sheet');
    expect(suggestLatinName('تیرآهن IPE')).toBe('IPE Beam');
    expect(suggestLatinName('پیچ و مهره')).toBe('Fasteners');
    expect(suggestLatinName('فولاد مبارکه')).toBe('Mobarakeh Steel');
    expect(suggestLatinName('آلومینیوم')).toBe('Aluminum');
    expect(suggestLatinName('مقاطع آلومینیومی')).toBe('Aluminum Sections');
    expect(suggestLatinName('اتصالات فولادی')).toBe('Steel Fittings');
    expect(suggestLatinName('زانو ۹۰ درجه درزدار')).toBe('Welded Elbow 90° (Seamed)');
    expect(suggestLatinName('فلنج گلودار جوشی')).toBe('Welding Neck Flange (WNF)');
    expect(suggestLatinName('ورق استیل ۳۰۴L')).toBe('Stainless Steel 304L Sheets');
    expect(suggestLatinName('لوله استیل سوپر دابلکس ۲۵۰۷')).toBe('Super Duplex 2507 Stainless Steel Pipes & Tubes');
    expect(suggestLatinName('نبشی استیل ۳۱۶')).toBe('Stainless Steel 316 Angles');
    expect(suggestLatinName('پیچ شش‌گوش آچاری')).toBe('Hex Bolt');
    expect(suggestLatinName('مهره قفلی (کاسه نمدی)')).toBe('Nylon Insert Lock Nut');
    expect(suggestLatinName('پیچ سرمته‌ای واشردار (شیروانی)')).toBe('Hex Washer Head Self-Drilling Screw');
    expect(suggestLatinName('چوب روسی')).toBe('Russian Wood');
    expect(suggestLatinName('تخته زیرپایی روسی')).toBe('Russian Scaffolding Footboard');
    expect(suggestLatinName('تخته چندلایه ضد آب')).toBe('Waterproof / WBP Plywood');
    expect(suggestLatinName('ایران اسپیرال')).toBe('Iran Spiral');
    expect(suggestLatinName('اسپیرال اصفهان')).toBe('Isfahan Spiral');
    expect(suggestLatinName('آریا نورد خلیج فارس')).toBe('Arya Navard Persian Gulf');
  });

  it('keeps Latin tokens and skips unknown Persian words', () => {
    expect(suggestLatinName('ورق ST52')).toBe('Sheet ST52');
    expect(suggestLatinName('قفقفازناموجود')).toBe('');
    expect(suggestLatinName('میلگرد قفقفازناموجود')).toBe('Rebar');
  });

  it('does not emit a letter-by-letter romanization', () => {
    expect(suggestLatinName('قفقفازناموجود')).not.toMatch(/q|gh|f/i);
  });
});

describe('suggestSkuFromFa', () => {
  it('uses the Latin suggestion as the SKU source', () => {
    expect(suggestSkuFromFa('مقاطع فولادی')).toBe('CS');
    expect(suggestSkuFromFa('میلگرد آجدار')).toBe('DR');
    expect(suggestSkuFromFa('تیرآهن IPE')).toBe('IPE');
    expect(suggestSkuFromFa('آلومینیوم')).toBe('Al');
  });
});

describe('suggestAttributeCode', () => {
  it('uses the attribute lexicon', () => {
    expect(suggestAttributeCode('ضخامت')).toBe('thickness');
    expect(suggestAttributeCode('وزن واحد')).toBe('unit_weight');
  });
});

describe('suggestUomCode', () => {
  it('uses the unit lexicon', () => {
    expect(suggestUomCode('کیلوگرم')).toBe('KG');
    expect(suggestUomCode('متر مربع')).toBe('SQUARE_METER');
    expect(suggestUomCode('شاخه')).toBe('BRANCH');
    expect(suggestUomCode('سانت')).toBe('CM');
  });
});

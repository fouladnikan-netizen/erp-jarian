/**
 * Russian wood identity catalog (footboard cartesian; plywood thickness only).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { millSheetTypeNames } from '../domain/productMaster/sheetMillLength.js';
import { STEEL_TYPE_OFFER_UNITS, resolveTypeName } from '../domain/productMaster/steelOfferUnits.js';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';
import {
  BOARD_LENGTH_M_CODE,
  BOARD_THICKNESS_CM_CODE,
  BOARD_WIDTH_CM_CODE,
  FOOTBOARD_LENGTHS_M,
  FOOTBOARD_THICKNESS_CM,
  FOOTBOARD_TYPE_NAME,
  FOOTBOARD_WIDTHS_CM,
  PLYWOOD_FORBIDDEN_MASTER_CODES,
  PLYWOOD_HEIGHT_MM_CODE,
  PLYWOOD_SHEET_HEIGHT_MM,
  PLYWOOD_SHEET_WIDTH_MM,
  PLYWOOD_THICKNESSES_MM,
  PLYWOOD_THICKNESS_MM_CODE,
  PLYWOOD_TYPE_NAMES,
  PLYWOOD_WIDTH_MM_CODE,
  RUSSIAN_WOOD_CATALOG_PRODUCT_COUNT,
  RUSSIAN_WOOD_GROUP_NAME,
  RUSSIAN_WOOD_OFFER_UNITS,
  RUSSIAN_WOOD_TYPE_NAMES,
  allRussianWoodIdentityRows,
  footboardDisplayNameRule,
  footboardIdentityRows,
  plywoodDisplayNameRule,
  plywoodIdentityRows,
  russianWoodBindingPlan,
} from '../domain/productMaster/russianWoodCatalog.js';

describe('russianWoodCatalog', () => {
  it('keeps 54 identity rows: 10 footboards × thickness 5 × lengths 4|6, 44 plywood thicknesses', () => {
    assert.equal(RUSSIAN_WOOD_GROUP_NAME, 'چوب روسی');
    assert.equal(RUSSIAN_WOOD_TYPE_NAMES.length, 5);
    assert.equal(RUSSIAN_WOOD_CATALOG_PRODUCT_COUNT, 54);

    const boards = footboardIdentityRows();
    assert.equal(boards.length, 10);
    assert.equal(FOOTBOARD_WIDTHS_CM.length * FOOTBOARD_LENGTHS_M.length, 10);
    assert.equal(boards.every((row) => row[BOARD_THICKNESS_CM_CODE] === FOOTBOARD_THICKNESS_CM), true);
    assert.equal(boards.every((row) => FOOTBOARD_LENGTHS_M.includes(row[BOARD_LENGTH_M_CODE])), true);
    assert.equal(boards.some((row) => row[BOARD_LENGTH_M_CODE] === 4.5), false);
    assert.equal(boards.some((row) => Number(row[BOARD_THICKNESS_CM_CODE]) !== 5), false);
    assert.deepEqual(
      [...new Set(boards.map((row) => row[BOARD_WIDTH_CM_CODE]))],
      [...FOOTBOARD_WIDTHS_CM],
    );

    const ply = plywoodIdentityRows();
    assert.equal(ply.length, 11);
    assert.deepEqual(ply.map((row) => row[PLYWOOD_THICKNESS_MM_CODE]), [...PLYWOOD_THICKNESSES_MM]);
    assert.equal(ply.every((row) => row[PLYWOOD_WIDTH_MM_CODE] === undefined), true);
    assert.equal(ply.every((row) => row[PLYWOOD_HEIGHT_MM_CODE] === undefined), true);
    assert.equal(ply.every((row) => row.width === undefined && row.height === undefined), true);
    assert.equal(ply.some((row) => Number(row[PLYWOOD_THICKNESS_MM_CODE]) === 4.5), false);
    assert.equal(PLYWOOD_THICKNESSES_MM.includes(4.5), false);

    const all = allRussianWoodIdentityRows();
    assert.equal(all.length, 54);
    assert.equal(all.filter((row) => row.typeName === FOOTBOARD_TYPE_NAME).length, 10);
    assert.equal(all.filter((row) => PLYWOOD_TYPE_NAMES.includes(row.typeName)).length, 44);
  });

  it('binds footboard length as PRODUCT identity and plywood sheet as Offer Variant defaults', () => {
    const board = new Map(russianWoodBindingPlan(FOOTBOARD_TYPE_NAME).map((row) => [row.code, row]));
    assert.equal(board.get(BOARD_THICKNESS_CM_CODE).valueScope, 'PRODUCT');
    assert.equal(board.get(BOARD_THICKNESS_CM_CODE).isRequired, true);
    assert.equal(board.get(BOARD_WIDTH_CM_CODE).valueScope, 'PRODUCT');
    assert.equal(board.get(BOARD_WIDTH_CM_CODE).isRequired, true);
    assert.equal(board.get(BOARD_LENGTH_M_CODE).valueScope, 'PRODUCT');
    assert.equal(board.get(BOARD_LENGTH_M_CODE).isRequired, true);
    assert.equal(BOARD_LENGTH_M_CODE, 'length');
    assert.equal(board.has('length'), true);
    assert.equal(board.has('board_length_m'), false);

    const ply = new Map(russianWoodBindingPlan(PLYWOOD_TYPE_NAMES[0]).map((row) => [row.code, row]));
    assert.equal(ply.get(PLYWOOD_THICKNESS_MM_CODE).valueScope, 'PRODUCT');
    assert.equal(ply.get(PLYWOOD_THICKNESS_MM_CODE).isRequired, true);
    assert.equal(ply.get(PLYWOOD_WIDTH_MM_CODE).valueScope, 'TRANSACTION');
    assert.equal(ply.get(PLYWOOD_WIDTH_MM_CODE).isRequired, false);
    assert.equal(ply.get(PLYWOOD_WIDTH_MM_CODE).overrideDefaultValue, String(PLYWOOD_SHEET_WIDTH_MM));
    assert.equal(ply.get(PLYWOOD_HEIGHT_MM_CODE).valueScope, 'TRANSACTION');
    assert.equal(ply.get(PLYWOOD_HEIGHT_MM_CODE).isRequired, false);
    assert.equal(ply.get(PLYWOOD_HEIGHT_MM_CODE).overrideDefaultValue, String(PLYWOOD_SHEET_HEIGHT_MM));
    assert.equal(PLYWOOD_FORBIDDEN_MASTER_CODES.includes(PLYWOOD_WIDTH_MM_CODE), true);
  });

  it('does not register plywood برگ on STEEL_TYPE_OFFER_UNITS / millSheetTypeNames', () => {
    const mill = new Set(millSheetTypeNames());
    for (const name of PLYWOOD_TYPE_NAMES) {
      assert.equal(mill.has(name), false, `mill sheet list contains ${name}`);
    }
    const steelTypes = new Set(STEEL_TYPE_OFFER_UNITS.map((row) => resolveTypeName(row.typeName)));
    for (const row of RUSSIAN_WOOD_OFFER_UNITS) {
      assert.equal(steelTypes.has(row.typeName), false);
    }
    const foot = RUSSIAN_WOOD_OFFER_UNITS.find((row) => row.typeName === FOOTBOARD_TYPE_NAME);
    assert.equal(foot.countUnitFa, 'شاخه');
    assert.equal(foot.salesUnitFa, 'شاخه');
    assert.equal(
      RUSSIAN_WOOD_OFFER_UNITS.filter((row) => row.countUnitFa === 'برگ').length,
      PLYWOOD_TYPE_NAMES.length,
    );
  });

  it('builds footboard and plywood display names from identity (+ plywood Type defaults)', () => {
    const boardRule = footboardDisplayNameRule({
      thicknessId: 'attr_bt',
      widthId: 'attr_bw',
      lengthId: 'attr_bl',
    });
    const boardName = buildDisplayNameFromRule(boardRule, {
      sources: { type: FOOTBOARD_TYPE_NAME },
      attributes: {
        attr_bt: { nameFa: 'ضخامت', displayValue: '5', unitLabel: 'سانت' },
        attr_bw: { nameFa: 'عرض', displayValue: '20', unitLabel: 'سانت' },
        attr_bl: { nameFa: 'طول', displayValue: '6', unitLabel: 'متر' },
      },
    });
    assert.equal(boardName, 'تخته زیرپایی روسی ۵ سانت×۲۰ سانت×۶ متر');

    const plyRule = plywoodDisplayNameRule({
      thicknessId: 'attr_pt',
      widthId: 'attr_pw',
      heightId: 'attr_ph',
    });
    const plyName = buildDisplayNameFromRule(plyRule, {
      sources: { type: 'تخته چندلایه معمولی' },
      attributes: {
        attr_pt: { nameFa: 'ضخامت', displayValue: '12', unitLabel: 'میل' },
        attr_pw: { nameFa: 'عرض ورق', displayValue: '1220', unitLabel: 'میل' },
        attr_ph: { nameFa: 'ارتفاع ورق', displayValue: '2440', unitLabel: 'میل' },
      },
    });
    assert.equal(plyName, 'تخته چندلایه معمولی ضخامت ۱۲ میل ابعاد ۱۲۲۰ میل×۲۴۴۰ میل');
  });
});

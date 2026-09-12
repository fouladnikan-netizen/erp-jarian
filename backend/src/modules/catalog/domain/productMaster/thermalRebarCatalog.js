/**
 * Thermal rebar (میلگرد حرارتی) identity catalog.
 * Operator schema: grade + size are required PRODUCT identity.
 */

export const THERMAL_REBAR_TYPE_NAME = 'میلگرد حرارتی';
export const THERMAL_REBAR_GROUP_NAME = 'مقاطع فولادی';

export const THERMAL_REBAR_GRADES = Object.freeze(['A1', 'A2', 'A3']);

export const THERMAL_REBAR_SIZES_MM = Object.freeze([5.5, 6, 6.5, 8]);

export function thermalRebarIdentityRows() {
  return THERMAL_REBAR_GRADES.flatMap((grade) => (
    THERMAL_REBAR_SIZES_MM.map((size) => Object.freeze({ grade, size }))
  ));
}

export default {
  THERMAL_REBAR_TYPE_NAME,
  THERMAL_REBAR_GROUP_NAME,
  THERMAL_REBAR_GRADES,
  THERMAL_REBAR_SIZES_MM,
  thermalRebarIdentityRows,
};

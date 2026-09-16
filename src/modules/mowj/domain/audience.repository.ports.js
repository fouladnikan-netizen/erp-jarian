/**
 * AudienceRepository contract — segments only, no store imports.
 */

/**
 * @typedef {object} AudienceRepository
 * @property {(segment: object) => object|null} saveSegment
 * @property {(id: string) => object|null} getSegment
 * @property {(segmentOrId: object|string) => { ok: boolean, count: number, error?: string }} previewSegment
 * @property {() => object[]} [listSegments]
 */

/**
 * @param {{
 *   saveSegment?: Function,
 *   getSegment?: Function,
 *   previewSegment?: Function,
 *   listSegments?: Function,
 * }} [impl]
 * @returns {AudienceRepository}
 */
export function createEmptyAudienceRepository(impl = {}) {
  /** @type {Map<string, object>} */
  const map = new Map();
  return {
    saveSegment: typeof impl.saveSegment === 'function'
      ? impl.saveSegment
      : (segment) => {
        if (!segment?.id) return null;
        map.set(String(segment.id), segment);
        return segment;
      },
    getSegment: typeof impl.getSegment === 'function'
      ? impl.getSegment
      : (id) => map.get(String(id)) || null,
    previewSegment: typeof impl.previewSegment === 'function'
      ? impl.previewSegment
      : () => ({ ok: true, count: 0 }),
    listSegments: typeof impl.listSegments === 'function'
      ? impl.listSegments
      : () => [...map.values()],
  };
}

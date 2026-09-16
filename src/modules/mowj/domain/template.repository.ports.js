/**
 * TemplateRepository contract — no store imports.
 */

/**
 * @typedef {object} TemplateRepository
 * @property {(template: object) => object|null} saveTemplate
 * @property {(id: string) => object|null} getTemplate
 * @property {(filters?: { type?: string }) => object[]} listTemplates
 * @property {(templateId: string, nextContent?: object|null) => object|null} createVersion
 * @property {(templateId: string) => object[]} [listVersions]
 * @property {(templateId: string, version: number) => object|null} [getVersion]
 */

/**
 * @returns {TemplateRepository}
 */
export function createEmptyTemplateRepository() {
  /** @type {Map<string, object>} */
  const map = new Map();
  /** @type {object[]} */
  const versions = [];
  return {
    saveTemplate(template) {
      if (!template?.id) return null;
      map.set(String(template.id), template);
      return template;
    },
    getTemplate(id) {
      return map.get(String(id)) || null;
    },
    listTemplates(filters = {}) {
      let rows = [...map.values()];
      if (filters.type) {
        rows = rows.filter((row) => row.type === filters.type);
      }
      return rows;
    },
    createVersion(templateId, nextContent = null) {
      const existing = map.get(String(templateId));
      if (!existing) return null;
      const next = {
        ...existing,
        ...(nextContent || {}),
        version: Number(existing.version || 1) + 1,
      };
      map.set(String(templateId), next);
      versions.unshift({
        templateId,
        version: next.version,
        content: next.content,
      });
      return { template: next, version: versions[0], history: versions.filter((v) => v.templateId === templateId) };
    },
    listVersions(templateId) {
      return versions.filter((row) => String(row.templateId) === String(templateId));
    },
  };
}

/**
 * UI facade — Template Variable Registry exports for Smart Template Builder.
 */
export {
  TEMPLATE_VARIABLE_REGISTRY,
  TEMPLATE_VARIABLE_CATALOG,
  TEMPLATE_VARIABLE_CATEGORY,
  TEMPLATE_VARIABLE_CATEGORY_LABELS,
  TEMPLATE_VARIABLE_SCOPE,
  extractVariableTokens,
  findUnknownVariableTokens,
  getTemplateVariable,
  getTemplateVariableByToken,
  listTemplateVariableCategories,
  listTemplateVariablesForType,
  validateContentVariables,
  validateTemplateVariables,
} from './domain/template.variables';

export {
  renderTemplatePreviewMock,
  TEMPLATE_PREVIEW_MOCK_VALUES,
} from './templatePreview.mock';

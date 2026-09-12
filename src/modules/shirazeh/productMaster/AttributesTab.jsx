import { useEffect, useState } from 'react';
import { Check, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAttributeDefinitionsStore } from '../../../stores/useAttributeDefinitionsStore';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';
import { useUomStore } from '../../../stores/useUomStore';
import { useJarianNotice } from '../../../context/JarianNoticeContext';
import { filterByQuery } from '../../../domain/productMaster/structureSearch';
import { suggestAttributeCode } from '../../../domain/productMaster/suggestLatinName';
import { selectedEnumValuesFromOverride } from '../../../domain/productMaster/allowedAttributeValues';
import ProductMasterAlert, { productMasterErrorMessage } from './ProductMasterAlert';
import useSuggestedLatin from './useSuggestedLatin';

const DATA_TYPES = [
  { value: 'STRING', label: 'متن' },
  { value: 'DECIMAL', label: 'عدد' },
  { value: 'BOOLEAN', label: 'بله / خیر' },
  { value: 'ENUM', label: 'چندگزینه‌ای' },
  { value: 'DATE', label: 'تاریخ' },
  { value: 'REFERENCE', label: 'ارجاع' },
];

const PERSIAN_SCRIPT = /[\u0600-\u06FF]/;

function dataTypeLabel(value) {
  if (value === 'INTEGER' || value === 'DECIMAL') return 'عدد';
  return DATA_TYPES.find((t) => t.value === value)?.label || value;
}

function canonicalDataType(value) {
  return value === 'INTEGER' ? 'DECIMAL' : value;
}

function isNumericDataType(value) {
  const type = canonicalDataType(value);
  return type === 'DECIMAL';
}

function rankUomCategory(category) {
  if (category === 'LENGTH') return 0;
  if (category === 'WEIGHT') return 1;
  return 2;
}

function UomSelect({ value, onChange, uoms, disabled = false }) {
  const active = (uoms || []).filter((item) => item.isActive !== false);
  const current = value ? (uoms || []).find((item) => item.id === value) : null;
  const options = [...active];
  if (current && !options.some((item) => item.id === current.id)) options.push(current);
  options.sort((a, b) => {
    const byCategory = rankUomCategory(a.category) - rankUomCategory(b.category);
    if (byCategory) return byCategory;
    return String(a.nameFa || '').localeCompare(String(b.nameFa || ''), 'fa');
  });
  return (
    <select
      className="shirazeh-pm__select shirazeh-pm__select--unit"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label="واحد اندازه‌گیری"
      title="واحد اندازه‌گیری این ویژگی"
    >
      <option value="">— بدون واحد —</option>
      {options.map((item) => (
        <option key={item.id} value={item.id}>{item.nameFa}</option>
      ))}
    </select>
  );
}

function parseAllowedValues(raw) {
  return String(raw || '')
    .split(/[,،;؛]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const eq = item.indexOf('=');
      if (eq > 0) {
        const left = item.slice(0, eq).trim();
        const right = item.slice(eq + 1).trim();
        if (!right) return { value: left, labelFa: left };
        if (PERSIAN_SCRIPT.test(left) && !PERSIAN_SCRIPT.test(right)) {
          return { value: right, labelFa: left };
        }
        if (!PERSIAN_SCRIPT.test(left) && PERSIAN_SCRIPT.test(right)) {
          return { value: left, labelFa: right };
        }
        return { value: right, labelFa: left };
      }
      return { value: item, labelFa: item };
    });
}

function formatAllowedValues(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => {
      const value = String(item?.value ?? '').trim();
      const labelFa = String(item?.labelFa ?? value).trim();
      if (!value && !labelFa) return '';
      if (!labelFa || labelFa === value) return value;
      return `${labelFa}=${value}`;
    })
    .filter(Boolean)
    .join('، ');
}

const VALUE_SCOPES = [
  { value: 'PRODUCT', label: 'کالا' },
  { value: 'TRANSACTION', label: 'تراکنش' },
];

function bindingScope(binding) {
  if (binding?.valueScope === 'TRANSACTION' || binding?.valueScope === 'PRODUCT') return binding.valueScope;
  return binding?.attributeRole === 'TRANSACTION_ONLY' ? 'TRANSACTION' : 'PRODUCT';
}

function formatEffectiveAllowed(definition, binding) {
  if (definition?.dataType !== 'ENUM') return '—';
  const items = binding?.effectiveAllowedValues
    || (Array.isArray(definition.allowedValues) ? definition.allowedValues : []);
  if (!binding?.overrideAllowedValues?.length) return 'همه';
  return items.map((item) => item.labelFa || item.value).join('، ') || '—';
}

function bindingSummary(binding, definition) {
  const parts = [
    binding?.isRequired ? 'الزامی' : 'اختیاری',
    VALUE_SCOPES.find((item) => item.value === bindingScope(binding))?.label,
  ];
  const isNumeric = definition?.dataType === 'DECIMAL' || definition?.dataType === 'INTEGER';
  if (isNumeric) {
    const range = [binding?.overrideMin, binding?.overrideMax].filter((value) => value != null).join(' — ');
    if (range) parts.push(range);
  }
  if (binding?.overrideDefaultValue) parts.push(`پیش‌فرض ${binding.overrideDefaultValue}`);
  return parts.filter(Boolean).join(' · ');
}

function supportsBindingDefault(dataType) {
  const type = String(dataType || '').toUpperCase();
  return type === 'DECIMAL' || type === 'INTEGER' || type === 'ENUM' || type === 'STRING';
}

function catalogValues(definition) {
  return (definition?.allowedValues || []).map((item) => item.value);
}

function selectedCatalogValues(definition, selected) {
  return catalogValues(definition).filter((value) => selected.has(value));
}

function readDefaultPayload(hasDefault, value, allowedValues) {
  if (!hasDefault) return { overrideDefaultValue: null };
  const trimmed = String(value || '').trim();
  if (!trimmed) return { error: 'مقدار پیش‌فرض را وارد کنید.' };
  if (Array.isArray(allowedValues) && allowedValues.length && !allowedValues.includes(trimmed)) {
    return { overrideDefaultValue: null };
  }
  return { overrideDefaultValue: trimmed };
}

function BindingDefaultFields({
  definition,
  hasDefault,
  value,
  onHasDefaultChange,
  onValueChange,
  enumOptions = [],
}) {
  if (!supportsBindingDefault(definition?.dataType)) return null;
  const isNumeric = definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER';
  return (
    <>
      <label className="shirazeh-pm__check">
        <input
          type="checkbox"
          checked={hasDefault}
          onChange={(event) => onHasDefaultChange(event.target.checked)}
        />
        پیش‌فرض
      </label>
      {hasDefault && definition.dataType === 'ENUM' ? (
        <select
          className="shirazeh-pm__select"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-label="مقدار پیش‌فرض"
        >
          <option value="">— انتخاب کنید —</option>
          {enumOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.labelFa || opt.value}</option>
          ))}
        </select>
      ) : null}
      {hasDefault && definition.dataType !== 'ENUM' ? (
        <input
          className="shirazeh-pm__input shirazeh-pm__input--narrow"
          type={isNumeric ? 'number' : 'text'}
          step="any"
          dir="ltr"
          placeholder="مقدار"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-label="مقدار پیش‌فرض"
        />
      ) : null}
    </>
  );
}

/**
 * Attribute Definitions (centralized, reusable — Shirazeh) + Product Type
 * schema binding (DDL-24c / DDL-46). Selecting a Product Type in the Taxonomy tab
 * feeds `selectedTypeId` here so the schema panel shows its effective,
 * inherited Attribute Schema.
 */
export default function AttributesTab({ canManage, selectedTypeId, mode = 'full', compact = false, filterQuery = '' }) {
  const definitions = useAttributeDefinitionsStore((s) => s.definitions);
  const schemaByType = useAttributeDefinitionsStore((s) => s.schemaByType);
  const schemaErrorByType = useAttributeDefinitionsStore((s) => s.schemaErrorByType);
  const fetchAll = useAttributeDefinitionsStore((s) => s.fetchAll);
  const fetchSchemaForType = useAttributeDefinitionsStore((s) => s.fetchSchemaForType);
  const createDefinition = useAttributeDefinitionsStore((s) => s.createDefinition);
  const updateDefinition = useAttributeDefinitionsStore((s) => s.updateDefinition);
  const deleteDefinition = useAttributeDefinitionsStore((s) => s.deleteDefinition);
  const bindAttribute = useAttributeDefinitionsStore((s) => s.bindAttribute);
  const updateBinding = useAttributeDefinitionsStore((s) => s.updateBinding);
  const deleteBinding = useAttributeDefinitionsStore((s) => s.deleteBinding);
  const types = useProductTaxonomyStore((s) => s.types);
  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);
  const { confirm } = useJarianNotice();

  const [nameFa, setNameFa] = useState('');
  const suggestedCode = useSuggestedLatin(nameFa, suggestAttributeCode);
  const [dataType, setDataType] = useState('DECIMAL');
  const [createUomId, setCreateUomId] = useState('');
  const [enumOptions, setEnumOptions] = useState('');
  const [busy, setBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editNameFa, setEditNameFa] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCodeLocked, setEditCodeLocked] = useState(false);
  const [editDataType, setEditDataType] = useState('DECIMAL');
  const [editUomId, setEditUomId] = useState('');
  const [editEnumOptions, setEditEnumOptions] = useState('');

  const [bindDefId, setBindDefId] = useState('');
  const [bindScope, setBindScope] = useState('PRODUCT');
  const [bindRequired, setBindRequired] = useState(true);
  const [bindAllowed, setBindAllowed] = useState(() => new Set());
  const [bindMin, setBindMin] = useState('');
  const [bindMax, setBindMax] = useState('');
  const [bindHasDefault, setBindHasDefault] = useState(false);
  const [bindDefaultValue, setBindDefaultValue] = useState('');

  const [editingBindingId, setEditingBindingId] = useState(null);
  const [editScope, setEditScope] = useState('PRODUCT');
  const [editRequired, setEditRequired] = useState(false);
  const [editAllowed, setEditAllowed] = useState(() => new Set());
  const [editMin, setEditMin] = useState('');
  const [editMax, setEditMax] = useState('');
  const [editHasDefault, setEditHasDefault] = useState(false);
  const [editDefaultValue, setEditDefaultValue] = useState('');
  const [allowedDrafts, setAllowedDrafts] = useState({});

  useEffect(() => { void fetchAll(); }, [fetchAll]);
  useEffect(() => { void fetchUoms(); }, [fetchUoms]);
  useEffect(() => { if (selectedTypeId) void fetchSchemaForType(selectedTypeId); }, [selectedTypeId, fetchSchemaForType]);

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const schema = schemaByType[selectedTypeId] || [];
  const bindDefinition = definitions.find((d) => d.id === bindDefId);
  const showDefinitions = mode === 'full' || mode === 'definitions';
  const showSchema = mode === 'full' || mode === 'binding' || mode === 'allowed-values';
  const showBindForm = mode === 'full' || mode === 'binding';
  const showEnumInBind = mode === 'full';
  const enumOnly = mode === 'allowed-values';
  const activeSchema = schema.filter((entry) => entry.binding?.isActive !== false);
  const visibleSchema = enumOnly
    ? activeSchema.filter((entry) => entry.definition?.dataType === 'ENUM')
    : activeSchema;

  useEffect(() => {
    if (mode !== 'allowed-values') return;
    const next = {};
    (schemaByType[selectedTypeId] || [])
      .filter((entry) => entry.definition?.dataType === 'ENUM')
      .forEach((entry) => {
        const catalog = (entry.definition.allowedValues || []).map((item) => item.value);
        const override = entry.binding?.overrideAllowedValues;
        next[entry.binding.id] = new Set(selectedEnumValuesFromOverride(catalog, override));
      });
    setAllowedDrafts(next);
  }, [mode, selectedTypeId, schemaByType]);

  useEffect(() => {
    const definition = definitions.find((d) => d.id === bindDefId);
    if (!definition) {
      setBindAllowed(new Set());
      setBindMin('');
      setBindMax('');
      setBindHasDefault(false);
      setBindDefaultValue('');
      return;
    }
    setBindAllowed(new Set((definition.allowedValues || []).map((item) => item.value)));
    setBindMin('');
    setBindMax('');
    setBindHasDefault(false);
    setBindDefaultValue('');
  }, [bindDefId, definitions]);

  function toggleDraftValue(bindingId, value) {
    setAllowedDrafts((prev) => {
      const current = new Set(prev[bindingId] || []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [bindingId]: current };
    });
  }

  function toggleSetValue(setter, value) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function overrideFromSelection(definition, selected) {
    const catalog = (definition.allowedValues || []).map((item) => item.value);
    if (!selected.size) return { error: 'حداقل یک گزینه مجاز انتخاب کنید.' };
    if (selected.size === catalog.length) return { values: null };
    return { values: catalog.filter((value) => selected.has(value)) };
  }

  async function handleCreateDefinition(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!suggestedCode.value.trim() || !nameFa.trim()) return;
    const allowedValues = dataType === 'ENUM' ? parseAllowedValues(enumOptions) : undefined;
    if (dataType === 'ENUM' && !allowedValues.length) {
      setAlertMessage('ویژگی چندگزینه‌ای یعنی مقدار از یک فهرست ثابت انتخاب می‌شود. حداقل یک گزینه وارد کنید؛ گزینه‌ها را با ویرگول جدا کنید (مثلاً ST37، ST52).');
      return;
    }
    setBusy(true);
    try {
      await createDefinition({
        code: suggestedCode.value.trim(),
        nameFa: nameFa.trim(),
        dataType,
        ...(isNumericDataType(dataType) && createUomId ? { uomId: createUomId } : {}),
        ...(allowedValues ? { allowedValues } : {}),
      });
      suggestedCode.reset();
      setNameFa('');
      setCreateUomId('');
      setEnumOptions('');
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ثبت تعریف ویژگی ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(definition, event) {
    event?.stopPropagation();
    setAlertMessage('');
    setEditingId(definition.id);
    setEditNameFa(definition.nameFa || '');
    setEditCode(definition.code || '');
    setEditCodeLocked(Boolean(definition.code));
    setEditDataType(canonicalDataType(definition.dataType) || 'DECIMAL');
    setEditUomId(definition.uomId || '');
    setEditEnumOptions(formatAllowedValues(definition.allowedValues));
  }

  function cancelEdit(event) {
    event?.stopPropagation();
    setEditingId(null);
    setEditNameFa('');
    setEditCode('');
    setEditCodeLocked(false);
    setEditDataType('DECIMAL');
    setEditUomId('');
    setEditEnumOptions('');
  }

  async function saveEdit(definition, event) {
    event?.stopPropagation();
    const nextName = editNameFa.trim();
    const nextCode = editCode.trim();
    const nextType = canonicalDataType(editDataType);
    if (!nextName) {
      setAlertMessage('نام فارسی ویژگی را وارد کنید.');
      return;
    }
    if (!nextCode) {
      setAlertMessage('کد لاتین ویژگی را وارد کنید (مثلاً size).');
      return;
    }
    const allowedValues = nextType === 'ENUM' ? parseAllowedValues(editEnumOptions) : undefined;
    if (nextType === 'ENUM' && !allowedValues.length) {
      setAlertMessage('ویژگی چندگزینه‌ای یعنی مقدار از یک فهرست ثابت انتخاب می‌شود. حداقل یک گزینه وارد کنید؛ گزینه‌ها را با ویرگول جدا کنید (مثلاً ST37، ST52).');
      return;
    }

    const previousType = canonicalDataType(definition.dataType);
    const previousUomId = definition.uomId || '';
    const nextUomId = isNumericDataType(nextType) ? editUomId : '';
    const previousOptions = formatAllowedValues(definition.allowedValues);
    const unchanged = nextName === (definition.nameFa || '')
      && nextCode === (definition.code || '')
      && nextType === previousType
      && nextUomId === previousUomId
      && (nextType !== 'ENUM' || editEnumOptions.trim() === previousOptions);
    if (unchanged) {
      cancelEdit();
      return;
    }

    const patch = { nameFa: nextName, code: nextCode, dataType: nextType, uomId: nextUomId || null };
    if (nextType === 'ENUM') patch.allowedValues = allowedValues;
    else if (previousType === 'ENUM') patch.allowedValues = null;

    setBusy(true);
    setAlertMessage('');
    try {
      await updateDefinition(definition.id, patch);
      cancelEdit();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ویرایش تعریف ویژگی ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleBind(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!bindDefId || !selectedTypeId || !bindDefinition) return;
    const payload = {
      productTypeId: selectedTypeId,
      attributeDefinitionId: bindDefId,
      valueScope: bindScope,
      isRequired: bindRequired,
    };
    if (bindDefinition.dataType === 'ENUM' && mode !== 'binding') {
      const picked = overrideFromSelection(bindDefinition, bindAllowed);
      if (picked.error) {
        setAlertMessage(picked.error);
        return;
      }
      payload.overrideAllowedValues = picked.values;
    }
    const isNumeric = bindDefinition.dataType === 'DECIMAL' || bindDefinition.dataType === 'INTEGER';
    if (isNumeric) {
      payload.overrideMin = bindMin === '' ? null : Number(bindMin);
      payload.overrideMax = bindMax === '' ? null : Number(bindMax);
    }
    if (supportsBindingDefault(bindDefinition.dataType)) {
      const defaults = readDefaultPayload(bindHasDefault, bindDefaultValue);
      if (defaults.error) {
        setAlertMessage(defaults.error);
        return;
      }
      payload.overrideDefaultValue = defaults.overrideDefaultValue;
    }
    setBusy(true);
    try {
      await bindAttribute(payload);
      setBindDefId('');
      setBindScope('PRODUCT');
      setBindRequired(true);
      setBindHasDefault(false);
      setBindDefaultValue('');
    } catch (err) {
      if (err?.response?.data?.error === 'ATTRIBUTE_BINDING_DUPLICATE' && selectedTypeId) {
        await fetchSchemaForType(selectedTypeId);
        setBindDefId('');
        setAlertMessage('این ویژگی از قبل به این نوع کالا متصل است. در فهرست همین بخش دیده می‌شود.');
      } else {
        setAlertMessage(productMasterErrorMessage(err, 'اتصال ویژگی به نوع کالا ناموفق بود.'));
      }
    } finally {
      setBusy(false);
    }
  }

  function startEditBinding(entry) {
    const { binding, definition } = entry;
    setAlertMessage('');
    setEditingBindingId(binding.id);
    const scope = bindingScope(binding);
    setEditScope(scope);
    setEditRequired(Boolean(binding.isRequired));
    const catalog = catalogValues(definition);
    const override = Array.isArray(binding.overrideAllowedValues) ? binding.overrideAllowedValues : [];
    setEditAllowed(new Set(selectedEnumValuesFromOverride(catalog, override)));
    setEditMin(binding.overrideMin == null ? '' : String(binding.overrideMin));
    setEditMax(binding.overrideMax == null ? '' : String(binding.overrideMax));
    setEditHasDefault(Boolean(binding.overrideDefaultValue));
    setEditDefaultValue(binding.overrideDefaultValue ? String(binding.overrideDefaultValue) : '');
  }

  function cancelEditBinding() {
    setEditingBindingId(null);
  }

  async function saveEditBinding(entry) {
    const { binding, definition } = entry;
    if (enumOnly) {
      const picked = overrideFromSelection(definition, editAllowed);
      if (picked.error) {
        setAlertMessage(picked.error);
        return;
      }
      setBusy(true);
      setAlertMessage('');
      try {
        await updateBinding(binding.id, { overrideAllowedValues: picked.values }, selectedTypeId);
        cancelEditBinding();
      } catch (err) {
        setAlertMessage(productMasterErrorMessage(err, 'ویرایش اتصال ویژگی ناموفق بود.'));
      } finally {
        setBusy(false);
      }
      return;
    }
    const patch = {
      valueScope: editScope,
      isRequired: editRequired,
    };
    if (definition.dataType === 'ENUM' && (enumOnly || showEnumInBind)) {
      const picked = overrideFromSelection(definition, editAllowed);
      if (picked.error) {
        setAlertMessage(picked.error);
        return;
      }
      patch.overrideAllowedValues = picked.values;
    }
    const isNumeric = definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER';
    if (isNumeric) {
      patch.overrideMin = editMin === '' ? null : Number(editMin);
      patch.overrideMax = editMax === '' ? null : Number(editMax);
    }
    if (supportsBindingDefault(definition.dataType)) {
      const defaults = readDefaultPayload(
        editHasDefault,
        editDefaultValue,
        definition.dataType === 'ENUM' ? selectedCatalogValues(definition, editAllowed) : undefined,
      );
      if (defaults.error) {
        setAlertMessage(defaults.error);
        return;
      }
      patch.overrideDefaultValue = defaults.overrideDefaultValue;
    }
    setBusy(true);
    setAlertMessage('');
    try {
      await updateBinding(binding.id, patch, selectedTypeId);
      cancelEditBinding();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ویرایش اتصال ویژگی ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnbind(entry) {
    const ok = await confirm({
      title: 'حذف اتصال',
      entity: entry.definition.nameFa,
      message: 'این ویژگی از نوع کالا حذف شود؟',
      hint: 'تعریف ویژگی در بانک ویژگی‌ها می‌ماند. اگر کالایی مقدار این ویژگی را داشته باشد، حذف انجام نمی‌شود.',
      confirmLabel: 'حذف اتصال',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setAlertMessage('');
    try {
      await deleteBinding(entry.binding.id, selectedTypeId);
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'حذف اتصال ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDefinition(definition) {
    const ok = await confirm({
      title: 'حذف',
      entity: definition.nameFa,
      message: 'این ویژگی حذف شود؟',
      hint: 'اگر به نوعی متصل باشد یا در کالایی استفاده شده باشد، حذف انجام نمی‌شود.',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setAlertMessage('');
    try {
      await deleteDefinition(definition.id);
      if (editingId === definition.id) cancelEdit();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'حذف ویژگی ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  const boundDefIds = new Set(activeSchema.map((e) => e.definition?.id).filter(Boolean));
  const unboundDefinitions = definitions.filter((d) => !boundDefIds.has(d.id) && d.isActive !== false);
  const schemaError = selectedTypeId ? schemaErrorByType[selectedTypeId] : null;
  const visibleDefinitions = filterByQuery(
    definitions,
    filterQuery,
    (item) => [item.nameFa, item.code],
  );

  async function saveAllowedDrafts() {
    setAlertMessage('');
    setBusy(true);
    try {
      for (const entry of visibleSchema) {
        const selected = allowedDrafts[entry.binding.id] || new Set();
        const picked = overrideFromSelection(entry.definition, selected);
        if (picked.error) {
          setAlertMessage(`${entry.definition.nameFa}: ${picked.error}`);
          return;
        }
        await updateBinding(entry.binding.id, { overrideAllowedValues: picked.values }, selectedTypeId);
      }
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ذخیره مقادیر مجاز ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shirazeh-pm__body">
      <ProductMasterAlert message={alertMessage} onClose={() => setAlertMessage('')} />
      {showDefinitions && (
      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">
          {mode === 'definitions' ? 'بانک ویژگی‌ها' : 'تعاریف ویژگی (مرکزی و قابل استفاده مجدد)'}
        </h3>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateDefinition} style={{ flexWrap: 'wrap' }}>
            <input className="shirazeh-pm__input" placeholder="نام فارسی (مثلاً: سایز)" value={nameFa} onChange={(e) => setNameFa(e.target.value)} />
            <input className="shirazeh-pm__input" dir="ltr" placeholder="کد لاتین (پیشنهاد)" value={suggestedCode.value} onChange={(e) => suggestedCode.onChange(e.target.value)} />
            <select className="shirazeh-pm__select" value={dataType} onChange={(e) => {
              const next = e.target.value;
              setDataType(next);
              if (!isNumericDataType(next)) setCreateUomId('');
            }} aria-label="نوع داده">
              {DATA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {isNumericDataType(dataType) ? (
              <UomSelect value={createUomId} onChange={setCreateUomId} uoms={uoms} />
            ) : null}
            {dataType === 'ENUM' ? (
              <input
                className="shirazeh-pm__input shirazeh-pm__input--grow"
                placeholder="گزینه‌ها با ویرگول (مثلاً: ST37، ST52 یا سبک=light)"
                value={enumOptions}
                onChange={(e) => setEnumOptions(e.target.value)}
                aria-label="گزینه‌های مجاز"
              />
            ) : null}
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن
            </button>
          </form>
        )}
        <div className="shirazeh-pm__list">
          {definitions.length === 0 && <div className="shirazeh-pm__empty">تعریف ویژگی ثبت نشده است.</div>}
          {visibleDefinitions.map((d) => {
            const isEditing = editingId === d.id;
            return (
              <div key={d.id} className={`shirazeh-pm__item ${!d.isActive ? 'shirazeh-pm__item--inactive' : ''}`}>
                <span className="shirazeh-pm__code">{dataTypeLabel(d.dataType)}</span>
                {isEditing ? (
                  <div className="shirazeh-pm__item-edit">
                    <input
                      className="shirazeh-pm__input"
                      value={editNameFa}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEditNameFa(next);
                        if (!editCodeLocked) setEditCode(suggestAttributeCode(next));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveEdit(d, e);
                        }
                        if (e.key === 'Escape') cancelEdit(e);
                      }}
                      autoFocus
                      aria-label="نام فارسی"
                    />
                    <input
                      className="shirazeh-pm__input"
                      dir="ltr"
                      value={editCode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEditCode(next);
                        setEditCodeLocked(next.trim() !== '');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveEdit(d, e);
                        }
                        if (e.key === 'Escape') cancelEdit(e);
                      }}
                      placeholder="کد لاتین"
                      aria-label="کد لاتین"
                    />
                    <select
                      className="shirazeh-pm__select"
                      value={editDataType}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEditDataType(next);
                        if (!isNumericDataType(next)) setEditUomId('');
                      }}
                      aria-label="نوع داده"
                    >
                      {DATA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {isNumericDataType(editDataType) ? (
                      <UomSelect value={editUomId} onChange={setEditUomId} uoms={uoms} disabled={busy} />
                    ) : null}
                    {editDataType === 'ENUM' ? (
                      <input
                        className="shirazeh-pm__input shirazeh-pm__input--grow"
                        placeholder="گزینه‌ها با ویرگول (مثلاً: سبک=light)"
                        value={editEnumOptions}
                        onChange={(e) => setEditEnumOptions(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void saveEdit(d, e);
                          }
                          if (e.key === 'Escape') cancelEdit(e);
                        }}
                        aria-label="گزینه‌های مجاز"
                      />
                    ) : null}
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn"
                      disabled={busy}
                      onClick={(e) => { void saveEdit(d, e); }}
                      aria-label="ذخیره"
                      title="ذخیره"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn"
                      disabled={busy}
                      onClick={cancelEdit}
                      aria-label="انصراف"
                      title="انصراف"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="shirazeh-pm__item-name">
                    <span>
                      {d.nameFa} <span style={{ opacity: 0.6 }}>({d.code})</span>
                      {d.uomId ? (
                        <span className="shirazeh-pm__item-unit">
                          {' · '}
                          {uoms.find((item) => item.id === d.uomId)?.nameFa || 'واحد'}
                        </span>
                      ) : null}
                    </span>
                  </span>
                )}
                {canManage && !isEditing && (
                  <div className="shirazeh-pm__item-actions">
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn"
                      disabled={busy}
                      onClick={(e) => startEdit(d, e)}
                      aria-label="ویرایش ویژگی"
                      title="ویرایش"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger"
                      disabled={busy}
                      onClick={() => { void handleDeleteDefinition(d); }}
                      aria-label="حذف ویژگی"
                      title="حذف"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {showSchema && (
      <div className="shirazeh-pm__schema-panel">
        {compact ? null : (
        <h3 className="shirazeh-pm__col-title">
          {mode === 'allowed-values'
            ? `مقادیر مجاز ${selectedType ? `— ${selectedType.name}` : ''}`
            : `ویژگی‌های نوع کالا ${selectedType ? `— ${selectedType.name}` : ''}`}
        </h3>
        )}

        {selectedTypeId && (
          <>
            {schemaError ? (
              <p className="vitrin-structure__skip">
                بارگذاری ویژگی‌های این نوع ناموفق بود.
                {' '}
                <button
                  type="button"
                  className="shirazeh-pm__btn shirazeh-pm__btn--ghost"
                  disabled={busy}
                  onClick={() => { void fetchSchemaForType(selectedTypeId); }}
                >
                  تلاش دوباره
                </button>
              </p>
            ) : null}
            {canManage && showBindForm && (
              <form className="shirazeh-pm__create" onSubmit={handleBind} style={{ flexWrap: 'wrap' }}>
                <select className="shirazeh-pm__select" value={bindDefId} onChange={(e) => setBindDefId(e.target.value)}>
                  <option value="">— انتخاب ویژگی —</option>
                  {unboundDefinitions.map((d) => {
                    const nameClash = unboundDefinitions.filter((other) => other.nameFa === d.nameFa).length > 1
                      || definitions.some((other) => other.id !== d.id && other.nameFa === d.nameFa);
                    return (
                      <option key={d.id} value={d.id}>
                        {nameClash ? `${d.nameFa} (${d.code})` : d.nameFa}
                      </option>
                    );
                  })}
                </select>
                <select
                  className="shirazeh-pm__select"
                  value={bindScope}
                  onChange={(e) => setBindScope(e.target.value)}
                  aria-label="سطح مقدار"
                >
                  {VALUE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <label className="shirazeh-pm__check">
                  <input type="checkbox" checked={bindRequired} onChange={(e) => setBindRequired(e.target.checked)} />
                  الزامی
                </label>
                <BindingDefaultFields
                  definition={bindDefinition}
                  hasDefault={bindHasDefault}
                  value={bindDefaultValue}
                  onHasDefaultChange={setBindHasDefault}
                  onValueChange={setBindDefaultValue}
                  enumOptions={bindDefinition?.allowedValues || []}
                />
                {bindDefinition && (bindDefinition.dataType === 'DECIMAL' || bindDefinition.dataType === 'INTEGER') && (
                  <>
                    <input
                      className="shirazeh-pm__input shirazeh-pm__input--narrow"
                      type="number"
                      step="any"
                      dir="ltr"
                      placeholder="حداقل"
                      value={bindMin}
                      onChange={(e) => setBindMin(e.target.value)}
                      aria-label="حداقل"
                    />
                    <input
                      className="shirazeh-pm__input shirazeh-pm__input--narrow"
                      type="number"
                      step="any"
                      dir="ltr"
                      placeholder="حداکثر"
                      value={bindMax}
                      onChange={(e) => setBindMax(e.target.value)}
                      aria-label="حداکثر"
                    />
                  </>
                )}
                <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy || !bindDefId}>
                  {compact ? <><Plus size={14} /> افزودن ویژگی</> : <><Link2 size={14} /> اتصال به نوع کالا</>}
                </button>
                {showEnumInBind && bindDefinition?.dataType === 'ENUM' && (
                  <fieldset className="shirazeh-pm__enum-fieldset">
                    <legend>گزینه‌های مجاز این نوع</legend>
                    <div className="shirazeh-pm__enum-options">
                      {(bindDefinition.allowedValues || []).map((opt) => (
                        <label key={opt.value} className="shirazeh-pm__enum-option">
                          <input
                            type="checkbox"
                            checked={bindAllowed.has(opt.value)}
                            onChange={() => toggleSetValue(setBindAllowed, opt.value)}
                          />
                          <span>{opt.labelFa || opt.value}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <p className="shirazeh-pm__bind-hint">
                  {mode === 'binding'
                    ? 'ویژگی را از بانک ویژگی‌ها انتخاب کنید. تیک پیش‌فرض مقدار نمایش در فهرست و پیش‌نمایش ثبت کالا است؛ در سفارش قابل تغییر می‌ماند و هویت کالا را عوض نمی‌کند.'
                    : 'الزامی بودن فقط اعتبارسنجی ورودی است و با سطح مقدار (کالا / تراکنش) جداست. پیش‌فرض اگر پر نشود در نام و فهرست می‌آید؛ هویت کالا از ویژگی‌های الزامی سطح کالا می‌آید.'}
                </p>
              </form>
            )}

            {enumOnly && visibleSchema.length === 0 && (
              <p className="shirazeh-pm__subtitle">این نوع کالا ویژگی فهرستی ندارد. این مرحله به‌صورت خودکار کامل است.</p>
            )}

            {enumOnly && visibleSchema.length > 0 && compact && (
              <div className="vitrin-structure__bind-list">
                {visibleSchema.map((entry) => {
                  const options = entry.binding.effectiveAllowedValues
                    || (entry.binding.overrideAllowedValues?.length
                      ? (entry.definition.allowedValues || []).filter((opt) => entry.binding.overrideAllowedValues.includes(opt.value))
                      : entry.definition.allowedValues || []);
                  const editing = editingBindingId === entry.binding.id;
                  return (
                    <div key={entry.binding.id} className="vitrin-structure__allowed-row">
                      <div className="vitrin-structure__allowed-head">
                        <span className="vitrin-structure__allowed-name">{entry.definition.nameFa}</span>
                        {canManage && (
                          <button
                            type="button"
                            className="shirazeh-pm__icon-btn"
                            disabled={busy}
                            onClick={() => (editing ? cancelEditBinding() : startEditBinding(entry))}
                            aria-label={`ویرایش ${entry.definition.nameFa}`}
                          >
                            {editing ? <X size={13} /> : <Pencil size={13} />}
                          </button>
                        )}
                      </div>
                      {editing ? (
                        <div className="shirazeh-pm__enum-options">
                          {(entry.definition.allowedValues || []).map((opt) => (
                            <label key={opt.value} className="shirazeh-pm__enum-option">
                              <input
                                type="checkbox"
                                checked={editAllowed.has(opt.value)}
                                onChange={() => toggleSetValue(setEditAllowed, opt.value)}
                              />
                              <span>{opt.labelFa || opt.value}</span>
                            </label>
                          ))}
                          <button type="button" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy} onClick={() => { void saveEditBinding(entry); }}>
                            ذخیره
                          </button>
                        </div>
                      ) : (
                        <p className="vitrin-structure__allowed-values">
                          {options.map((opt) => opt.labelFa || opt.value).join(' · ') || '—'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {enumOnly && visibleSchema.length > 0 && !compact && (
              <>
                <table className="jarian-table shirazeh-pm__table">
                  <thead>
                    <tr>
                      <th>ردیف</th>
                      <th>ویژگی</th>
                      <th>گزینه‌های مجاز این نوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSchema.map((entry, index) => (
                      <tr key={entry.binding.id}>
                        <td>{(index + 1).toLocaleString('fa-IR')}</td>
                        <td>{entry.definition.nameFa}</td>
                        <td>
                          <div className="shirazeh-pm__enum-options">
                            {(entry.definition.allowedValues || []).map((opt) => (
                              <label key={opt.value} className="shirazeh-pm__enum-option">
                                <input
                                  type="checkbox"
                                  checked={Boolean(allowedDrafts[entry.binding.id]?.has(opt.value))}
                                  onChange={() => toggleDraftValue(entry.binding.id, opt.value)}
                                  disabled={!canManage || busy}
                                />
                                <span>{opt.labelFa || opt.value}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canManage && (
                  <div className="offer-settings__actions">
                    <button type="button" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy} onClick={() => { void saveAllowedDrafts(); }}>
                      ذخیره مقادیر مجاز
                    </button>
                  </div>
                )}
              </>
            )}

            {!enumOnly && compact && (
              <div className="vitrin-structure__bind-list">
                {visibleSchema.length > 0 ? (
                  <p className="vitrin-structure__bind-meta">
                    {`${visibleSchema.length.toLocaleString('fa-IR')} ویژگی متصل به این نوع`}
                  </p>
                ) : null}
                {visibleSchema.length === 0 && !schemaError && (
                  <p className="vitrin-structure__skip">هنوز ویژگی‌ای به این نوع کالا متصل نشده است.</p>
                )}
                {visibleSchema.map((entry) => {
                  const { binding, definition } = entry;
                  if (!binding || !definition) return null;
                  const isEditing = editingBindingId === binding.id;
                  const isNumeric = definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER';
                  return (
                    <div key={binding.id} className="shirazeh-pm__item">
                      {isEditing ? (
                        <div className="shirazeh-pm__item-edit">
                          <span className="shirazeh-pm__item-name">{definition.nameFa}</span>
                          <select
                            className="shirazeh-pm__select"
                            value={editScope}
                            onChange={(e) => setEditScope(e.target.value)}
                            aria-label="سطح مقدار"
                          >
                            {VALUE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <label className="shirazeh-pm__check">
                            <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />
                            الزامی
                          </label>
                          <BindingDefaultFields
                            definition={definition}
                            hasDefault={editHasDefault}
                            value={editDefaultValue}
                            onHasDefaultChange={setEditHasDefault}
                            onValueChange={setEditDefaultValue}
                            enumOptions={(definition.allowedValues || []).filter((opt) => editAllowed.has(opt.value))}
                          />
                          {isNumeric && (
                            <>
                              <input
                                className="shirazeh-pm__input shirazeh-pm__input--narrow"
                                type="number"
                                step="any"
                                dir="ltr"
                                placeholder="حداقل"
                                value={editMin}
                                onChange={(e) => setEditMin(e.target.value)}
                                aria-label="حداقل"
                              />
                              <input
                                className="shirazeh-pm__input shirazeh-pm__input--narrow"
                                type="number"
                                step="any"
                                dir="ltr"
                                placeholder="حداکثر"
                                value={editMax}
                                onChange={(e) => setEditMax(e.target.value)}
                                aria-label="حداکثر"
                              />
                            </>
                          )}
                          <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={() => { void saveEditBinding(entry); }} aria-label="ذخیره" title="ذخیره">
                            <Check size={13} />
                          </button>
                          <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={cancelEditBinding} aria-label="انصراف" title="انصراف">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="shirazeh-pm__item-name">
                            <span>{definition.nameFa}</span>
                            <small className="vitrin-structure__bind-meta">{dataTypeLabel(definition.dataType)} · {bindingSummary(binding, definition)}</small>
                          </span>
                          {canManage && (
                            <div className="shirazeh-pm__item-actions">
                              <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={() => startEditBinding(entry)} aria-label="ویرایش اتصال" title="ویرایش">
                                <Pencil size={13} />
                              </button>
                              <button type="button" className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger" disabled={busy} onClick={() => { void handleUnbind(entry); }} aria-label="حذف اتصال" title="حذف اتصال">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!enumOnly && !compact && (
            <table className="jarian-table shirazeh-pm__table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>ویژگی</th>
                  <th>نوع داده</th>
                  <th>سطح</th>
                  <th>الزامی</th>
                  {mode === 'binding' ? <th>حداقل / حداکثر</th> : <th>گزینه‌های مجاز</th>}
                  <th>پیش‌فرض</th>
                  {canManage ? <th>ویرایش</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleSchema.map((entry, index) => {
                  const { binding, definition } = entry;
                  const isEditing = editingBindingId === binding.id;
                  const isNumeric = definition.dataType === 'DECIMAL' || definition.dataType === 'INTEGER';
                  return (
                    <tr key={binding.id}>
                      <td>{(index + 1).toLocaleString('fa-IR')}</td>
                      <td>{definition.nameFa}</td>
                      <td>{dataTypeLabel(definition.dataType)}</td>
                      <td>
                        {isEditing ? (
                          <select
                            className="shirazeh-pm__select"
                            value={editScope}
                            onChange={(e) => setEditScope(e.target.value)}
                            aria-label="سطح مقدار"
                          >
                            {VALUE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        ) : (
                          VALUE_SCOPES.find((s) => s.value === bindingScope(binding))?.label || bindingScope(binding)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="shirazeh-pm__edit-flags">
                            <label className="shirazeh-pm__check">
                              <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />
                              الزامی
                            </label>
                            {mode !== 'binding' && isNumeric && (
                              <>
                                <input
                                  className="shirazeh-pm__input shirazeh-pm__input--narrow"
                                  type="number"
                                  step="any"
                                  dir="ltr"
                                  placeholder="حداقل"
                                  value={editMin}
                                  onChange={(e) => setEditMin(e.target.value)}
                                  aria-label="حداقل"
                                />
                                <input
                                  className="shirazeh-pm__input shirazeh-pm__input--narrow"
                                  type="number"
                                  step="any"
                                  dir="ltr"
                                  placeholder="حداکثر"
                                  value={editMax}
                                  onChange={(e) => setEditMax(e.target.value)}
                                  aria-label="حداکثر"
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          binding.isRequired ? 'بله' : 'خیر'
                        )}
                      </td>
                      {mode === 'binding' ? (
                        <td>
                            {isEditing && isNumeric ? (
                              <div className="shirazeh-pm__edit-flags">
                                <input
                                  className="shirazeh-pm__input shirazeh-pm__input--narrow"
                                  type="number"
                                  step="any"
                                  dir="ltr"
                                  placeholder="حداقل"
                                  value={editMin}
                                  onChange={(e) => setEditMin(e.target.value)}
                                  aria-label="حداقل"
                                />
                                <input
                                  className="shirazeh-pm__input shirazeh-pm__input--narrow"
                                  type="number"
                                  step="any"
                                  dir="ltr"
                                  placeholder="حداکثر"
                                  value={editMax}
                                  onChange={(e) => setEditMax(e.target.value)}
                                  aria-label="حداکثر"
                                />
                              </div>
                            ) : (
                              isNumeric
                                ? [binding.overrideMin, binding.overrideMax].filter((value) => value != null).join(' — ') || '—'
                                : '—'
                            )}
                        </td>
                      ) : (
                      <td>
                        {isEditing && definition.dataType === 'ENUM' ? (
                          <div className="shirazeh-pm__enum-options">
                            {(definition.allowedValues || []).map((opt) => (
                              <label key={opt.value} className="shirazeh-pm__enum-option">
                                <input
                                  type="checkbox"
                                  checked={editAllowed.has(opt.value)}
                                  onChange={() => toggleSetValue(setEditAllowed, opt.value)}
                                />
                                <span>{opt.labelFa || opt.value}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          formatEffectiveAllowed(definition, binding)
                        )}
                      </td>
                      )}
                      <td>
                        {isEditing ? (
                          <div className="shirazeh-pm__edit-flags">
                            <BindingDefaultFields
                              definition={definition}
                              hasDefault={editHasDefault}
                              value={editDefaultValue}
                              onHasDefaultChange={setEditHasDefault}
                              onValueChange={setEditDefaultValue}
                              enumOptions={(definition.allowedValues || []).filter((opt) => editAllowed.has(opt.value))}
                            />
                          </div>
                        ) : (
                          binding.overrideDefaultValue || '—'
                        )}
                      </td>
                      {canManage ? (
                        <td>
                          {isEditing ? (
                            <div className="shirazeh-pm__item-actions">
                              <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={() => { void saveEditBinding(entry); }} aria-label="ذخیره" title="ذخیره">
                                <Check size={13} />
                              </button>
                              <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={cancelEditBinding} aria-label="انصراف" title="انصراف">
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="shirazeh-pm__item-actions">
                              <button type="button" className="shirazeh-pm__icon-btn" disabled={busy} onClick={() => startEditBinding(entry)} aria-label="ویرایش اتصال" title="ویرایش">
                                <Pencil size={13} />
                              </button>
                              <button type="button" className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger" disabled={busy} onClick={() => { void handleUnbind(entry); }} aria-label="حذف اتصال" title="حذف اتصال">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                {visibleSchema.length === 0 && (
                  <tr><td colSpan={canManage ? (mode === 'binding' ? 9 : 8) : (mode === 'binding' ? 8 : 7)} className="shirazeh-pm__empty">هنوز ویژگی‌ای به این نوع کالا متصل نشده است.</td></tr>
                )}
              </tbody>
            </table>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

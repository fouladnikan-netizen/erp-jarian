import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';
import { useUomStore } from '../../../stores/useUomStore';
import { useJarianNotice } from '../../../context/JarianNoticeContext';
import { suggestLatinName } from '../../../domain/productMaster/suggestLatinName';
import ProductMasterAlert, { productMasterErrorMessage } from './ProductMasterAlert';
import TypeOfferPanel from '../../../components/productMaster/TypeOfferPanel';
import useSuggestedLatin from './useSuggestedLatin';

const DEFAULT_GROUP_NAME = 'مقاطع فولادی';

function categoriesOf(categories, groupId) {
  if (!groupId) return [];
  return categories.filter((item) => item.groupId === groupId);
}

function typesOf(types, categoryId) {
  if (!categoryId) return [];
  return types.filter((item) => item.categoryId === categoryId);
}

function firstCategoryId(categories, groupId) {
  return categoriesOf(categories, groupId)[0]?.id || null;
}

function categoryGroupId(categories, categoryId) {
  return categories.find((item) => item.id === categoryId)?.groupId || null;
}

/**
 * Group -> Category -> Product Type miller columns (Finder / Linear cascade).
 * Hover previews the next pane; click pins it. SKU is generated internally.
 */
export default function TaxonomyTab({
  canManage,
  onSelectType,
  showOfferPanel = false,
  initialTypeId = null,
  focusPath = null,
  pathNonce = 0,
  defaultGroupName = DEFAULT_GROUP_NAME,
}) {
  const groups = useProductTaxonomyStore((s) => s.groups);
  const categories = useProductTaxonomyStore((s) => s.categories);
  const types = useProductTaxonomyStore((s) => s.types);
  const fetchAll = useProductTaxonomyStore((s) => s.fetchAll);
  const createGroup = useProductTaxonomyStore((s) => s.createGroup);
  const updateGroup = useProductTaxonomyStore((s) => s.updateGroup);
  const createCategory = useProductTaxonomyStore((s) => s.createCategory);
  const updateCategory = useProductTaxonomyStore((s) => s.updateCategory);
  const createType = useProductTaxonomyStore((s) => s.createType);
  const updateType = useProductTaxonomyStore((s) => s.updateType);
  const deleteGroup = useProductTaxonomyStore((s) => s.deleteGroup);
  const deleteCategory = useProductTaxonomyStore((s) => s.deleteCategory);
  const deleteType = useProductTaxonomyStore((s) => s.deleteType);
  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);
  const { confirm } = useJarianNotice();

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [hoveredGroupId, setHoveredGroupId] = useState(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const defaultApplied = useRef(false);
  const hoverSetTimer = useRef(null);
  const hoverClearTimer = useRef(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const groupLatin = useSuggestedLatin(newGroupName, suggestLatinName);
  const categoryLatin = useSuggestedLatin(newCategoryName, suggestLatinName);
  const typeLatin = useSuggestedLatin(newTypeName, suggestLatinName);
  const [busy, setBusy] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNameLatin, setEditNameLatin] = useState('');
  const [editLatinLocked, setEditLatinLocked] = useState(false);

  useEffect(() => { void fetchAll(); }, [fetchAll]);
  useEffect(() => { void fetchUoms(); }, [fetchUoms]);

  const cancelHoverTimers = () => {
    if (hoverSetTimer.current) {
      window.clearTimeout(hoverSetTimer.current);
      hoverSetTimer.current = null;
    }
    if (hoverClearTimer.current) {
      window.clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
  };

  useEffect(() => () => cancelHoverTimers(), []);

  const schedulePreview = (groupId, categoryId) => {
    if (hoverClearTimer.current) {
      window.clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
    if (hoverSetTimer.current) {
      window.clearTimeout(hoverSetTimer.current);
    }
    hoverSetTimer.current = window.setTimeout(() => {
      hoverSetTimer.current = null;
      setHoveredGroupId((prev) => (prev === groupId ? prev : groupId));
      setHoveredCategoryId((prev) => (prev === categoryId ? prev : categoryId));
    }, 140);
  };

  const scheduleClearPreview = () => {
    if (hoverSetTimer.current) {
      window.clearTimeout(hoverSetTimer.current);
      hoverSetTimer.current = null;
    }
    if (hoverClearTimer.current) {
      window.clearTimeout(hoverClearTimer.current);
    }
    hoverClearTimer.current = window.setTimeout(() => {
      hoverClearTimer.current = null;
      setHoveredGroupId(null);
      setHoveredCategoryId(null);
    }, 200);
  };

  const clearPreviewNow = () => {
    cancelHoverTimers();
    setHoveredGroupId(null);
    setHoveredCategoryId(null);
  };

  const activeGroupId = hoveredGroupId || selectedGroupId;
  const visibleCategories = useMemo(
    () => categoriesOf(categories, activeGroupId),
    [categories, activeGroupId],
  );
  const activeCategoryId = useMemo(() => {
    if (hoveredCategoryId && categoryGroupId(categories, hoveredCategoryId) === activeGroupId) {
      return hoveredCategoryId;
    }
    if ((!hoveredGroupId || hoveredGroupId === selectedGroupId)
      && categoryGroupId(categories, selectedCategoryId) === activeGroupId) {
      return selectedCategoryId;
    }
    return firstCategoryId(categories, activeGroupId);
  }, [
    activeGroupId,
    categories,
    hoveredCategoryId,
    hoveredGroupId,
    selectedCategoryId,
    selectedGroupId,
  ]);
  const visibleTypes = useMemo(
    () => typesOf(types, activeCategoryId),
    [types, activeCategoryId],
  );
  const categoryPreviewing = Boolean(hoveredGroupId && hoveredGroupId !== selectedGroupId);
  const typePreviewing = Boolean(
    (hoveredCategoryId && hoveredCategoryId !== selectedCategoryId)
    || categoryPreviewing,
  );

  useEffect(() => {
    onSelectType?.(selectedTypeId || null);
  }, [selectedTypeId, onSelectType]);

  useEffect(() => {
    if (!initialTypeId) return;
    const type = types.find((item) => item.id === initialTypeId);
    if (!type) return;
    const category = categories.find((item) => item.id === type.categoryId);
    setSelectedTypeId(type.id);
    setSelectedCategoryId(type.categoryId);
    setSelectedGroupId(category?.groupId || null);
    defaultApplied.current = true;
  }, [initialTypeId, types, categories]);

  useEffect(() => {
    if (!focusPath) return;
    setSelectedGroupId(focusPath.groupId || null);
    setSelectedCategoryId(focusPath.categoryId || null);
    setSelectedTypeId(focusPath.typeId || null);
    if (hoverSetTimer.current) {
      window.clearTimeout(hoverSetTimer.current);
      hoverSetTimer.current = null;
    }
    if (hoverClearTimer.current) {
      window.clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
    setHoveredGroupId(null);
    setHoveredCategoryId(null);
    setEditingKey(null);
    defaultApplied.current = true;
  }, [pathNonce, focusPath]);

  useEffect(() => {
    if (defaultApplied.current) return;
    if (!groups.length) return;
    if (initialTypeId || focusPath?.groupId) {
      defaultApplied.current = true;
      return;
    }
    const preferred = groups.find((item) => item.name === defaultGroupName) || groups[0];
    if (!preferred) return;
    setSelectedGroupId(preferred.id);
    setSelectedCategoryId(firstCategoryId(categories, preferred.id));
    defaultApplied.current = true;
  }, [groups, categories, defaultGroupName, focusPath, initialTypeId]);

  const pinGroup = (groupId) => {
    setSelectedGroupId(groupId);
    clearPreviewNow();
    const nextCategoryId = categoryGroupId(categories, selectedCategoryId) === groupId
      ? selectedCategoryId
      : firstCategoryId(categories, groupId);
    setSelectedCategoryId(nextCategoryId);
    if (!nextCategoryId || types.find((item) => item.id === selectedTypeId)?.categoryId !== nextCategoryId) {
      setSelectedTypeId(null);
    }
    setEditingKey(null);
  };

  const pinCategory = (category) => {
    setSelectedGroupId(category.groupId);
    setSelectedCategoryId(category.id);
    clearPreviewNow();
    if (types.find((item) => item.id === selectedTypeId)?.categoryId !== category.id) {
      setSelectedTypeId(null);
    }
    setEditingKey(null);
  };

  const pinType = (type) => {
    const category = categories.find((item) => item.id === type.categoryId);
    setSelectedTypeId(type.id);
    setSelectedCategoryId(type.categoryId);
    setSelectedGroupId(category?.groupId || selectedGroupId);
    clearPreviewNow();
    setEditingKey(null);
  };

  async function handleCreateGroup(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!newGroupName.trim()) return;
    setBusy(true);
    try {
      await createGroup({
        name: newGroupName.trim(),
        nameLatin: groupLatin.value.trim() || undefined,
      });
      setNewGroupName('');
      groupLatin.reset();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ثبت گروه ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!newCategoryName.trim() || !selectedGroupId) return;
    setBusy(true);
    try {
      await createCategory({
        groupId: selectedGroupId,
        name: newCategoryName.trim(),
        nameLatin: categoryLatin.value.trim() || undefined,
      });
      setNewCategoryName('');
      categoryLatin.reset();
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ثبت دسته ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateType(e) {
    e.preventDefault();
    setAlertMessage('');
    if (!newTypeName.trim() || !selectedCategoryId) return;
    setBusy(true);
    try {
      const saved = await createType({
        categoryId: selectedCategoryId,
        name: newTypeName.trim(),
        nameLatin: typeLatin.value.trim() || undefined,
      });
      setNewTypeName('');
      typeLatin.reset();
      if (saved?.id) {
        setSelectedTypeId(saved.id);
        onSelectType?.(saved.id);
      }
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ثبت نوع کالا ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  }

  const toggleActive = async (kind, item) => {
    setBusy(true);
    setAlertMessage('');
    try {
      if (kind === 'group') await updateGroup(item.id, { isActive: !item.isActive });
      if (kind === 'category') await updateCategory(item.id, { isActive: !item.isActive });
      if (kind === 'type') await updateType(item.id, { isActive: !item.isActive });
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'تغییر وضعیت ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const KIND_LABEL = { group: 'گروه', category: 'دسته', type: 'نوع کالا' };
  const handleDelete = async (kind, item, event) => {
    event.stopPropagation();
    const ok = await confirm({
      title: 'حذف',
      entity: item.name,
      message: `${KIND_LABEL[kind]} حذف شود؟`,
      hint: 'اگر در سطح پایین‌تر استفاده شده باشد، حذف انجام نمی‌شود.',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setAlertMessage('');
    try {
      if (kind === 'group') {
        await deleteGroup(item.id);
        if (selectedGroupId === item.id) {
          setSelectedGroupId(null);
          setSelectedCategoryId(null);
          setSelectedTypeId(null);
          defaultApplied.current = false;
        }
      }
      if (kind === 'category') {
        await deleteCategory(item.id);
        if (selectedCategoryId === item.id) {
          setSelectedCategoryId(null);
          setSelectedTypeId(null);
        }
      }
      if (kind === 'type') {
        await deleteType(item.id);
        if (selectedTypeId === item.id) setSelectedTypeId(null);
      }
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'حذف ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (kind, item, event) => {
    event.stopPropagation();
    setAlertMessage('');
    setEditingKey(`${kind}:${item.id}`);
    setEditName(item.name);
    setEditNameLatin(item.nameLatin || '');
    setEditLatinLocked(Boolean(item.nameLatin));
  };

  const cancelEdit = (event) => {
    event?.stopPropagation();
    setEditingKey(null);
    setEditName('');
    setEditNameLatin('');
    setEditLatinLocked(false);
  };

  const saveEdit = async (kind, item, event) => {
    event?.stopPropagation();
    const name = editName.trim();
    const nameLatin = editNameLatin.trim();
    if (!name) {
      setAlertMessage('نام نمی‌تواند خالی باشد.');
      return;
    }
    const latinUnchanged = nameLatin === (item.nameLatin || '');
    if (name === item.name && latinUnchanged) {
      setEditingKey(null);
      setEditName('');
      setEditNameLatin('');
      return;
    }
    setBusy(true);
    setAlertMessage('');
    try {
      const patch = { name, nameLatin };
      if (kind === 'group') await updateGroup(item.id, patch);
      if (kind === 'category') await updateCategory(item.id, patch);
      if (kind === 'type') await updateType(item.id, patch);
      setEditingKey(null);
      setEditName('');
      setEditNameLatin('');
    } catch (err) {
      setAlertMessage(productMasterErrorMessage(err, 'ویرایش نام ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const renderItem = (kind, item, { selected, previewed, onSelect, onPreview, childCount }) => {
    const isEditing = editingKey === `${kind}:${item.id}`;
    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        className={`shirazeh-pm__item${selected ? ' shirazeh-pm__item--selected' : ''}${previewed && !selected ? ' shirazeh-pm__item--preview' : ''}${!item.isActive ? ' shirazeh-pm__item--inactive' : ''}`}
        onClick={() => { if (!isEditing) onSelect(); }}
        onPointerEnter={() => { if (!isEditing) onPreview?.(); }}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {isEditing ? (
          <div className="shirazeh-pm__item-edit" onClick={(e) => e.stopPropagation()}>
            <input
              className="shirazeh-pm__input"
              value={editName}
              onChange={(e) => {
                const next = e.target.value;
                setEditName(next);
                if (!editLatinLocked) setEditNameLatin(suggestLatinName(next));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void saveEdit(kind, item, e);
                }
                if (e.key === 'Escape') cancelEdit(e);
              }}
              autoFocus
              aria-label="نام فارسی"
            />
            {(kind === 'group' || kind === 'category' || kind === 'type') && (
              <input
                className="shirazeh-pm__input"
                dir="ltr"
                value={editNameLatin}
                onChange={(e) => {
                  const next = e.target.value;
                  setEditNameLatin(next);
                  setEditLatinLocked(next.trim() !== '');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void saveEdit(kind, item, e);
                  }
                  if (e.key === 'Escape') cancelEdit(e);
                }}
                placeholder="نام لاتین (پیشنهاد)"
                aria-label="نام لاتین"
              />
            )}
            <button
              type="button"
              className="shirazeh-pm__icon-btn"
              disabled={busy}
              onClick={(e) => { void saveEdit(kind, item, e); }}
              aria-label="ذخیره"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="shirazeh-pm__icon-btn"
              disabled={busy}
              onClick={cancelEdit}
              aria-label="انصراف"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <span className="shirazeh-pm__item-name">
            <span>{item.name}</span>
            {item.nameLatin ? (
              <small className="shirazeh-pm__item-latin" dir="ltr">{item.nameLatin}</small>
            ) : null}
          </span>
        )}
        {typeof childCount === 'number' && !isEditing ? (
          <span className="shirazeh-pm__item-count">{childCount.toLocaleString('fa-IR')}</span>
        ) : null}
        {kind !== 'type' && !isEditing ? (
          <ChevronLeft className="shirazeh-pm__item-chevron" size={14} aria-hidden="true" />
        ) : null}
        {canManage && !isEditing && (
          <div className="shirazeh-pm__item-actions">
            <button
              type="button"
              className="shirazeh-pm__icon-btn"
              disabled={busy}
              onClick={(e) => startEdit(kind, item, e)}
              aria-label="ویرایش نام"
              title="ویرایش نام"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              className="shirazeh-pm__icon-btn"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); void toggleActive(kind, item); }}
              aria-label={item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
              title={item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
            >
              <Power size={13} />
            </button>
            <button
              type="button"
              className="shirazeh-pm__icon-btn shirazeh-pm__icon-btn--danger"
              disabled={busy}
              onClick={(e) => { void handleDelete(kind, item, e); }}
              aria-label="حذف"
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="shirazeh-pm__taxonomy">
      <ProductMasterAlert message={alertMessage} onClose={() => setAlertMessage('')} />
      <div
        className="shirazeh-pm__body shirazeh-pm__body--miller"
        onPointerEnter={() => {
          if (hoverClearTimer.current) {
            window.clearTimeout(hoverClearTimer.current);
            hoverClearTimer.current = null;
          }
        }}
        onPointerLeave={scheduleClearPreview}
      >

      <div className="shirazeh-pm__col">
        <h3 className="shirazeh-pm__col-title">گروه کالا</h3>
        <div className="shirazeh-pm__list">
          {groups.length === 0 && <div className="shirazeh-pm__empty">گروهی ثبت نشده است.</div>}
          {groups.map((g) => renderItem('group', g, {
            selected: selectedGroupId === g.id,
            previewed: hoveredGroupId === g.id,
            childCount: categoriesOf(categories, g.id).length,
            onPreview: () => {
              if (g.id === selectedGroupId) {
                if (hoverSetTimer.current) {
                  window.clearTimeout(hoverSetTimer.current);
                  hoverSetTimer.current = null;
                }
                if (hoveredGroupId !== null || hoveredCategoryId !== null) {
                  setHoveredGroupId(null);
                  setHoveredCategoryId(null);
                }
                return;
              }
              schedulePreview(g.id, null);
            },
            onSelect: () => pinGroup(g.id),
          }))}
        </div>
        {canManage && (
          <form className="shirazeh-pm__create" onSubmit={handleCreateGroup}>
            <input
              className="shirazeh-pm__input"
              placeholder="نام فارسی گروه"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <input
              className="shirazeh-pm__input"
              dir="ltr"
              placeholder="نام لاتین (پیشنهاد)"
              value={groupLatin.value}
              onChange={(e) => groupLatin.onChange(e.target.value)}
            />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن گروه
            </button>
          </form>
        )}
      </div>

      <div className={`shirazeh-pm__col${categoryPreviewing ? ' shirazeh-pm__col--preview' : ''}`}>
        <h3 className="shirazeh-pm__col-title">
          دسته کالا
          <span className="shirazeh-pm__col-hint" data-visible={categoryPreviewing ? 'true' : 'false'}>پیش‌نمایش</span>
        </h3>
        <div className="shirazeh-pm__list">
          {!activeGroupId && <div className="shirazeh-pm__empty">گروه را انتخاب کنید.</div>}
          {activeGroupId && visibleCategories.length === 0 && <div className="shirazeh-pm__empty">دسته‌ای ثبت نشده است.</div>}
          {visibleCategories.map((c) => renderItem('category', c, {
            selected: selectedCategoryId === c.id && selectedGroupId === c.groupId && !categoryPreviewing,
            previewed: activeCategoryId === c.id,
            childCount: typesOf(types, c.id).length,
            onPreview: () => {
              if (c.id === selectedCategoryId && c.groupId === selectedGroupId) {
                if (hoverSetTimer.current) {
                  window.clearTimeout(hoverSetTimer.current);
                  hoverSetTimer.current = null;
                }
                if (hoveredGroupId !== null || hoveredCategoryId !== null) {
                  setHoveredGroupId(null);
                  setHoveredCategoryId(null);
                }
                return;
              }
              schedulePreview(c.groupId, c.id);
            },
            onSelect: () => pinCategory(c),
          }))}
        </div>
        {canManage && selectedGroupId && (
          <form
            className={`shirazeh-pm__create${categoryPreviewing ? ' shirazeh-pm__create--inert' : ''}`}
            onSubmit={handleCreateCategory}
            aria-hidden={categoryPreviewing}
          >
            <input
              className="shirazeh-pm__input"
              placeholder="نام فارسی دسته"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <input
              className="shirazeh-pm__input"
              dir="ltr"
              placeholder="نام لاتین (پیشنهاد)"
              value={categoryLatin.value}
              onChange={(e) => categoryLatin.onChange(e.target.value)}
            />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن دسته
            </button>
          </form>
        )}
      </div>

      <div className={`shirazeh-pm__col${typePreviewing ? ' shirazeh-pm__col--preview' : ''}`}>
        <h3 className="shirazeh-pm__col-title">
          نوع کالا
          <span className="shirazeh-pm__col-hint" data-visible={typePreviewing ? 'true' : 'false'}>پیش‌نمایش</span>
        </h3>
        <div className="shirazeh-pm__list">
          {!activeCategoryId && <div className="shirazeh-pm__empty">دسته را انتخاب کنید.</div>}
          {activeCategoryId && visibleTypes.length === 0 && <div className="shirazeh-pm__empty">نوع کالایی ثبت نشده است.</div>}
          {visibleTypes.map((t) => renderItem('type', t, {
            selected: selectedTypeId === t.id && !typePreviewing,
            previewed: false,
            onPreview: () => {
              const category = categories.find((item) => item.id === t.categoryId);
              if (!category) return;
              if (category.id === selectedCategoryId && category.groupId === selectedGroupId) {
                if (hoverSetTimer.current) {
                  window.clearTimeout(hoverSetTimer.current);
                  hoverSetTimer.current = null;
                }
                return;
              }
              schedulePreview(category.groupId, category.id);
            },
            onSelect: () => pinType(t),
          }))}
        </div>
        {canManage && selectedCategoryId && (
          <form
            className={`shirazeh-pm__create${typePreviewing ? ' shirazeh-pm__create--inert' : ''}`}
            onSubmit={handleCreateType}
            aria-hidden={typePreviewing}
          >
            <input
              className="shirazeh-pm__input"
              placeholder="نام فارسی نوع کالا"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
            <input
              className="shirazeh-pm__input"
              dir="ltr"
              placeholder="نام لاتین (پیشنهاد)"
              value={typeLatin.value}
              onChange={(e) => typeLatin.onChange(e.target.value)}
            />
            <button type="submit" className="shirazeh-pm__btn shirazeh-pm__btn--primary" disabled={busy}>
              <Plus size={14} /> افزودن نوع
            </button>
          </form>
        )}
        {selectedTypeId && showOfferPanel && (
          <TypeOfferPanel
            type={types.find((t) => t.id === selectedTypeId)}
            uoms={uoms}
            canManage={canManage}
            onSave={async (patch) => {
              setBusy(true);
              setAlertMessage('');
              try {
                await updateType(selectedTypeId, patch);
              } catch (err) {
                setAlertMessage(productMasterErrorMessage(err, 'ذخیره واحد و عرضه ناموفق بود.'));
              } finally {
                setBusy(false);
              }
            }}
            busy={busy}
          />
        )}
      </div>
      </div>
    </div>
  );
}

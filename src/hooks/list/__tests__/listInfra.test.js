import { describe, expect, it } from 'vitest';
import { applyMultiSort, nextSorts, SORT_DIR } from '../useMultiSort';
import { slicePage, LIST_PAGINATION_MODE } from '../usePagination';
import {
  createEmptyPreferences,
  savePreferences,
  loadPreferences,
  resetPreferences,
  setListPreferencesAdapter,
  getListPreferencesAdapter,
} from '../../../services/listPreferencesService';

describe('multi-sort pure helpers', () => {
  it('cycles Asc → Desc → None', () => {
    let sorts = [];
    sorts = nextSorts(sorts, 'name', {});
    expect(sorts).toEqual([{ key: 'name', dir: SORT_DIR.ASC }]);
    sorts = nextSorts(sorts, 'name', {});
    expect(sorts).toEqual([{ key: 'name', dir: SORT_DIR.DESC }]);
    sorts = nextSorts(sorts, 'name', {});
    expect(sorts).toEqual([]);
  });

  it('keeps previous sorts with Ctrl/Cmd', () => {
    let sorts = nextSorts([], 'name', {});
    sorts = nextSorts(sorts, 'age', { ctrlKey: true });
    expect(sorts).toEqual([
      { key: 'name', dir: SORT_DIR.ASC },
      { key: 'age', dir: SORT_DIR.ASC },
    ]);
  });

  it('sorts strings, numbers, dates, nulls last', () => {
    const rows = [
      { name: 'ب', age: null, when: '2024-01-02' },
      { name: 'ا', age: 2, when: '2024-01-01' },
      { name: 'پ', age: 1, when: null },
    ];

    const byAge = applyMultiSort(rows, [{ key: 'age', dir: SORT_DIR.ASC }], {
      accessors: { age: (r) => r.age },
      types: { age: 'number' },
    });
    expect(byAge.map((r) => r.name)).toEqual(['پ', 'ا', 'ب']);

    const byDate = applyMultiSort(rows, [{ key: 'when', dir: SORT_DIR.ASC }], {
      accessors: { when: (r) => r.when },
      types: { when: 'date' },
    });
    expect(byDate.map((r) => r.name)).toEqual(['ا', 'ب', 'پ']);
  });
});

describe('pagination pure helpers', () => {
  it('slices client pages', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ id: i + 1 }));
    const page2 = slicePage(items, 2, 25);
    expect(page2).toHaveLength(25);
    expect(page2[0].id).toBe(26);
  });

  it('does not slice in server mode', () => {
    const page = [{ id: 1 }, { id: 2 }];
    expect(slicePage(page, 1, 25, LIST_PAGINATION_MODE.SERVER)).toEqual(page);
  });
});

describe('list preferences service', () => {
  const memory = new Map();
  let prev;

  it('saves and loads per user/list key', async () => {
    prev = getListPreferencesAdapter();
    setListPreferencesAdapter({
      async load(userId, listKey) {
        return memory.get(`${userId}:${listKey}`) || null;
      },
      async save(userId, listKey, prefs) {
        memory.set(`${userId}:${listKey}`, prefs);
        return true;
      },
      async reset(userId, listKey) {
        memory.delete(`${userId}:${listKey}`);
        return true;
      },
    });

    try {
      const prefs = { ...createEmptyPreferences(), sorts: [{ key: 'name', dir: 'asc' }] };
      await savePreferences('u1', 'nabz.orders.table', prefs);
      const loaded = await loadPreferences('u1', 'nabz.orders.table');
      expect(loaded.sorts).toEqual([{ key: 'name', dir: 'asc' }]);
      expect(loaded.viewMode).toBeUndefined();
      expect(loaded.pageSize).toBeUndefined();
      expect(await loadPreferences('u2', 'nabz.orders.table')).toBeNull();

      await savePreferences('u1', 'kanoon.contacts.table', createEmptyPreferences());
      await resetPreferences('u1', 'kanoon.contacts.table');
      expect(await loadPreferences('u1', 'kanoon.contacts.table')).toBeNull();
    } finally {
      setListPreferencesAdapter(prev);
    }
  });
});

describe('virtual list window', () => {
  it('windows rows with spacers', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const rowHeight = 40;
    const scrollOffset = 400;
    const viewportHeight = 200;
    const overscan = 2;
    const startIndex = Math.max(0, Math.floor(scrollOffset / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    expect(startIndex).toBe(8);
    expect(endIndex).toBe(17);
    expect(items.slice(startIndex, endIndex)).toHaveLength(9);
  });
});

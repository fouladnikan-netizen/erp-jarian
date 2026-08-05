import { create } from 'zustand';

/**
 * Version bump store — repository remains SSOT.
 */
export const useMowjStore = create((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

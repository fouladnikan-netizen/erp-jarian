/**
 * Lightweight subscription store — data lives in repository.
 * Facade bumps version after mutations so React hooks re-read.
 */

import { create } from 'zustand';

export const useOfficialRecordStore = create((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

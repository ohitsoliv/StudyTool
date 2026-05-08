import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EdgeType } from '../types/graph';

export type SessionMode = 'open' | 'class-study' | 'exam-prep';

interface PersistedPrefs {
  masteryBrightness: number;
  masteryLow: string;
  masteryMid: string;
  masteryHigh: string;
  hideSidebarDrills: boolean;
  showRecommendedLensIndicator: boolean;
  defaultSessionMode: SessionMode;
  lensNameMemorizer: string;
  lensNameArchitect: string;
  lensNamePractitioner: string;
  edgeNicknameParentChild: string;
  edgeNicknameRelated: string;
  edgeNicknamePrerequisite: string;
  edgeNicknameSequence: string;
}

interface TransientUi {
  settingsOpen: boolean;
  legendOpen: boolean;
}

interface Actions {
  setMasteryBrightness: (v: number) => void;
  setMasteryLow: (v: string) => void;
  setMasteryMid: (v: string) => void;
  setMasteryHigh: (v: string) => void;
  setHideSidebarDrills: (v: boolean) => void;
  setShowRecommendedLensIndicator: (v: boolean) => void;
  setDefaultSessionMode: (v: SessionMode) => void;
  setLensName: (lens: 'memorizer' | 'architect' | 'practitioner', v: string) => void;
  setEdgeNickname: (type: EdgeType, v: string) => void;
  resetToDefaults: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleLegend: () => void;
  closeLegend: () => void;
  getEdgeNickname: (type: EdgeType) => string;
}

type Store = PersistedPrefs & TransientUi & Actions;

const DEFAULTS: PersistedPrefs = {
  masteryBrightness: 1.0,
  masteryLow: '#a8453a',
  masteryMid: '#d4924a',
  masteryHigh: '#5a7a4a',
  hideSidebarDrills: false,
  showRecommendedLensIndicator: false,
  defaultSessionMode: 'open',
  lensNameMemorizer: 'Memorizer',
  lensNameArchitect: 'Architect',
  lensNamePractitioner: 'Practitioner',
  edgeNicknameParentChild: 'parent-child',
  edgeNicknameRelated: 'related',
  edgeNicknamePrerequisite: 'prerequisite',
  edgeNicknameSequence: 'sequence',
};

export const useUserPrefsStore = create<Store>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      settingsOpen: false,
      legendOpen: false,

      setMasteryBrightness: (v) => set({ masteryBrightness: v }),
      setMasteryLow: (v) => set({ masteryLow: v }),
      setMasteryMid: (v) => set({ masteryMid: v }),
      setMasteryHigh: (v) => set({ masteryHigh: v }),
      setHideSidebarDrills: (v) => set({ hideSidebarDrills: v }),
      setShowRecommendedLensIndicator: (v) => set({ showRecommendedLensIndicator: v }),
      setDefaultSessionMode: (v) => set({ defaultSessionMode: v }),
      setLensName: (lens, v) =>
        set(
          lens === 'memorizer'
            ? { lensNameMemorizer: v }
            : lens === 'architect'
            ? { lensNameArchitect: v }
            : { lensNamePractitioner: v }
        ),
      setEdgeNickname: (type, v) =>
        set(
          type === 'parent-child'
            ? { edgeNicknameParentChild: v }
            : type === 'related'
            ? { edgeNicknameRelated: v }
            : type === 'prerequisite'
            ? { edgeNicknamePrerequisite: v }
            : { edgeNicknameSequence: v }
        ),
      resetToDefaults: () => set({ ...DEFAULTS }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      toggleLegend: () => set((s) => ({ legendOpen: !s.legendOpen })),
      closeLegend: () => set({ legendOpen: false }),
      getEdgeNickname: (type) => {
        const s = get();
        switch (type) {
          case 'parent-child': return s.edgeNicknameParentChild;
          case 'related': return s.edgeNicknameRelated;
          case 'prerequisite': return s.edgeNicknamePrerequisite;
          case 'sequence': return s.edgeNicknameSequence;
        }
      },
    }),
    {
      name: 'nexus-user-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedPrefs => ({
        masteryBrightness: s.masteryBrightness,
        masteryLow: s.masteryLow,
        masteryMid: s.masteryMid,
        masteryHigh: s.masteryHigh,
        hideSidebarDrills: s.hideSidebarDrills,
        showRecommendedLensIndicator: s.showRecommendedLensIndicator,
        defaultSessionMode: s.defaultSessionMode,
        lensNameMemorizer: s.lensNameMemorizer,
        lensNameArchitect: s.lensNameArchitect,
        lensNamePractitioner: s.lensNamePractitioner,
        edgeNicknameParentChild: s.edgeNicknameParentChild,
        edgeNicknameRelated: s.edgeNicknameRelated,
        edgeNicknamePrerequisite: s.edgeNicknamePrerequisite,
        edgeNicknameSequence: s.edgeNicknameSequence,
      }),
    }
  )
);

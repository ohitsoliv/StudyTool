import { create } from "zustand";

type ViewMode = "canvas" | "focus" | "dual";

interface ViewState {
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
  toggleViewMode: () => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setViewMode: (mode: 'canvas' | 'focus' | 'dual') => void;
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: "canvas",
  sidebarCollapsed: false,
  inspectorCollapsed: false,

  toggleViewMode: () =>
    set((s) => ({ viewMode: s.viewMode === "canvas" ? "focus" : "canvas" })),
  
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  toggleInspector: () =>
    set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
}));

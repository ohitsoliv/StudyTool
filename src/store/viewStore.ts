import { create } from "zustand";

type ViewMode = "canvas" | "focus";

interface ViewState {
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
  toggleViewMode: () => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: "canvas",
  sidebarCollapsed: false,
  inspectorCollapsed: false,

  toggleViewMode: () =>
    set((s) => ({ viewMode: s.viewMode === "canvas" ? "focus" : "canvas" })),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  toggleInspector: () =>
    set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),
}));

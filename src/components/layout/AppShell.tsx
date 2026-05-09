import Sidebar from "./Sidebar";
import Inspector from "./Inspector";
import GraphCanvas from "../canvas/GraphCanvas";
import UniverseCanvas from "../canvas/UniverseCanvas";
import FocusWorkspace from "../workspace/FocusWorkspace";
import { useViewStore } from "../../store/viewStore";

export default function AppShell(): JSX.Element {
  const viewMode = useViewStore((s) => s.viewMode);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "auto 1fr auto",
        gridTemplateRows: "100vh",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <Sidebar />

      <main style={{ overflow: "hidden", position: "relative" }}>
        {viewMode === "universe" ? (
          <UniverseCanvas />
        ) : viewMode === "canvas" ? (
          <GraphCanvas />
        ) : viewMode === "dual" ? (
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            <div style={{ flex: 1, minWidth: 0, borderRight: "1px solid var(--panel-border)" }}>
              <GraphCanvas />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FocusWorkspace />
            </div>
          </div>
        ) : (
          <FocusWorkspace />
        )}
      </main>

      <Inspector />
    </div>
  );
}

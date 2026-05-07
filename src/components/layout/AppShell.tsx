import Sidebar from "./Sidebar";
import Inspector from "./Inspector";
import GraphCanvas from "../canvas/GraphCanvas";
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
        {viewMode === "canvas" ? <GraphCanvas /> : <FocusWorkspace />}
      </main>

      <Inspector />
    </div>
  );
}

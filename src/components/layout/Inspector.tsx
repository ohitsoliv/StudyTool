import { useViewStore } from "../../store/viewStore";
import { PanelRight } from "lucide-react";

export default function Inspector(): JSX.Element {
  const { inspectorCollapsed, toggleInspector } = useViewStore();

  return (
    <aside
      style={{
        width: inspectorCollapsed ? "var(--inspector-collapsed)" : "var(--inspector-width)",
        minWidth: inspectorCollapsed ? "var(--inspector-collapsed)" : "var(--inspector-width)",
        background: "var(--panel-bg)",
        borderLeft: "1px solid var(--panel-border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
      }}
    >
      <button
        onClick={toggleInspector}
        title="Toggle Inspector"
        style={{
          padding: "12px",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: inspectorCollapsed ? "center" : "flex-start",
        }}
      >
        <PanelRight size={18} />
      </button>

      {!inspectorCollapsed && (
        <div style={{ padding: "8px 12px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 4px 4px" }}>
            Inspector
          </p>
          <p style={{ color: "var(--text-muted)", padding: "8px 4px" }}>
            Select a node to inspect it.
          </p>
        </div>
      )}
    </aside>
  );
}

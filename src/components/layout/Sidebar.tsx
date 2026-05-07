import { useViewStore } from "../../store/viewStore";
import { PanelLeft } from "lucide-react";

export default function Sidebar(): JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useViewStore();

  return (
    <aside
      style={{
        width: sidebarCollapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
        minWidth: sidebarCollapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
        background: "var(--panel-bg)",
        borderRight: "1px solid var(--panel-border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
      }}
    >
      <button
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        style={{
          padding: "12px",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: sidebarCollapsed ? "center" : "flex-end",
        }}
      >
        <PanelLeft size={18} />
      </button>

      {!sidebarCollapsed && (
        <nav
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 4px 4px" }}>
            Navigation
          </p>
          <span style={{ padding: "6px 8px", borderRadius: "6px", background: "rgba(107, 138, 253, 0.15)", color: "var(--accent)" }}>
            Knowledge Map
          </span>
        </nav>
      )}
    </aside>
  );
}

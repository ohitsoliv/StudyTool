import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useGraphStore } from "../../store/graphStore";
import { GraphMetadata } from "../../types/graph";
import { seedGraph } from "../../scripts/seedGraph";
import { useViewStore } from "../../store/viewStore";
import {
  listGraphs,
  createGraph,
  getUserId,
  STORAGE_MODE,
  resetAll,
} from '../../services/storage';
export default function Sidebar(): JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useViewStore();
  const [graphs, setGraphs] = useState<GraphMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentGraphId, setCurrentGraph } = useGraphStore();
  const [creatingGraph, setCreatingGraph] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');

  const fetchGraphs = async (): Promise<void> => {
    const result = await listGraphs(getUserId());
    setGraphs(result);
    setLoading(false);
  };

  useEffect(() => {
    void fetchGraphs();
  }, []);

  const startCreate = (): void => {
    setNewGraphName('');
    setCreatingGraph(true);
  };

  const commitCreate = async (): Promise<void> => {
    const name = newGraphName.trim();
    setCreatingGraph(false);
    setNewGraphName('');
    if (!name) return;
    const id = await createGraph(getUserId(), name);
    await fetchGraphs();
    setCurrentGraph(id);
  };

  const cancelCreate = (): void => {
    setCreatingGraph(false);
    setNewGraphName('');
  };

  const handleSeed = async (): Promise<void> => {
    if (!confirm('Seed the database with "Embedded Systems Sandbox"?')) return;
    await seedGraph();
    await fetchGraphs();
  };

  const handleResetLocal = async () => {
    if (!window.confirm('Wipe all local data? This cannot be undone.')) return;
    setCurrentGraph(null);
    await resetAll();
    await fetchGraphs();
  };

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
            gap: "8px",
          }}
        >
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 4px 4px",
            }}
          >
            Navigation
          </p>
          <span
            style={{
              padding: "6px 8px",
              borderRadius: "6px",
              background: "rgba(107, 138, 253, 0.15)",
              color: "var(--accent)",
            }}
          >
            Knowledge Map
          </span>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 4px 4px",
            }}
          >
            Graphs
          </p>

          {loading && (
            <p style={{ color: "var(--text-muted, #888)", fontSize: 14, padding: "0 4px" }}>
              Loading...
            </p>
          )}
          {!loading && graphs.length === 0 && (
            <p style={{ color: "var(--text-muted, #888)", fontSize: 14, padding: "0 4px" }}>
              No graphs yet.
            </p>
          )}

          {graphs.map((g) => (
            <button
              key={g.id}
              onClick={() => setCurrentGraph(g.id)}
              style={{
                textAlign: "left",
                background:
                  g.id === currentGraphId ? "var(--accent, #4f46e5)" : "transparent",
                color: g.id === currentGraphId ? "#fff" : "inherit",
                border: "1px solid var(--panel-border)",
                borderRadius: 6,
                padding: "0.45rem 0.6rem",
                cursor: "pointer",
              }}
            >
              {g.name}
            </button>
          ))}

          {creatingGraph ? (
            <input
              autoFocus
              value={newGraphName}
              onChange={(e) => setNewGraphName(e.target.value)}
              onBlur={() => void commitCreate()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitCreate();
                if (e.key === 'Escape') cancelCreate();
              }}
              placeholder="Graph name…"
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem',
                background: '#1a1a1f',
                border: '1px solid #6b8afd',
                borderRadius: 6,
                color: '#e8e8ea',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                marginTop: '0.35rem',
              }}
            />
          ) : (
            <button
              onClick={startCreate}
              style={{
                marginTop: "0.35rem",
                cursor: "pointer",
                border: "1px solid var(--panel-border)",
                borderRadius: 6,
                padding: "0.45rem 0.6rem",
                textAlign: "left",
              }}
            >
              + New Graph
            </button>
          )}

          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 4px 4px",
              marginTop: 4,
            }}
          >
            Dev
          </p>
          <button
            onClick={handleSeed}
            style={{
              cursor: "pointer",
              border: "1px solid var(--panel-border)",
              borderRadius: 6,
              padding: "0.45rem 0.6rem",
              textAlign: "left",
            }}
          >
            Seed Database
          </button>

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted, #888)' }}>
            Mode: {STORAGE_MODE.toUpperCase()}
          </div>

          {STORAGE_MODE === 'local' && (
            <button
              type="button"
              onClick={handleResetLocal}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: '1px solid rgba(200, 80, 80, 0.4)',
                color: '#c0504a',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Reset Local Data
            </button>
          )}
        </nav>
      )}
    </aside>
  );
}
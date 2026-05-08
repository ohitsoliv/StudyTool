import { useEffect, useState } from "react";
import { useUserPrefsStore } from "../../store/userPrefsStore";
import { PanelLeft, Settings } from "lucide-react";
import { useGraphStore } from "../../store/graphStore";
import { GraphMetadata } from "../../types/graph";
import { seedGraph, seedLinearAlgebra, seedLgbtqIdentityVocabulary } from "../../scripts/seedGraph";
import { useViewStore } from "../../store/viewStore";
import { useDrillStore } from '../../store/drillStore';
import { useSessionStore } from '../../store/sessionStore';
import {
  listGraphs,
  createGraph,
  getUserId,
  STORAGE_MODE,
  resetAll,
} from '../../services/storage';

export default function Sidebar(): JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useViewStore();
  const hideSidebarDrills = useUserPrefsStore((s) => s.hideSidebarDrills);
  const [graphs, setGraphs] = useState<GraphMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentGraphId, setCurrentGraph } = useGraphStore();
  const [drillUnavailable, setDrillUnavailable] = useState(false);
  const [missingLinkUnavailable, setMissingLinkUnavailable] = useState(false);
  const [clusterTitleUnavailable, setClusterTitleUnavailable] = useState(false);
  const [sorterUnavailable, setSorterUnavailable] = useState(false);
  const [scenarioBuilderUnavailable, setScenarioBuilderUnavailable] = useState(false);
  const [debuggerUnavailable, setDebuggerUnavailable] = useState(false);
  const [creatingGraph, setCreatingGraph] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');

  useEffect(() => {
    if (!drillUnavailable) return;
    const t = setTimeout(() => setDrillUnavailable(false), 3000);
    return () => clearTimeout(t);
  }, [drillUnavailable]);

  useEffect(() => {
    if (!missingLinkUnavailable) return;
    const t = setTimeout(() => setMissingLinkUnavailable(false), 3000);
    return () => clearTimeout(t);
  }, [missingLinkUnavailable]);

  useEffect(() => {
    if (!clusterTitleUnavailable) return;
    const t = setTimeout(() => setClusterTitleUnavailable(false), 3000);
    return () => clearTimeout(t);
  }, [clusterTitleUnavailable]);

  useEffect(() => {
    if (!sorterUnavailable) return;
    const t = setTimeout(() => setSorterUnavailable(false), 3000);
    return () => clearTimeout(t);
  }, [sorterUnavailable]);

  useEffect(() => {
    if (!scenarioBuilderUnavailable) return;
    const t = setTimeout(() => setScenarioBuilderUnavailable(false), 3000);
    return () => clearTimeout(t);
  }, [scenarioBuilderUnavailable]);

  useEffect(() => {
    if (!debuggerUnavailable) return;
    const t = setTimeout(() => setDebuggerUnavailable(false), 3000);
    return () => clearTimeout(t);
  }, [debuggerUnavailable]);

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

  const handleSeedLA = async (): Promise<void> => {
    if (!confirm('Seed the database with "Linear Algebra Sandbox"?')) return;
    await seedLinearAlgebra();
    await fetchGraphs();
  };

  const handleSeedLgbtq = async (): Promise<void> => {
    if (!confirm('Seed the database with "LGBTQ+ Identity Vocabulary"?')) return;
    await seedLgbtqIdentityVocabulary();
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "space-between", padding: "4px" }}>
        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar"
          style={{ padding: "8px", color: "var(--text-muted)" }}
        >
          <PanelLeft size={18} />
        </button>
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={() => useUserPrefsStore.getState().openSettings()}
            title="Settings"
            style={{ padding: "8px", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
          >
            <Settings size={15} />
          </button>
        )}
      </div>

      {!sidebarCollapsed && (
        <nav
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
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

          {!hideSidebarDrills && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--panel-border)' }}>
            <button
              type="button"
              onClick={() => useSessionStore.getState().openModal()}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                marginBottom: 8,
              }}
            >
              Start a session
            </button>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Drills
            </div>
            <button
              type="button"
              onClick={() => {
                const ok = useDrillStore.getState().startPathFinder();
                if (ok) {
                } else {
                  setDrillUnavailable(true);
                }
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
              }}
            >
              Path Finder
            </button>
            {drillUnavailable && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Need at least one connected pair (≥2 hops apart) in this graph.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const { nodes: ns, edges: es } = useGraphStore.getState();
                const ok = useDrillStore.getState().startMissingLink(ns, es);
                if (!ok) setMissingLinkUnavailable(true);
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Missing Link
            </button>
            {missingLinkUnavailable && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                No eligible pairs — try after building more graph.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const { nodes: ns, edges: es } = useGraphStore.getState();
                const ok = useDrillStore.getState().startClusterTitle(ns, es);
                if (!ok) setClusterTitleUnavailable(true);
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Cluster Title
            </button>
            {clusterTitleUnavailable && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                No parent has ≥2 children — build a hierarchy first.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const { nodes: ns, edges: es } = useGraphStore.getState();
                const ok = useDrillStore.getState().startSorter(ns, es);
                if (!ok) setSorterUnavailable(true);
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Sorter
            </button>
            {sorterUnavailable && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Need 2+ parents with multiple children — build more hierarchy first.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const { nodes: ns } = useGraphStore.getState();
                if (ns.length < 3) {
                  setScenarioBuilderUnavailable(true);
                } else {
                  useDrillStore.getState().startScenarioBuilder();
                }
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Scenario Builder
            </button>
            {scenarioBuilderUnavailable && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Need at least 3 nodes.
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const { nodes: ns } = useGraphStore.getState();
                const eligible = ns.some((n) =>
                  !n.archived &&
                  n.layers.some(
                    (l) =>
                      (l.contentType === 'code' || l.contentType === 'math') &&
                      l.brokenVersion && l.brokenVersion.trim().length > 0 &&
                      l.content && l.content.trim().length > 0
                  )
                );
                if (!eligible) {
                  setDebuggerUnavailable(true);
                } else {
                  useDrillStore.getState().startDebugger();
                }
              }}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                marginTop: 6,
              }}
            >
              Debugger
            </button>
            {debuggerUnavailable && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                No layers with a broken version.
              </div>
            )}
          </div>
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

          <button
            onClick={handleSeedLA}
            style={{
              cursor: "pointer",
              border: "1px solid var(--panel-border)",
              borderRadius: 6,
              padding: "0.45rem 0.6rem",
              textAlign: "left",
              marginTop: 6,
            }}
          >
            Seed Linear Algebra
          </button>

          <button
            onClick={handleSeedLgbtq}
            style={{
              cursor: "pointer",
              border: "1px solid var(--panel-border)",
              borderRadius: 6,
              padding: "0.45rem 0.6rem",
              textAlign: "left",
              marginTop: 6,
            }}
          >
            Seed LGBTQ+ Vocabulary
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
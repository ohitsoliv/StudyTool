import { useEffect, useRef, useState } from "react";
import { PanelRight } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Timestamp } from "firebase/firestore";
import { useViewStore } from "../../store/viewStore";
import { useGraphStore } from "../../store/graphStore";
import { masteryToColor } from "../../utils/masteryColor";
import { useDrillStore } from '../../store/drillStore';
import type { Layer, EdgeDoc, EdgeType } from "../../types/graph";

interface LayerCardProps {
  nodeId: string;
  layer: Layer;
  index: number;
  onPatch: (patch: Partial<Layer>) => void;
}

function LayerCard({ nodeId, layer, index, onPatch }: LayerCardProps): JSX.Element {
  const [localContent, setLocalContent] = useState(layer.content);
  const [localLang, setLocalLang] = useState(layer.language ?? "c");
  const [localBroken, setLocalBroken] = useState(layer.brokenVersion ?? "");
  const [brokenOpen, setBrokenOpen] = useState(!!(layer.brokenVersion && layer.brokenVersion.trim().length > 0));
  const contentRef = useRef(localContent);
  const brokenRef = useRef(localBroken);

  useEffect(() => {
    setLocalContent(layer.content);
  }, [layer.content]);

  useEffect(() => {
    setLocalLang(layer.language ?? "c");
  }, [layer.language]);

  useEffect(() => {
    setLocalBroken(layer.brokenVersion ?? "");
  }, [layer.brokenVersion]);

  useEffect(() => {
    contentRef.current = localContent;
  }, [localContent]);

  useEffect(() => {
    brokenRef.current = localBroken;
  }, [localBroken]);

  const flush = (nextContent: string): void => {
    if (nextContent !== layer.content) {
      onPatch({ content: nextContent });
    }
  };

  const flushBroken = (nextBroken: string): void => {
    if (nextBroken !== (layer.brokenVersion ?? "")) {
      onPatch({ brokenVersion: nextBroken });
    }
  };

  const handleContentChange = (value: string): void => {
    setLocalContent(value);
  };

  const canDebug =
    (layer.contentType === 'code' || layer.contentType === 'math') &&
    layer.content.trim().length > 0 &&
    (layer.brokenVersion ?? '').trim().length > 0;

  const unsaved = localContent !== layer.content;

  return (
    <section
      style={{
        border: "1px solid var(--panel-border)",
        borderRadius: 8,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 12, color: "var(--text-muted)" }}>Layer {index + 1}</strong>
        <span style={{ fontSize: 11, color: "#f5b544", opacity: unsaved ? 1 : 0, transition: "opacity 180ms ease" }}>
          ● unsaved
        </span>
      </header>

      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={layer.contentType}
          onChange={(e) => onPatch({ contentType: e.target.value as Layer["contentType"] })}
          style={{
            background: "#0f0f12",
            border: "1px solid var(--panel-border)",
            color: "var(--text)",
            borderRadius: 6,
            padding: "6px 8px",
            flex: 1,
          }}
        >
          <option value="text">Text</option>
          <option value="code">Code</option>
          <option value="math">Math</option>
        </select>

        {layer.contentType === "code" && (
          <input
            value={localLang}
            onChange={(e) => setLocalLang(e.target.value)}
            onBlur={() => onPatch({ language: localLang.trim() || "c" })}
            placeholder="language"
            style={{
              background: "#0f0f12",
              border: "1px solid var(--panel-border)",
              color: "var(--text)",
              borderRadius: 6,
              padding: "6px 8px",
              width: 92,
            }}
          />
        )}
      </div>

      {layer.contentType === "code" ? (
        <div style={{ border: "1px solid var(--panel-border)", borderRadius: 6, overflow: "hidden" }}>
          <Editor
            height="180px"
            theme="vs-dark"
            language={localLang || "c"}
            value={localContent}
            onChange={(value) => handleContentChange(value ?? "")}
            onMount={(editor) => {
              editor.onDidBlurEditorWidget(() => flush(contentRef.current));
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "off",
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      ) : (
        <textarea
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={() => flush(localContent)}
          rows={6}
          style={{
            width: "100%",
            resize: "vertical",
            background: "#0f0f12",
            border: "1px solid var(--panel-border)",
            color: "var(--text)",
            borderRadius: 6,
            padding: 8,
          }}
        />
      )}

      {/* Broken version section — only for code/math layers */}
      {(layer.contentType === "code" || layer.contentType === "math") && (
        <div>
          <button
            onClick={() => setBrokenOpen((v) => !v)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 11,
              padding: "4px 0",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>{brokenOpen ? "▾" : "▸"}</span>
            Broken version {localBroken.trim().length > 0 ? "●" : ""}
          </button>

          {brokenOpen && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
              {layer.contentType === "code" ? (
                <div style={{ border: "1px solid var(--panel-border)", borderRadius: 6, overflow: "hidden" }}>
                  <Editor
                    height="140px"
                    theme="vs-dark"
                    language={localLang || "c"}
                    value={localBroken}
                    onChange={(value) => setLocalBroken(value ?? "")}
                    onMount={(editor) => {
                      editor.onDidBlurEditorWidget(() => flushBroken(brokenRef.current));
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "off",
                      wordWrap: "on",
                      padding: { top: 8, bottom: 8 },
                    }}
                  />
                </div>
              ) : (
                <textarea
                  value={localBroken}
                  onChange={(e) => setLocalBroken(e.target.value)}
                  onBlur={() => flushBroken(localBroken)}
                  rows={4}
                  placeholder="Paste a buggy/incomplete version here…"
                  style={{
                    width: "100%",
                    resize: "vertical",
                    background: "#0f0f12",
                    border: "1px solid var(--panel-border)",
                    color: "var(--text)",
                    borderRadius: 6,
                    padding: 8,
                  }}
                />
              )}

              <button
                type="button"
                disabled={!canDebug}
                onClick={() => {
                  if (!canDebug) return;
                  useDrillStore.getState().startDebugger({ nodeId, layerDepth: layer.depth });
                }}
                style={{
                  background: canDebug ? 'var(--accent)' : 'transparent',
                  color: canDebug ? '#fff' : 'var(--text-muted)',
                  border: canDebug ? 'none' : '1px solid var(--panel-border)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: canDebug ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  opacity: canDebug ? 1 : 0.6,
                }}
              >
                Debug this layer
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const EDGE_TYPES: EdgeType[] = ['parent-child', 'related', 'prerequisite', 'sequence'];

function EdgeInspector({ edge }: { edge: EdgeDoc }) {
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);
  const updateEdge = useGraphStore((s) => s.updateEdge);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  return (
    <div style={{ padding: 16, color: '#e8e8ea', fontSize: 13 }}>
      {/* Header: type pill + delete button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <select
          className="inspector-select"
          value={edge.type}
          onChange={(e) => updateEdge(edge.id, { type: e.target.value as EdgeType })}
          style={{ fontSize: 11, padding: '2px 6px', borderRadius: 12 }}
        >
          {EDGE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="icon-btn icon-btn--destructive" onClick={() => deleteEdge(edge.id)} title="Delete Edge">
          &#x1F5D1;
        </button>
      </div>
      {/* Source → Target row */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button className="link-btn" onClick={() => sourceNode && selectNode(sourceNode.id)}>
          {sourceNode?.title ?? '(missing)'}
        </button>
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <button className="link-btn" onClick={() => targetNode && selectNode(targetNode.id)}>
          {targetNode?.title ?? '(missing)'}
        </button>
      </div>
      {/* Created timestamp */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
        Created {edge.createdAt?.toDate().toLocaleString() ?? '—'}
      </div>
      {/* Label/nickname */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: '#9a9a9f', marginBottom: 4 }}>Label</div>
        <input
          className="inspector-input"
          type="text"
          value={edge.label ?? ''}
          placeholder="(optional)"
          onChange={(e) => updateEdge(edge.id, { label: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function Inspector(): JSX.Element {
  const { inspectorCollapsed, toggleInspector } = useViewStore();
  const { selectedNodeId, nodes, updateNode } = useGraphStore();
  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId);
  const selectedEdge = useGraphStore((s) =>
    s.edges.find((e) => e.id === s.selectedEdgeId)
  );

  const startCloze = useDrillStore((s) => s.startCloze);
  const setViewModeFocus = useViewStore((s) => s.setViewMode);
  const drillEligible = node
    ? node.layers.some(
        (l) =>
          l.contentType === 'text' &&
          typeof l.content === 'string' &&
          l.content.trim().length >= 30
      )
    : false;

  const [draft, setDraft] = useState<{ nodeId: string; title: string; tags: string } | null>(null);

  useEffect(() => {
    if (node) {
      setDraft({ nodeId: node.id, title: node.title, tags: node.tags?.join(", ") ?? "" });
    } else {
      setDraft(null);
    }
  }, [node?.id]);

  const saveTitle = (): void => {
    if (!draft) return;
    const trimmed = draft.title.trim();
    const targetNode = nodes.find((n) => n.id === draft.nodeId);
    if (targetNode && trimmed && trimmed !== targetNode.title) {
      void updateNode(draft.nodeId, { title: trimmed });
    }
  };

  const saveTags = (): void => {
    if (!draft) return;
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    void updateNode(draft.nodeId, { tags });
  };

  const patchLayer = (layerIndex: number, patch: Partial<Layer>): void => {
    if (!node) return;
    const nextLayers = node.layers.map((layer, index) => {
      if (index !== layerIndex) return layer;
      return { ...layer, ...patch };
    });
    void updateNode(node.id, { layers: nextLayers });
  };

  if (selectedEdgeId && selectedEdge) {
    return <EdgeInspector edge={selectedEdge} />;
  }

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
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "8px 4px 4px",
            }}
          >
            Inspector
          </p>

          {!draft && (
            <p style={{ color: "var(--text-muted)", padding: "8px 4px" }}>
              Select a node to inspect it.
            </p>
          )}

          {draft && node && (
            <>
              <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Title</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : null))}
                  onBlur={saveTitle}
                  style={{
                    background: "#0f0f12",
                    border: "1px solid var(--panel-border)",
                    color: "var(--text)",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}
                />
              </section>

              <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Tags (comma separated)</label>
                <input
                  value={draft.tags}
                  onChange={(e) => setDraft((d) => (d ? { ...d, tags: e.target.value } : null))}
                  onBlur={saveTags}
                  style={{
                    background: "#0f0f12",
                    border: "1px solid var(--panel-border)",
                    color: "var(--text)",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}
                />
              </section>

              {(() => {
                const score = node.mastery?.score ?? 0;
                const pct = Math.round(score * 100);
                return (
                  <div className="mastery-bar">
                    <div className="mastery-bar__label">
                      <span>Mastery</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mastery-bar__track">
                      <div
                        className="mastery-bar__fill"
                        style={{
                          width: `${pct}%`,
                          background: masteryToColor(score),
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {node && (
                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!drillEligible || !node) return;
                      startCloze(node);
                      setViewModeFocus('focus');
                    }}
                    disabled={!drillEligible}
                    style={{
                      width: '100%',
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px',
                      cursor: drillEligible ? 'pointer' : 'not-allowed',
                      opacity: drillEligible ? 1 : 0.5,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    }}
                  >
                    Study this node
                  </button>
                  {!drillEligible && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Add a text layer (30+ chars) to drill this node.
                    </div>
                  )}
                </div>
              )}

              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Layers</p>
                <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {node.layers.map((layer, index) => (
                    <LayerCard
                      key={`${node.id}-${layer.depth}-${index}`}
                      nodeId={node.id}
                      layer={layer}
                      index={index}
                      onPatch={(patch) => patchLayer(index, patch)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    const existingDepths = node.layers.map((l) => l.depth);
                    const newDepth = existingDepths.length === 0 ? 1 : Math.max(...existingDepths) + 1;
                    const newLayer: Layer = {
                      depth: newDepth,
                      content: "",
                      contentType: "text",
                      createdAt: Timestamp.now(),
                    };
                    void updateNode(node.id, { layers: [...node.layers, newLayer] });
                  }}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px dashed rgba(107, 138, 253, 0.5)',
                    borderRadius: 6,
                    color: '#6b8afd',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  + Add Layer
                </button>
              </section>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
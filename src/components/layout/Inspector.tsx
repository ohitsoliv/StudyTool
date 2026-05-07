import { useEffect, useRef, useState } from "react";
import { PanelRight } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useViewStore } from "../../store/viewStore";
import { useGraphStore } from "../../store/graphStore";
import type { Layer, EdgeDoc, EdgeType } from "../../types/graph";

interface LayerCardProps {
  layer: Layer;
  index: number;
  onPatch: (patch: Partial<Layer>) => void;
}

function LayerCard({ layer, index, onPatch }: LayerCardProps): JSX.Element {
  const [localContent, setLocalContent] = useState(layer.content);
  const [localLang, setLocalLang] = useState(layer.language ?? "c");
  const contentRef = useRef(localContent);

  useEffect(() => {
    setLocalContent(layer.content);
  }, [layer.content]);

  useEffect(() => {
    setLocalLang(layer.language ?? "c");
  }, [layer.language]);

  useEffect(() => {
    contentRef.current = localContent;
  }, [localContent]);

  const flush = (nextContent: string): void => {
    if (nextContent !== layer.content) {
      onPatch({ content: nextContent });
    }
  };

  const handleContentChange = (value: string): void => {
    setLocalContent(value);
  };

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
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9a9a9f', marginBottom: 12 }}>
        Edge
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#9a9a9f', marginBottom: 4 }}>Source</div>
        <button className="link-btn" onClick={() => sourceNode && selectNode(sourceNode.id)}>
          {sourceNode?.title ?? '(missing)'}
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#9a9a9f', marginBottom: 4 }}>Target</div>
        <button className="link-btn" onClick={() => targetNode && selectNode(targetNode.id)}>
          {targetNode?.title ?? '(missing)'}
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#9a9a9f', marginBottom: 4 }}>Type</div>
        <select
          className="inspector-select"
          value={edge.type}
          onChange={(e) => updateEdge(edge.id, { type: e.target.value as EdgeType })}
        >
          {EDGE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
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
      <button className="icon-btn icon-btn--destructive" onClick={() => deleteEdge(edge.id)}>
        Delete Edge
      </button>
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

              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Layers</p>
                {node.layers.map((layer, index) => (
                  <LayerCard
                    key={`${node.id}-${layer.depth}-${index}`}
                    layer={layer}
                    index={index}
                    onPatch={(patch) => patchLayer(index, patch)}
                  />
                ))}
              </section>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
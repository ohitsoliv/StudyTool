// src/components/layout/Breadcrumb.tsx
import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { buildBreadcrumb } from '../../utils/graphHierarchy';
import { getUserId, updateGraph } from '../../services/storage';
import type { GraphMetadata } from '../../types/graph';

interface BreadcrumbProps {
  graphs: GraphMetadata[];
  /**
   * Called after a successful inline rename so the parent (Sidebar)
   * can refresh its cached graph list. Without this, the displayed
   * name stays stale until the next reload.
   */
  onGraphsChanged?: () => void;
}

const MAX_NAME_DISPLAY = 24;

function truncate(s: string): string {
  return s.length > MAX_NAME_DISPLAY
    ? s.slice(0, MAX_NAME_DISPLAY - 1) + '…'
    : s;
}

export default function Breadcrumb({
  graphs,
  onGraphsChanged,
}: BreadcrumbProps): JSX.Element | null {
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const setCurrentGraph = useGraphStore((s) => s.setCurrentGraph);

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [renaming]);

  // Cancel rename if the user navigates to a different graph mid-edit
  useEffect(() => {
    setRenaming(false);
  }, [currentGraphId]);

  if (!currentGraphId) return null;

  const chain = buildBreadcrumb(currentGraphId, graphs);
  if (chain.length <= 1) return null;

  const commitRename = async (id: string, value: string): Promise<void> => {
    const trimmed = value.trim();
    setRenaming(false);
    if (trimmed.length === 0) return;
    const current = chain[chain.length - 1];
    if (!current || current.name === trimmed) return;
    try {
      await updateGraph(getUserId(), id, { name: trimmed });
      onGraphsChanged?.();
    } catch (err) {
      console.error('[Breadcrumb] rename failed', err);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    padding: '4px 4px 8px',
    marginTop: 8,
    fontSize: 11,
    lineHeight: 1.4,
  };

  const crumbButtonStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
    font: 'inherit',
  };

  const activeCrumbStyle: React.CSSProperties = {
    color: 'var(--text)',
    fontWeight: 600,
  };

  return (
    <div style={containerStyle}>
      {chain.map((g, idx) => {
        const isLast = idx === chain.length - 1;
        const label = truncate(g.name);
        if (!isLast) {
          return (
            <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                style={crumbButtonStyle}
                onClick={() => setCurrentGraph(g.id)}
                title={g.name}
              >
                {label}
              </button>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
            </span>
          );
        }

        if (renaming) {
          return (
            <input
              key={g.id}
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                void commitRename(g.id, draft);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commitRename(g.id, draft);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setRenaming(false);
                }
              }}
              style={{
                background: '#0f0f12',
                color: 'var(--text)',
                border: '1px solid var(--accent)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 11,
                width: Math.max(90, Math.min(220, draft.length * 7 + 20)),
              }}
            />
          );
        }

        return (
          <button
            key={g.id}
            type="button"
            style={{ ...crumbButtonStyle, ...activeCrumbStyle }}
            title="Click to rename"
            onClick={() => {
              setDraft(g.name);
              setRenaming(true);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// src/components/canvas/CanvasContextMenu.tsx
//
// Packet 11d: extended with submenu support.
// - MenuItem gains a fourth variant: { label, submenu, disabled?, title? }
// - Submenu parents render a `▸` glyph and toggle a child panel on hover/click
// - Submenu opens after 120ms hover delay; closes after 120ms when mouse exits
// - Panel anchors to parent panel's right edge, top-aligned with parent row
// - Flips left-of-parent if it would overflow the viewport horizontally
// - Mouse-only; keyboard sub-navigation is intentionally out of scope
// - Esc and outside-click still close everything via capture-phase listeners
// - All existing behavior (separators, section labels, disabled+reason, destructive) preserved

import { useEffect, useRef, useState } from 'react';

export type MenuItem =
  | {
      label: string;
      onClick: () => void;
      destructive?: boolean;
      disabled?: boolean;
      title?: string;
    }
  | {
      label: string;
      submenu: MenuItem[];
      disabled?: boolean;
      title?: string;
    }
  | { sectionLabel: string }
  | { separator: true };

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const SUBMENU_OPEN_DELAY_MS = 120;
const SUBMENU_CLOSE_DELAY_MS = 120;
const ESTIMATED_SUBMENU_WIDTH = 200;
const ESTIMATED_ITEM_HEIGHT = 28;
const PANEL_VERTICAL_PADDING = 8;

function isSeparator(item: MenuItem): item is { separator: true } {
  return 'separator' in item;
}
function isSectionLabel(item: MenuItem): item is { sectionLabel: string } {
  return 'sectionLabel' in item;
}
function isSubmenu(
  item: MenuItem
): item is { label: string; submenu: MenuItem[]; disabled?: boolean; title?: string } {
  return 'submenu' in item;
}

type PanelPosition =
  | { kind: 'absolute'; left: number; top: number }
  | { kind: 'anchor'; rowRect: DOMRect; parentPanelRect: DOMRect | null };

interface MenuPanelProps {
  items: MenuItem[];
  position: PanelPosition;
  onCloseAll: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function MenuPanel({
  items,
  position,
  onCloseAll,
  onMouseEnter,
  onMouseLeave,
}: MenuPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Cleanup any pending timers on unmount
  useEffect(() => {
    return () => {
      if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearOpenTimer = () => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleOpen = (index: number) => {
    clearOpenTimer();
    clearCloseTimer();
    openTimerRef.current = window.setTimeout(() => {
      setOpenIndex(index);
      openTimerRef.current = null;
    }, SUBMENU_OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenIndex(null);
      closeTimerRef.current = null;
    }, SUBMENU_CLOSE_DELAY_MS);
  };

  // Compute panel screen coordinates
  let left = 0;
  let top = 0;
  if (position.kind === 'absolute') {
    left = position.left;
    top = position.top;
  } else {
    const { rowRect, parentPanelRect } = position;
    const baseLeft = parentPanelRect ? parentPanelRect.right : rowRect.right;
    let proposedLeft = baseLeft;
    if (
      typeof window !== 'undefined' &&
      proposedLeft + ESTIMATED_SUBMENU_WIDTH > window.innerWidth - 8
    ) {
      // Flip: open to the left of the parent panel/row instead
      const flippedBase = parentPanelRect ? parentPanelRect.left : rowRect.left;
      proposedLeft = flippedBase - ESTIMATED_SUBMENU_WIDTH;
      if (proposedLeft < 8) proposedLeft = 8;
    }

    let proposedTop = rowRect.top - 4; // small offset so submenu's first row sits near the parent row
    const estimatedHeight =
      items.length * ESTIMATED_ITEM_HEIGHT + 2 * PANEL_VERTICAL_PADDING;
    if (
      typeof window !== 'undefined' &&
      proposedTop + estimatedHeight > window.innerHeight - 8
    ) {
      proposedTop = Math.max(8, window.innerHeight - 8 - estimatedHeight);
    }
    if (proposedTop < 8) proposedTop = 8;

    left = proposedLeft;
    top = proposedTop;
  }

  return (
    <div
      ref={panelRef}
      className="canvas-context-menu"
      style={{ position: 'fixed', left, top, zIndex: 1000 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {items.map((item, i) => {
        if (isSeparator(item)) {
          return (
            <div key={`sep-${i}`} className="canvas-context-menu__separator" />
          );
        }
        if (isSectionLabel(item)) {
          return (
            <div
              key={`sec-${i}`}
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'var(--text-muted)',
                padding: '4px 8px',
              }}
            >
              {item.sectionLabel}
            </div>
          );
        }
        if (isSubmenu(item)) {
          const isOpen = openIndex === i;
          return (
            <button
              key={`sub-${i}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              disabled={item.disabled}
              title={item.title ?? ''}
              className="canvas-context-menu__item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                opacity: item.disabled ? 0.55 : 1,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={() => {
                if (item.disabled) return;
                scheduleOpen(i);
              }}
              onMouseLeave={() => {
                if (item.disabled) return;
                clearOpenTimer();
                if (openIndex !== null) scheduleClose();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (item.disabled) return;
                clearOpenTimer();
                clearCloseTimer();
                setOpenIndex(isOpen ? null : i);
              }}
            >
              <span>{item.label}</span>
              <span style={{ marginLeft: 12, opacity: 0.7 }}>▸</span>
            </button>
          );
        }
        // leaf
        return (
          <button
            key={`leaf-${i}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            disabled={item.disabled}
            title={item.title ?? ''}
            className={
              'canvas-context-menu__item' +
              (item.destructive ? ' canvas-context-menu__item--destructive' : '')
            }
            style={
              item.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined
            }
            onMouseEnter={() => {
              // Hovering a non-submenu sibling should close any open submenu
              clearOpenTimer();
              if (openIndex !== null) scheduleClose();
            }}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onCloseAll();
            }}
          >
            {item.label}
          </button>
        );
      })}

      {openIndex !== null &&
        (() => {
          const item = items[openIndex];
          if (!isSubmenu(item)) return null;
          const buttonEl = itemRefs.current[openIndex];
          if (!buttonEl) return null;
          const rowRect = buttonEl.getBoundingClientRect();
          const parentPanelRect =
            panelRef.current?.getBoundingClientRect() ?? null;
          return (
            <MenuPanel
              key={`submenu-${openIndex}`}
              items={item.submenu}
              position={{ kind: 'anchor', rowRect, parentPanelRect }}
              onCloseAll={onCloseAll}
              onMouseEnter={() => {
                // mouse entered the submenu — keep it open
                clearOpenTimer();
                clearCloseTimer();
              }}
              onMouseLeave={() => {
                // mouse left the submenu — start the close timer
                scheduleClose();
              }}
            />
          );
        })()}
    </div>
  );
}

export function CanvasContextMenu({
  x,
  y,
  items,
  onClose,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on Escape or outside click (capture phase to beat React Flow handlers)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose]);

  // Clamp root panel position to viewport
  const maxX = typeof window !== 'undefined' ? window.innerWidth - 200 : x;
  const maxY = typeof window !== 'undefined' ? window.innerHeight - 240 : y;
  const left = Math.min(x, maxX);
  const top = Math.min(y, maxY);

  return (
    <div ref={ref} onContextMenu={(e) => e.preventDefault()}>
      <MenuPanel
        items={items}
        position={{ kind: 'absolute', left, top }}
        onCloseAll={onClose}
      />
    </div>
  );
}
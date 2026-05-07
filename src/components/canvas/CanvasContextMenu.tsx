import { useEffect, useRef } from 'react';

export type MenuItem =
  | { label: string; onClick: () => void; destructive?: boolean }
  | { separator: true };

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function CanvasContextMenu({ x, y, items, onClose }: CanvasContextMenuProps) {
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

  // Clamp to viewport
  const maxX = typeof window !== 'undefined' ? window.innerWidth - 200 : x;
  const maxY = typeof window !== 'undefined' ? window.innerHeight - 240 : y;
  const left = Math.min(x, maxX);
  const top = Math.min(y, maxY);

  return (
    <div
      ref={ref}
      className="canvas-context-menu"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ('separator' in item) {
          return <div key={i} className="canvas-context-menu__separator" />;
        }
        return (
          <button
            key={i}
            className={
              'canvas-context-menu__item' +
              (item.destructive ? ' canvas-context-menu__item--destructive' : '')
            }
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
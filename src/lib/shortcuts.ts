export type ShortcutGroup = 'view' | 'navigation' | 'drill' | 'edit' | 'help';

export interface Shortcut {
  id: string;
  keys: string;                       // display string, e.g. "Ctrl+E"
  label: string;
  group: ShortcutGroup;
  matcher: (e: KeyboardEvent) => boolean;
  when?: () => boolean;               // optional gate; falsey skips
  action: (e: KeyboardEvent) => void;
  allowInInput?: boolean;             // default false
}

const isMod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

export const matchKey = {
  ctrlE: (e: KeyboardEvent) => isMod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e',
  ctrlU: (e: KeyboardEvent) => isMod(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'u',
  ctrlShiftS: (e: KeyboardEvent) => isMod(e) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's',
  esc: (e: KeyboardEvent) => e.key === 'Escape',
  questionMark: (e: KeyboardEvent) => e.key === '?',
  ctrlSlash: (e: KeyboardEvent) => isMod(e) && e.key === '/',
  ctrlComma: (e: KeyboardEvent) => isMod(e) && e.key === ',',
  bareS: (e: KeyboardEvent) => !isMod(e) && !e.altKey && e.key.toLowerCase() === 's',
  bareN: (e: KeyboardEvent) => !isMod(e) && !e.altKey && e.key.toLowerCase() === 'n',
};

export const isTypingTarget = (el: Element | null): boolean => {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
};

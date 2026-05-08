import type { Shortcut } from './shortcuts';
import { matchKey } from './shortcuts';
import { useViewStore } from '../store/viewStore';
import { useGraphStore } from '../store/graphStore';
import { useDrillStore } from '../store/drillStore';
import { useUserPrefsStore } from '../store/userPrefsStore';

const TEXT_LAYER_MIN = 30;

export function buildShortcutRegistry(): Shortcut[] {
  return [
    {
      id: 'toggle-view',
      keys: 'Ctrl+E',
      label: 'Toggle Canvas / Focus Workspace',
      group: 'view',
      matcher: matchKey.ctrlE,
      action: (e) => {
        e.preventDefault();
        useViewStore.getState().toggleViewMode();
      },
    },
    {
      id: 'deselect',
      keys: 'Esc',
      label: 'Deselect node or edge',
      group: 'navigation',
      matcher: matchKey.esc,
      when: () => useDrillStore.getState().phase === 'idle',
      action: () => {
        const g = useGraphStore.getState();
        if (g.selectedNodeId) g.selectNode(null);
        if (g.selectedEdgeId) g.selectEdge(null);
      },
    },
    {
      id: 'open-legend-q',
      keys: '?',
      label: 'Open shortcut legend',
      group: 'help',
      matcher: matchKey.questionMark,
      action: () => useUserPrefsStore.getState().toggleLegend(),
    },
    {
      id: 'open-legend-slash',
      keys: 'Ctrl+/',
      label: 'Open shortcut legend',
      group: 'help',
      matcher: matchKey.ctrlSlash,
      action: (e) => {
        e.preventDefault();
        useUserPrefsStore.getState().toggleLegend();
      },
    },
    {
      id: 'open-settings',
      keys: 'Ctrl+,',
      label: 'Open Settings',
      group: 'help',
      matcher: matchKey.ctrlComma,
      action: (e) => {
        e.preventDefault();
        useUserPrefsStore.getState().openSettings();
      },
    },
    {
      id: 'study-selected',
      keys: 'S',
      label: 'Study selected node (Cloze)',
      group: 'drill',
      matcher: matchKey.bareS,
      when: () => {
        const drill = useDrillStore.getState();
        if (drill.phase !== 'idle') return false;
        const g = useGraphStore.getState();
        if (!g.selectedNodeId) return false;
        const node = g.nodes.find((n) => n.id === g.selectedNodeId);
        if (!node) return false;
        return node.layers.some((l) => l.contentType === 'text' && l.content.trim().length >= TEXT_LAYER_MIN);
      },
      action: (e) => {
        e.preventDefault();
        const g = useGraphStore.getState();
        if (!g.selectedNodeId) return;
        const node = g.nodes.find((n) => n.id === g.selectedNodeId);
        if (node) useDrillStore.getState().startCloze(node);
      },
    },
    {
      id: 'new-node',
      keys: 'N',
      label: 'New node at viewport center',
      group: 'edit',
      matcher: matchKey.bareN,
      when: () => useDrillStore.getState().phase === 'idle' && !useUserPrefsStore.getState().settingsOpen,
      action: async (e) => {
        e.preventDefault();
        const g = useGraphStore.getState();
        if (!g.currentGraphId) return;
        const newId = await g.createNode({
          title: 'New node',
          position: { x: 0, y: 0 },
          layers: [],
          tags: [],
        } as any);
        if (newId) g.selectNode(newId);
      },
    },
  ];
}

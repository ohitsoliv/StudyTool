<!-- Auto-generated technical README. Regenerate when major architecture changes ship. -->

# Nexus Study Engine

**Last updated: 2026-05-07 (Packet 6)**

---

## 1. Project Identity

Nexus Study Engine is a spatial knowledge graph for solo deep-learning. The user (the student building it) maps concepts as nodes on a 2D canvas, draws typed edges between them, and annotates each node with layered content that is revealed progressively as zoom level increases — a Z-axis proxy for depth of detail. Each node carries a mastery score that drives a heatmap gradient on the node's left border: rusty red → burnt orange → forest green. The design codename "Nexus Study Engine" reflects a planned multi-modal study tool with three lenses (Memorize, Architect, Practise), BYO-AI ingestion (user's own Claude/GPT subscription, no platform API cost), and a graph-first mental model rather than flat flashcard decks. Nothing is public-facing; the project is a personal tool built by one person with AI-assisted code generation.

---

## 2. Status — Packet Log

| Packet | Delivered |
|--------|-----------|
| Packet 1 | TSX migration, 3-panel layout shell (AppShell grid), dark theme CSS vars, Firebase env vars, Ctrl/Cmd+E canvas↔focus view toggle. |
| Packet 2 | `StorageBackend` interface, Firestore + IndexedDB implementations, `graphStore` Zustand store with real-time subscriptions, seed script (`seedGraph`), `GraphCanvas` wired to store via React Flow. |
| Packet 3 | Node Inspector with title/tag editing and layer cards (text/code/math), `LayerCard` component with Monaco for code layers, mastery color system (`masteryToColor`), `StudyNode` left-border mastery heatmap and zoom-based layer reveal. |
| Packet 4 | Env-driven storage backend selector (`VITE_STORAGE_MODE`), IndexedDB local backend (idb), Firestore backend extracted, standalone re-exports in `storage/index.ts`, Sidebar STORAGE_MODE badge and Reset Local Data button. |
| Packet 5 | Typed edge system (`EdgeType`), `selectedEdgeId` / `selectEdge` / `updateEdge` in graphStore, `EdgeInspector` component, canvas context menus (right-click pane/node/edge), `CanvasContextMenu` component, `edgeStyles.ts` visual map, keyboard Delete/Backspace handler, drag-to-connect creates `related` edge. |
| Packet 5.1 | Inspector cleanup: mastery progress bar (horizontal, colored via `masteryToColor`), "+ Add Layer" button at bottom of layers list, draft-state pattern verified correct (blur-to-commit, discard on node switch). |
| Packet 5.2 | Add Layer button: scroll-contained layer list with button pinned below; dashed-accent button style. Mastery bar: `min-width: 2px` on fill so 0% still shows a sliver; track background improved. Replaced `window.prompt()` in Sidebar `handleNewGraph` with inline autofocused input (Enter to commit, Escape to cancel). Confirmed `seedGraph.ts` mastery scores were already varied (0.20–0.90); prior 0% display was stale IDB data from before a reset. |
| Hotfixes 5.x | Self-loop guard added to `onConnect` (`conn.source === conn.target` early return — was missing entirely). Escape-to-close on `CanvasContextMenu` hardened to capture-phase listeners on both `window` and `document` for reliable dismissal. Edge context menu separator verified present in both data and renderer (no change needed). |
| Packet 6 | **Memorizer Lens — Cloze Collapse.** New `drillStore` (Zustand), `src/types/drill.ts`, and deterministic `clozeSelection` util (seeded LCG from text hash, 1–8 blanks, content-word bias). `FocusWorkspace` becomes full drill stage with `idle`/`active`/`graded` phases. "Study this node" button in Inspector node mode (eligible iff a text layer ≥ 30 chars). `NodeDoc` gained `accessCount: number` and `lastAccessedAt: Timestamp \| null`. `viewStore.setViewMode` added for programmatic mode switching. Mastery formula on submit: +0.10 perfect / +0.05 ≥ 80% / 0 in 50–80% / −0.10 below 50%, clamped [0, 1]. |

**Next: Packet 6.5 — Memorizer Lens: Path Finder** (non-adjacent connected node pair; click intermediate nodes in correct sequence; reuses `drillStore` architecture).

---

## 3. Stack

| Library | Version | Why |
|---------|---------|-----|
| `react` | 18.3.1 | Component model; 18 required by xyflow |
| `typescript` | 6.0.3 | Strict mode; pays off on graph-heavy, multi-file code |
| `vite` | 5.3.1 | Fast HMR dev server; `@vitejs/plugin-react` for JSX transform |
| `@xyflow/react` | 12.10.2 | Production-grade React Flow canvas; saved weeks of pan/zoom/edge rendering work |
| `zustand` | 5.0.13 | Minimal, non-boilerplate state; no context providers needed |
| `firebase` | 11.10.0 | Firestore (cloud storage), Auth (not yet wired), Analytics |
| `idb` | 8.0.3 | Typed IndexedDB wrapper for local-first dev mode |
| `@monaco-editor/react` | 4.7.0 | Syntax-highlighted code editing inside LayerCards; intentionally used only for `contentType: 'code'` |
| `lucide-react` | 1.14.0 | Icon set; `PanelLeft`, `PanelRight` for sidebar/inspector toggles |
| `react-router-dom` | 6.23.1 | Installed but not yet used for routing |

**Styling**: NO Tailwind. All layout uses plain inline styles. Shared tokens live in `src/styles/globals.css` as CSS custom properties. `src/styles/mastery.css` is intentionally empty (reserved for future mastery-specific animations, imported in globals.css — empty file causes a non-fatal Vite CSS warning).

---

## 4. Architecture

### Component tree

```
App (Ctrl+E handler)
└── AppShell (CSS grid: auto | 1fr | auto, 100vh)
    ├── Sidebar          (left panel, collapsible, graph list)
    ├── main             (center, switches on viewMode)
    │   ├── GraphCanvas  (canvas mode) → ReactFlowProvider > GraphCanvasInner
    │   └── FocusWorkspace (focus mode, not yet built out)
    └── Inspector        (right panel, collapsible, node↔edge mode)
        ├── EdgeInspector  (renders when selectedEdgeId set)
        └── node-mode      (title, mastery bar, tags, LayerCards, Add Layer btn)
```

### State

```
graphStore (Zustand)
  currentGraphId: string | null
  nodes: NodeDoc[]
  edges: EdgeDoc[]
  selectedNodeId: string | null
  selectedEdgeId: string | null    ← selecting node clears edge, and vice versa
  loading, error
  _unsubscribers                   ← cleanup refs for real-time subscriptions
  actions: setCurrentGraph, selectNode, selectEdge,
           createNode, updateNode, deleteNode,
           createEdge, updateEdge, deleteEdge
  getSelectedEntity()              ← standalone helper, returns { kind, node|edge } | null

viewStore (Zustand)
  viewMode: 'canvas' | 'focus'
  sidebarCollapsed, inspectorCollapsed
  toggleViewMode, toggleSidebar, toggleInspector
```

### Storage abstraction

```
VITE_STORAGE_MODE
  'local'  →  localBackend   (IndexedDB via idb, crypto.randomUUID IDs)
  'cloud'  →  firestoreBackend (Firestore, serverTimestamp IDs from addDoc)

Both implement StorageBackend (src/services/storage/types.ts):
  CRUD for graphs/nodes/edges + real-time subscriptions (subscribeToNodes/Edges)
  Optional: resetAll()

storage/index.ts re-exports every method as a standalone function so call-sites
  don't need to import the backend directly.
```

### Data flow on a node update

```
Inspector input onBlur
  → saveTitle() / saveTags() / patchLayer()
  → useGraphStore.updateNode(nodeId, patch)
    → fsUpdateNode(userId, graphId, nodeId, patch)  [storage/index.ts]
      → backend.updateNode(...)
        Local:  IDB put + notifyNodes(graphId)
                → readNodesByGraph → forEach subscriber callback
                → set({ nodes }) in graphStore
        Cloud:  Firestore updateDoc + onSnapshot fires
                → set({ nodes }) in graphStore
  → graphStore.nodes updates → React re-renders nodes array everywhere
```

---

## 5. Schema

```typescript
// src/types/graph.ts

export type ContentType = 'text' | 'code' | 'math';
export type EdgeType = 'parent-child' | 'related' | 'prerequisite' | 'sequence';

export interface Layer {
  depth: number;          // 1-based; displayed in order
  content: string;
  contentType: ContentType;
  language?: string;      // only meaningful when contentType === 'code'
  createdAt: Timestamp;
}

export interface Mastery {
  score: number;          // 0.0–1.0, drives border color
  lastReviewedAt: Timestamp | null;
  reviewCount: number;
}

export interface NodeDoc {
  id: string;
  title: string;
  position: { x: number; y: number };
  layers: Layer[];
  tags: string[];
  mastery: Mastery;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived: boolean;      // Project Packaging not yet built; field exists to support it
  clusterId: string | null; // Cluster collapse not yet built; null everywhere today
  accessCount: number;      // incremented on drill start; default 0
  lastAccessedAt: Timestamp | null; // set on drill start; default null
}

export interface EdgeDoc {
  id: string;
  source: string;         // nodeId
  target: string;         // nodeId
  type: EdgeType;
  label?: string;
  createdAt: Timestamp;
}

export interface ClusterDoc {
  id: string;
  title: string;
  nodeIds: string[];
  collapsed: boolean;
  createdAt: Timestamp;
}

export interface GraphMetadata {
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Design intent:**

- `layers` is an array on `NodeDoc` (not a subcollection) because all layers are always fetched and rendered together. A subcollection would require a second read per node, which is worse for a canvas that may load dozens of nodes at once.
- `archived` and `clusterId` exist now even though Project Packaging is unbuilt. Adding them after data exists in production would require a migration; adding them early is free.
- `EdgeType` drives visual rendering (see §7) and is intended to carry semantic meaning in AI ingestion prompts — the type is part of the graph's knowledge representation, not just decoration.
- `language` on `Layer` is optional and only used by Monaco's syntax highlighting. It is not constrained to an enum on purpose (any Monaco-supported language ID works).

---

## 6. Storage

### Local mode (IndexedDB)

- **DB name**: `studytool-local`, version 1
- **Object stores**:
  - `graphs` — keyPath `id`
  - `nodes` — keyPath `id`, index `graphId` (denormalized field added at write time)
  - `edges` — keyPath `id`, index `graphId` (same pattern)
- **IDs**: `crypto.randomUUID()` at creation time
- **Timestamp serialization**: `firebase/firestore` `Timestamp` objects cannot be stored in IndexedDB. They are serialized to `{ seconds: number, nanoseconds: number }` on write and reconstructed via `new Timestamp(s, ns)` on read. All nested timestamps (layers[*].createdAt, mastery.lastReviewedAt) are serialized recursively.
- **Pub-sub**: Module-level `Map<graphId, Set<callback>>` for nodes and edges. Every mutating operation calls `notifyNodes(graphId)` or `notifyEdges(graphId)`, which re-reads the full collection from IDB and calls all registered callbacks. Subscribers always receive a fresh full array, never a diff. Acceptable for < ~thousands of items per graph.
- **Subscriptions fire once on register**: `queueMicrotask` fires the initial callback with current data after `subscribeToNodes/Edges` returns. A stale-subscription guard prevents the microtask from firing if the caller already unsubscribed before it runs.

### Cloud mode (Firestore)

- **Collection paths**: `users/{userId}/graphs/{graphId}/nodes/{nodeId}` and `…/edges/{edgeId}`
- **Graph list** ordered by `updatedAt desc` via Firestore query
- **Timestamps**: `serverTimestamp()` on create; `Timestamp.now()` on updates (passed through from client)
- **`stripUndefined` helper**: Firestore rejects writes with `undefined` values. The helper recursively removes `undefined` keys, preserves `null` and `Timestamp` instances unchanged.
- **Security rules**: `firestore.rules` **does not exist** in this repo. No rules deployed. Firestore's default is locked-down, so unauthenticated cloud-mode writes 403. This is intentional — cloud mode requires Auth (not yet wired).

### Backend selector

```typescript
// src/services/storage/index.ts
const mode = (import.meta.env.VITE_STORAGE_MODE ?? 'local').toLowerCase();
export const storage: StorageBackend = mode === 'cloud' ? firestoreBackend : localBackend;
```

Anything other than `'cloud'` defaults to local. `getUserId()` returns `'dev-user'` in both backends; Auth override is a future packet.

---

## 7. Visuals & Design Tokens

### CSS custom properties (globals.css)

```css
--bg:              #0d0d0f   /* app background */
--text:            #e8e8ea   /* primary text */
--text-muted:      #888896   /* labels, placeholders */
--accent:          #6b8afd   /* selection ring, links */
--panel-bg:        #16161a   /* sidebar, inspector */
--panel-border:    #2a2a2f   /* panel dividers */
--sidebar-width:   260px
--inspector-width: 320px
/* collapsed widths: 48px each */
```

Danger color `#c0504a` used inline; not yet a CSS var.

### Mastery gradient

Three-stop linear interpolation through HSL. All three stops are CSS vars with hex fallbacks:

| Score | CSS var | Fallback | Description |
|-------|---------|----------|-------------|
| 0.0 | `--mastery-low` | `#a8453a` | rusty red |
| 0.5 | `--mastery-mid` | `#d4924a` | burnt orange-yellow |
| 1.0 | `--mastery-high` | `#5a7a4a` | forest green |

`--mastery-brightness` (default `1.0`) scales HSL lightness — reserved for a Settings UI slider.

### StudyNode visual rules

- `border-left: 3px solid masteryToColor(score)` — heatmap on left edge
- `background: #1e1e2e` — fixed dark fill (not a token; hardcoded in StudyNode.tsx)
- `outline: 1px solid #6b8afd` when `selected === true`
- Top-right `●` dot when `layerCount > 0`
- **Zoom thresholds**: `zoomLevel >= 1.2` → Layer 1 content visible; `zoomLevel >= 2.0` → Layer 2 visible. `zoomLevel` is passed as data prop from GraphCanvas via `useStore((s) => s.transform[2])`.
- Connection handles: source bottom + right; target top + left. `opacity: 0.4` default, `opacity: 1` on hover (CSS). React Flow default node styles disabled globally with `all: unset`.

### Edge styles

| EdgeType | Stroke | Style | Arrow |
|----------|--------|-------|-------|
| `parent-child` | `#9a9a9f` gray | solid 1.5px | ArrowClosed |
| `prerequisite` | `#d4924a` orange | dashed `6 4`, 1.5px | ArrowClosed |
| `related` | `#6b8afd` blue | solid 1px, opacity 0.55 | none |
| `sequence` | `#5a7a4a` green | animated solid 1.5px | ArrowClosed |

Selected edge: `stroke-width: 2.5`, blue drop-shadow via `.react-flow__edge.selected` CSS class.

---

## 8. Locked Decisions

| Decision | Rationale |
|----------|-----------|
| **TSX not JSX** | Strict TypeScript catches shape mismatches in graph-heavy code (NodeDoc, EdgeDoc, Layer) that would silently pass in JSX. |
| **`@xyflow/react` over alternatives** | Handles pan, zoom, edge rendering, connection handles, and viewport transforms. Building equivalent from scratch would dominate weeks of work. |
| **Per-graph Firestore structure** | Matches "open a graph" mental model. Queries scoped per graph. Flat collection with graphId tag would require composite indexes. |
| **`layers` as array on NodeDoc** | All layers rendered together; subcollection would require N+1 reads for N nodes on canvas open. Array = single document read. |
| **BYO-AI ingestion model** | User provides own API key. No cost to the app. Prompt is version-controlled and auditable. |
| **Local-first dev mode** | Auth and Firestore rules are unnecessary friction during feature development. All features built and tested without cloud infrastructure. |
| **Earthy mastery palette** | Green/red is obvious but harsh. Rust → amber → forest-green is gentler for long sessions and more visually distinctive at intermediate scores. |
| **Monaco only for code layers** | ~300KB bundle cost. Earns it on `contentType: 'code'` with syntax highlighting. Text/math use plain `<textarea>`. |
| **React Flow default styles disabled globally** | Custom StudyNode owns its full appearance. RF defaults interfere with background, border, and selection ring. |

---

## 9. Workflow Conventions

Three-role AI-assisted development model:

- **Manager** (external Claude chat, long context): Holds architecture. Writes self-contained "delegation packets" — multi-file code bundles with explicit integration instructions. Reviews before/after each packet.
- **Worker** (fresh Claude/GPT chat, no project context): Given a single packet spec. Generates large code chunks without contamination from previous decisions.
- **Integrator** (this VS Code Copilot session): Applies Worker output surgically. Runs builds. Makes targeted merges when Worker output misses context (wrong import paths, duplicate exports, appended-not-replaced patterns).

The user codes well but uses AI for bulk generation, then reviews and tweaks the result. Integrator sessions often start with a conversation summary injected into context because the project spans multiple sessions.

**Common Integrator failure modes seen in this project:**
- Worker appends new code to existing files instead of replacing → file ends up with two `export default` blocks or duplicate `useGraphStore` calls outside a component.
- Worker uses wrong import paths (e.g. `../../firebase` instead of `../../lib/firebase`).
- Worker references methods that exist in their mental model but not in the actual codebase at generation time.
- After a multi_replace that creates an empty file, subsequent edit tools fail because the file has zero bytes — must use terminal `IO.File.WriteAllText` to populate.

---

## 10. Known Quirks & Limitations

- **Local pub-sub re-reads full collection on every mutation.** `notifyNodes` scans the full IDB index. Fine for < ~1000 nodes; degrades at scale.
- **`updateEdge` applies an optimistic local state update** in graphStore (patches the edges array in Zustand) in addition to the backend write. Local state could diverge if backend write fails silently.
- **Add Layer button** lives below the layers list. Layer cards scroll in a 400px-max container; the button is pinned below the scroll region and is always visible without scrolling past layers.
- **No undo/redo.** All mutations are fire-and-forget; no command stack.
- **No multi-select.** Node and edge selection is single-item only.
- **Self-loops blocked silently.** `onConnect` returns early if `source === target`; no user feedback (the drag just cancels with no message).
- **`getUserId()` hardcoded to `'dev-user'`** in both backends. Auth not implemented.
- **Cloud mode rejects unauthenticated writes.** `firestore.rules` not deployed; Firestore defaults lock it down. Cloud mode is non-functional until Auth ships.
- **`src/styles/mastery.css` is empty** — non-fatal Vite CSS warning on every build.
- **`react-router-dom` installed but unused.**
- **`src/features/`, `src/hooks/`, `src/components/body/` are empty scaffolding** from early packets.
- **Stale `StudyTool/` subdirectory at repo root** contains pre-TSX-migration `.jsx` files (`App.jsx`, `main.jsx`). Not built or imported; should be deleted.
- **Bundle is ~875KB minified / ~239KB gzip.** Monaco is the primary contributor. No code-splitting implemented.

---

## 11. Roadmap

### Packet 6.5 — Memorizer Lens: Path Finder
Non-adjacent connected node pair selected at random; player clicks intermediate nodes in correct order; reuses `drillStore` phase architecture. Mastery reward on correct path.

### Later (ordered priority)
- **Packet 8** — BYO-AI Ingestion (JSON schema, master prompts, Syllabus + Material modes, Orphan Inbox, dagre auto-layout)
- **Packet 9** — Auth UI (anonymous → Google upgrade; `getUserId()` reads `firebase.auth().currentUser`)
- **Packet 9.5** — Firestore security rules (`request.auth.uid == userId` guard)
- **Packet 11** — Project Packaging (`ClusterDoc` collapse, export to shareable bundle)
- **Packet 7** — Settings UI (mastery brightness slider, color pickers)
- **Packet 10** — Search (full-text across titles and layer content)
- **Packet 12** — Undo/redo (command stack)
- **Packet 13** — Multi-select (box-select, bulk delete/tag)

### Later (unordered, lower priority)
- **Auth UI**: anonymous → Google upgrade; `getUserId()` reads from `firebase.auth().currentUser`
- **Three Lenses**: Memorizer (spaced repetition from layer content), Architect (graph editing + cluster tools), Practitioner (code execution / Q&A via AI)
- **Project Packaging**: `ClusterDoc` collapse, export to shareable bundle
- **Settings UI**: mastery brightness slider, `--mastery-low/mid/high` color pickers
- **Search**: full-text across node titles and layer content
- **Undo/redo**: command stack (Zustand middleware or external)
- **Multi-select**: box-select on canvas, bulk delete/tag
- **Firestore security rules**: `request.auth.uid == userId` guard on all paths
- **Delete node cascades to edges**: currently `deleteNode` does not delete incident edges; they become dangling references

---

## 12. Project Tree

```
StudyTool/                         ← repo root (C:\Users\olivf\StudyToolProject\StudyTool)
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CanvasContextMenu.tsx
│   │   │   ├── GraphCanvas.tsx
│   │   │   └── StudyNode.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Inspector.tsx
│   │   │   └── Sidebar.tsx
│   │   └── workspace/
│   │       └── FocusWorkspace.tsx   (drill stage: idle/active/graded)
│   ├── features/
│   │   ├── lenses/                  (empty)
│   │   ├── map/                     (empty)
│   │   └── workspace/               (empty)
│   ├── hooks/                       (empty)
│   ├── lib/
│   │   └── firebase.ts
│   ├── scripts/
│   │   └── seedGraph.ts
│   ├── services/
│   │   └── storage/
│   │       ├── firestoreBackend.ts
│   │       ├── index.ts
│   │       ├── localBackend.ts
│   │       └── types.ts
│   ├── store/
│   │   ├── drillStore.ts
│   │   ├── graphStore.ts
│   │   └── viewStore.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── mastery.css              (empty, intentional)
│   ├── types/
│   │   ├── drill.ts
│   │   └── graph.ts
│   ├── utils/
│   │   ├── clozeSelection.ts
│   │   ├── edgeStyles.ts
│   │   └── masteryColor.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .env.local                       (gitignored)
├── .firebaserc
├── firebase.json
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts

Note: stale StudyTool/src/App.jsx + main.jsx at repo root — pre-migration artifacts, delete when convenient.
```

---

## 13. How to Run

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173, local (IndexedDB) mode by default
npm run build    # production build → dist/
```

**Switch to cloud mode** (requires a Firebase project with Firestore enabled):

```bash
# .env.local
VITE_STORAGE_MODE=cloud
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Auth is not yet implemented; cloud mode writes will be rejected by Firestore's default rules until `firestore.rules` is deployed and Auth is wired.

**Environment variable handling**: `.env.local` is gitignored (confirmed in `.gitignore`). Never commit it. Copy `.env.example` as a starting point.

**Deploy**:
```bash
npm run firebase:deploy    # npm run build + firebase deploy --only hosting
                           # → studytool-delta27.web.app
# Vercel auto-deploys main branch → studytool-delta27.vercel.app
```

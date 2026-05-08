<!-- Auto-generated technical README. Regenerate when major architecture changes ship. -->

# Nexus Study Engine

**Last updated: 2026-05-08 (Packet 11b integrator pass: Focus Picker + right-click drill sections)**

---

## 1. Project Identity

Nexus Study Engine is a spatial knowledge graph for solo deep-learning. The user (the student building it) maps concepts as nodes on a 2D canvas, draws typed edges between them, and annotates each node with layered content that is revealed progressively as zoom level increases — a Z-axis proxy for depth of detail. Each node carries a mastery score that drives a heatmap gradient on the node's left border: rusty red → burnt orange → forest green. The design codename "Nexus Study Engine" reflects a planned multi-modal study tool with three lenses (Memorize, Architect, Practise), BYO-AI ingestion (user's own Claude/GPT subscription, no platform API cost), and a graph-first mental model rather than flat flashcard decks. Nothing is public-facing; the project is a personal tool built by one person with AI-assisted code generation.

---

## Noted Problems

Update this section every time this README is updated, even if the entry is just "none currently noted."

- 2026-05-07: Verification pass completed with clean `npm run build` and no TypeScript errors, but not all drills were manually exercised end-to-end in UI.
- 2026-05-07: Async drill completion handlers can apply mastery more than once if the user double-clicks before the awaited write finishes. Verified in `submitMissingLink`, `giveUpMissingLink`, `submitClusterTitle`, `giveUpClusterTitle`, `submitSorter`, `giveUpSorter`, and `gradeScenarioBuilder` in `src/store/drillStore.ts`.
- 2026-05-07: Missing Link updates mastery after `createEdge(...)` without validating edge creation success beyond the awaited call, so a storage failure could leave mastery updated without the edge being persisted in `src/store/drillStore.ts`.
- 2026-05-07: RESOLVED � Debugger drill actions (startDebugger, setDebuggerInput, submitDebugger, giveUpDebugger) and DebuggerDrill types were absent from the canonical on-disk `src/store/drillStore.ts` and `src/types/drill.ts`. Root cause: Packet 9.5 disk writes were never committed to those two files. PowerShell patches applied; build (1971 modules) and full runtime audit passed. Audit matrix: Cloze ?, Path Finder ?, Missing Link ?, Cluster Title ?, Sorter ?, Scenario Builder ?, Debugger ?.

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
| Packet 6.5 | **Memorizer Lens — Path Finder.** New `src/utils/pathFinding.ts` (`getNeighbors`, `findEligiblePair`, `shortestPathLength`). `PathFinderDrill` type added to `drill.ts` union; `drillStore` extended with `startPathFinder`, `clickPathStep`, `giveUp` actions. `GraphCanvas` routes node clicks to `clickPathStep` during active drill; pane click no-ops. `StudyNode` subscribes to drillStore and shows per-node visual state: source (blue glow), target (green glow), in-path (orange dashed outline). New `PathFinderOverlay` floating panel (canvas-relative, top-center, z-50): active phase shows breadcrumb + Undo / Submit / Give Up; graded phase shows verdict, path summary, mastery delta, Pick another / Done. Sidebar gains a "Drills" section with Path Finder button + 3s inline error on sparse graph. Edge traversal rules: `parent-child` and `related` bidirectional; `prerequisite` and `sequence` source→target only. Mastery on submit: +0.10 shortest path / +0.05 one hop over / 0 two hops over / −0.10 invalid or give up; applied to start + end nodes only. |
| Packet 8a | **Architect Lens — Missing Link + Cluster Title drills.** New utils: `missingLink.ts` (eligible pair = no direct or indirect path, shares tag or 2-hop neighbor under bidirectional traversal), `clusterTitleSelection.ts` (parent with ≥2 `parent-child` children), `stringMatch.ts` (graduated match: exact 1.0 / Levenshtein ≤2 → 0.9 / substring → 0.7 / Jaccard ≥50% → 0.5). New drill types `MissingLinkDrill` + `ClusterTitleDrill` added to `drill.ts` union. `drillStore` extended: `startMissingLink`, `setMissingLinkType`, `setMissingLinkJustification`, `submitMissingLink`, `giveUpMissingLink`, `startClusterTitle`, `setClusterTitleInput`, `submitClusterTitle`, `giveUpClusterTitle`. Missing Link mastery: +0.10 to both endpoints on submit, −0.10 on give-up; edge written via `graphStore.createEdge`. Cluster Title mastery: score 1.0 → +0.10, 0.9 → +0.05, 0.7 → 0, ≤0.5 → −0.10 on parent node only. `StudyNode` gains per-kind visual states: missing-link endpoints get accent outline + glow + `?` badge; cluster-title parent gets dashed accent outline + `?` title mask; children get orange outline. New `MissingLinkOverlay` and `ClusterTitleOverlay` floating panels (canvas-relative, top-center, z-50). `GraphCanvas` click routing extended: non-path-finder active drills are no-ops on node and pane click. Canvas edit lockout (edge creation + Delete/Backspace) already present from prior sub-packet. Sidebar gains Missing Link and Cluster Title buttons with per-button 3s inline errors. |
| Packet 8b | **Architect Lens: Pre-work fixes + Sorter drill.** Pre-work: renamed `clozeSelection.ts` → `cloze.ts` and `clusterTitleSelection.ts` → `clusterTitle.ts`; verified `accessCount`/`lastAccessedAt` increments on all 4 drill starts; phase-gated Cluster Title title mask and children outline to `active` only; confirmed Missing Link justification floor (≥10 chars) and `edge.label` population; added color swatch previews to `MissingLinkOverlay` edge-type buttons; changed children outline from `#d4924a` → `rgba(107,138,253,0.45)`. Sorter drill: new `sorter.ts` util (`selectSorterCandidate` — 2–3 parents each with ≥2 `parent-child` children, 4–7 children total, no shared children); new `SorterDrill` type in `drill.ts`; `drillStore` extended with `startSorter` (saves originalPositions, scrambles children to bottom of canvas), `assignChild` (drag proximity ≤200px → parent, else null), `submitSorter` (score = correct/total, mastery delta via formula, applied to all parents + children), `giveUpSorter` (−0.10 to all), `dismiss` restores original positions for sorter. `GraphCanvas`: filters out parent-child edges between sorter parents↔children during active drill; `onNodeDragStop` triggers proximity detection and calls `assignChild`. `StudyNode`: parent gets accent outline + glow during active; child gets dashed-muted when unplaced / solid-accent when placed; graded shows ✓/✗ badge per child. New `SorterOverlay.tsx`: active phase shows placed progress + Submit (disabled until all placed) + Give Up; graded phase shows score verdict with color + mastery delta + note + Pick another / Done. Sidebar gains Sorter button + 3s inline error. **Architect Lens complete.** |

| Packet 9 | **Practitioner Lens: Scenario Builder.** Added `ScenarioBuilderDrill` (`kind: 'scenario-builder'`, `problemStatement`, `pipeline`, `builderPhase`) and dual-view workflow: authoring → building → graded. `drillStore` actions: `startScenarioBuilder`, `setProblemStatement`, `commitProblemStatement`, `addToPipeline`, `removeFromPipeline`, `reorderPipeline`, `submitScenarioBuilder`, `gradeScenarioBuilder`; dismissal resets view mode to canvas. `StudyNode` shows pipeline ordering badge; `FocusWorkspace` renders author/build/grade states; Sidebar has Scenario Builder launcher with minimum-node guard. |
| Hotfix 9.x | Sidebar `<nav>` given `flex: 1`, `minHeight: 0`, `overflowY: auto` so it scrolls when drill buttons + graph list exceed panel height. |
| Hotfix 9.y | Runtime check confirmed Scenario Builder action lookup issue came from stale runtime state; local hard-clean + fresh dev rebuild procedure established (`dist` + `node_modules/.vite` cleanup, hard refresh). |
| Hotfix 9.z | Canonical disk sources reconciled with expected Packet 9 state: `src/store/drillStore.ts` now includes all 8 Scenario Builder actions on the actual returned Zustand object, and `src/types/drill.ts` includes `ScenarioBuilderDrill` + scenario result fields (`verdict`, `problemStatement`, `pipeline`, `nodesAffected`). |
| Hotfix 9.zz | SB5 integrator fix: `GraphCanvas` now applies the active-drill edit lockout to edge-click selection as well, so active drills ignore edge selection just like edge-drag creation, Delete/Backspace, and non-drill node selection. |
| Packet 9.5 | **Practitioner Lens: The Debugger.** Added `brokenVersion?: string` to `Layer` type (code/math only). New `src/utils/debugDiff.ts` with `normalize()` (whitespace-collapse, trim) and `similarity()` (Levenshtein-based, [0,1]). New `DebuggerDrill` type added to `drill.ts` union; `DrillResult` extended with `similarity`, `nodeId`, `layerDepth` fields. `drillStore` extended with `startDebugger` (random or targeted pick of eligible code/math layer with non-empty `brokenVersion`), `setDebuggerInput`, `submitDebugger` (scores via similarity: ≥0.99→+0.10 / ≥0.80→+0.05 / ≥0.50→0 / else−0.10), `giveUpDebugger` (−0.10); `dismiss` updated to reset view mode. `StudyNode` highlights the subject node (accent outline + glow) during active debugger. `FocusWorkspace` renders active state (Monaco or textarea editor bound to `input`, right side panel listing edge-connected neighbors with expand-on-click read-only layers) and graded state (similarity %, mastery delta, Pick another / Done). `LayerCard` in Inspector gains a collapsible "Broken version" section for code/math layers (mirrored editor type, blur-to-commit) and a "Debug this layer" button. Sidebar gains a Debugger button with 3s inline error when no eligible layers exist. |
| Packet 11a | **Foundations: Settings, Shortcuts, Polish, Robustness.** New `useUserPrefsStore` (Zustand persist) holding mastery colour vars, sidebar/drill visibility, lens names, edge nicknames, default session mode, and settings/legend open flags. New `src/lib/shortcuts.ts` + `registerShortcuts.ts` + `useShortcuts.ts` hook — 7 keyboard shortcuts (Ctrl+E toggle-view, Esc deselect, `?`/`Ctrl+/` open legend, `Ctrl+,` open settings, `S` study-selected, `N` new-node) installed at App level via a single `keydown` listener; same registry drives the auto-generated `ShortcutLegendModal`. `SettingsModal` (Ctrl+,) covers mastery colours, sidebar drills toggle, session mode, lens names, edge nicknames, and one-click reset. `useApplyMasteryCssVars` side-effect hook writes 4 CSS vars on every pref change. Edge polish: `related` opacity 0.85 / strokeWidth 1.5. Handle polish: handles 10 × 10 px with `title="Drag to connect"`. EdgeInspector redesigned — header row (type-pill select + trash), source→target clickable row with muted arrow, created-at timestamp. `drillStore` double-submit guard (`submitting` flag) on all 7 async handlers. `graphStore.updateEdge` rolls back optimistic state on failure; `deleteNode` cascades to incident edges before deleting the node. Removed `mastery.css` and its `@import` (CSS vars now written dynamically). |
| Packet 11b | **Integrator pass: Focus Workspace picker + right-click drill launch sections.** Added `src/utils/drillEligibility.ts` with shared eligibility helpers and user-facing disabled reasons. Added `src/components/workspace/FocusPicker.tsx` and wired Focus Workspace idle state to render the picker (`phase === 'idle' && !currentDrill`). `drillStore.startCloze` now switches view mode to focus before setting drill state so canvas right-click launch paths are visible immediately. Canvas context menu now supports flat section labels and disabled items with reason tooltips; pane menu gets **START A DRILL** (Path Finder, Missing Link, Cluster Title, Sorter, Scenario Builder, Debugger random), node menu gets **STUDY THIS NODE** (Cloze + Debugger targeted). Edge menu behavior unchanged. |

**Next: Packet 11c — drill-menu expansion (submenus deferred from 11b).**

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
  ├── Sidebar          (left panel, collapsible, graph list + Drills entry point)
    ├── main             (center, switches on viewMode)
  │   ├── GraphCanvas  (canvas mode) → ReactFlowProvider > GraphCanvasInner + PathFinderOverlay
    │   └── FocusWorkspace (drill stage: idle/active/graded phases)
    └── Inspector        (right panel, collapsible, node↔edge mode)
        ├── EdgeInspector  (renders when selectedEdgeId set)
        └── node-mode      (title, mastery bar, Study-this-node btn, tags, LayerCards, Add Layer btn)
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
  viewMode: 'canvas' | 'focus' | 'dual'
  sidebarCollapsed, inspectorCollapsed
  toggleViewMode, setViewMode, toggleSidebar, toggleInspector

drillStore (Zustand)
  phase: 'idle' | 'active' | 'graded'
  currentDrill: Drill | null   ← discriminated union (ClozeDrill | PathFinderDrill | MissingLinkDrill | ClusterTitleDrill | SorterDrill | ScenarioBuilderDrill)
  result: DrillResult | null
  actions (cloze): startCloze, setAnswer, submit, dismiss
  actions (path-finder): startPathFinder, clickPathStep, giveUp
  actions (missing-link): startMissingLink, setMissingLinkType, setMissingLinkJustification, submitMissingLink, giveUpMissingLink
  actions (cluster-title): startClusterTitle, setClusterTitleInput, submitClusterTitle, giveUpClusterTitle
  actions (sorter): startSorter, assignChild, submitSorter, giveUpSorter
  actions (scenario-builder): startScenarioBuilder, setProblemStatement, commitProblemStatement,
                              addToPipeline, removeFromPipeline, reorderPipeline,
                              submitScenarioBuilder, gradeScenarioBuilder
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

The order below is locked. Packet 7 is intentionally late so the manual-build study loop validates end-to-end before ingestion scales it.

### Packet 6.5 — Memorizer Lens: Path Finder
Non-adjacent connected node pair selected at random; user clicks intermediate nodes in correct order; parent-child and related edges traversable either direction, prerequisite and sequence direction-respecting. Reuses `drillStore` phase architecture; mastery on correct path.

**Shipped.**

### Packet 8a — Architect Lens: Missing Link + Cluster Title
**Shipped.** See Packet Log row above for full detail.

### Packet 8b — Architect Lens: Sorter
**Shipped.** See Packet Log row above for full detail.

### Packet 9 — Practitioner Lens: Scenario Builder
**Shipped.** See Packet Log row above for full detail.

### Packet 9.5 — Practitioner Lens: The Debugger
New schema field `brokenVersion?: string` on Layer. User authors a broken version of a code/math layer; drill renders the broken version in Monaco with edge-connected nodes accessible in a side panel; whitespace-flexible diff against canonical; mastery on submit.

### Packet 11 — Settings, Polish, Keyboard Shortcuts, Edge Nicknames
- Settings panel: `--mastery-brightness` slider, color stop pickers for `--mastery-low/mid/high`.
- Deferred visual polish: E1 (related edge stroke ~0.85 opacity, slightly thicker), E2 (handle sizing + hover tooltip), E4 (Inspector edge-mode inline Source → Target, Created timestamp, trash to header).
- Keyboard shortcut registry in `src/lib/shortcuts.ts`. Initial set: Ctrl+E view toggle, Ctrl+K search, S study selected, N new at cursor, Esc deselect, ?/Ctrl+/ open legend.
- Edge nicknames: per-user display rename per `EdgeType` (underlying type unchanged).
- Floating canvas legend (bottom-right) for edge types + nicknames.
- Quick Start sidebar UX for empty graphs: Import from JSON / Build from scratch / Generate a topic outline (modal showing copyable Topic Outline prompt).
- Ctrl+K full-text search across node titles and Layer 1 content.

### Packet 7 — BYO-AI Ingestion (intentionally late)
Four prompt variants — Syllabus, Material, Code Project, Topic Outline — each with a model-agnostic and a Claude-optimized version (8 prompt files in `docs/ingestion/`). JSON schema in `docs/ingestion/schema.{md,json}`, validated on import. Sidebar "Import from JSON" → preview modal (X nodes, Y edges, target graph picker) → per-import toggle (Stage in Orphan Inbox vs Auto-commit) → apply. Orphan Inbox = collapsible Sidebar section, drag-to-canvas, "Add All" with auto-layout. Dagre for nodes without position hints. Implicit tags from prompts. No server-side processing.

### Packet 10 — Optional Cloud Sync
Local mode remains default forever, no login required. "Enable Cloud Sync" in Settings; Firebase Auth UI (anonymous default, optional Google upgrade); one-way local→cloud migration of existing local graphs; `firestore.rules` deployed (`users/{userId}/{document=**}` → `request.auth.uid == userId`); `getUserId()` reads `auth.currentUser` when cloud mode active, falls back to `'dev-user'` otherwise.

### Packet 12 — Refine Prompts + Heavy-Use + Time-Based Decay
Refine Prompt indicator on nodes meeting threshold (`accessCount ≥ 10` AND oldest layer > 90 days) → modal: "You created this layer [X months] ago. Has your understanding evolved?" with Add new layer (default) / Edit existing / Dismiss for 30/90/never days. Adding always preserves prior layers. Time-based decay on app load: for nodes with `reviewCount > 0` AND `lastReviewedAt` > 7 days, `mastery.score -= 0.02 × weeks_since_review`, floor 0.3. Never decay never-reviewed nodes.

### Packet 13 — Project Packaging (Archive Nodes)
Lasso-select on canvas (modifier+drag or toolbar). "Archive Selection" collapses into a single Archive Node (dense stack-of-cards visual, count badge); reversible on click. Uses existing `clusterId` field. Archive Nodes searchable while collapsed (via Packet 11's Ctrl+K). Nestable (archives within archives).

### Standing tech-debt items (no packet assigned)
- `deleteNode` cascades to incident edges (currently leaves dangling references).
- Empty scaffolding directories: `src/features/`, `src/hooks/`, `src/components/body/`.
- Stale `StudyTool/src/App.jsx` + `main.jsx` at repo root.

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
│   │   │   ├── ClusterTitleOverlay.tsx
│   │   │   ├── GraphCanvas.tsx
│   │   │   ├── MissingLinkOverlay.tsx
│   │   │   ├── PathFinderOverlay.tsx
│   │   │   ├── SorterOverlay.tsx
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
│   │   ├── cloze.ts
│   │   ├── clusterTitle.ts
│   │   ├── edgeStyles.ts
│   │   ├── masteryColor.ts
│   │   ├── missingLink.ts
│   │   ├── pathFinding.ts
│   │   ├── sorter.ts
│   │   └── stringMatch.ts
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

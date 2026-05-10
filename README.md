# Nexus Study Engine

Last updated: 2026-05-10 (Packet 16)

Nexus Study Engine is a graph-first study app built with React + TypeScript. You create knowledge graphs on a canvas, attach layered content to nodes, run drills that update mastery over time, descend into child graphs, and explore top-level graphs from a universe view.

## Current Status

Implemented through Packet 16:

- Graph canvas with node and edge editing
- 10 drill types including generative drills (Bridge, Example, Stub-fill)
- Session system (open, class-study, exam-prep)
- Focus Workspace drill flow (idle, active, graded)
- Right-click drill launch menus with submenu support (Packet 11d)
- Universe view (L0) for top-level graphs with mastery aggregates (Packet 14)
- Child graph containers + breadcrumb navigation across graph depth (Packet 15)
- Generative drill system + bridge overlay + node-targeted study extensions (Packet 16)
- Settings and shortcut legend modals
- Local-first storage plus optional Firestore backend
- Seed graph tooling including Houseplant Care JSON dataset

## Core Features

### Graph authoring

- React Flow canvas with pan/zoom and typed edges
- Node actions: create, edit, duplicate, connect, delete
- Edge actions: edit, reverse direction, delete
- Four edge types: parent-child, related, prerequisite, sequence
- Layered node content with text/code/math content types
- Mastery score on each node with heat-style left border coloring

### Drill system

Available drills:

- Cloze
- Path Finder
- Missing Link
- Cluster Title
- Sorter
- Scenario Builder
- Debugger
- Bridge
- Example
- Stub-fill

Drills run in Focus Workspace and write mastery updates back to node docs.

### Sessions

Session modes:

- Open: timed free session
- Class-study: optional timer + tag-filtered node pool
- Exam-prep: optional timer + fixed drill count target

Session behavior:

- Start points: Sidebar, Focus Picker, pane context menu, Ctrl+Shift+S
- Progression is user-driven from graded state (Next drill / End session)
- Pool-aware drill picking supports class-study tag filtering

### View Modes

Four view modes accessible via buttons or keyboard:

- **Canvas** (Ctrl+E): Edit graphs with React Flow panning/zooming and layered node content
- **Focus**: Practice drills with session pooling and mastery tracking
- **Dual**: Side-by-side Canvas + Focus for simultaneous editing and drilling
- **Universe** (Ctrl+U): Galaxy view of top-level graphs with aggregate mastery indicators

### Packet 11d submenu UX

Context menu updates:

- Pane menu has:
  - Start a session... (flat item)
  - Start a drill -> submenu (Path Finder, Missing Link, Cluster Title, Sorter, Scenario Builder, Debugger random, Bridge, Example, Stub-fill)
- Node menu has:
  - Study this node -> submenu (Cloze, Debugger, Example, Stub-fill)
  - Parent item disables when neither child drill is eligible
- Submenu behavior:
  - Hover-open with delay
  - Direction flip near right viewport edge
  - Esc and outside-click close behavior preserved

### Packet 14 Universe View (L0)

New **Universe** view mode:

- React Flow canvas showing top-level graphs as draggable cards
- Each graph card displays:
  - Graph name with inline editing (click to rename)
  - Semester tag (if set)
  - Content tags (up to 3 visible + overflow counter)
  - Aggregate mastery bar and node counts
  - Color-coded left border reflecting graph mastery
- Universe edges between graphs (parent-child, related, prerequisite, sequence types)
- Right-click menus:
  - Pane: Create new class at coordinates
  - Node: Open graph to canvas, rename graph
  - Edge: Change type, delete
- Positions auto-persist to storage
- Aggregates computed per-graph on load (filters archived nodes)
- Quick launch: Click any graph card to jump to canvas view for that graph
- Child graphs are intentionally excluded from Universe and entered from their parent node

### Packet 15 Child Graphs

Nodes can act as containers that descend into a child graph:

- Node model supports optional `childGraphId`
- Graph metadata includes `parentNodeId` + `parentGraphId` pointers
- Double-click a container node to enter its child graph
- Node context menu supports:
  - Create child graph
  - Open child graph
  - Unlink child graph (returns orphaned child to top-level Universe)
- Container indicator (`↘`) renders on study nodes with child graphs
- Inspector behavior:
  - Leaf node: Study button + Layers section remain available
  - Container node: Container panel with Open/Unlink actions; Layers and Study button hidden
- Sidebar behavior:
  - Breadcrumb appears above Graphs for nested navigation and inline rename of current crumb
  - Graph list shows top-level graphs only

### Packet 16 Generative Drills

Added three generative drill flows with asymmetric grading (create/fill gives +0.05 mastery, cancel gives 0):

- Bridge (architect lens):
  - Starts in dual view and overlays controls on canvas
  - User selects two nodes, chooses edge type, and enters label (minimum 5 chars)
  - Creates edge and applies +0.05 mastery to both endpoints
  - Dismiss restores canvas view
- Example (practitioner lens):
  - Targets node with non-empty Layer 1 text (random or node-scoped)
  - Requires user input of at least 10 chars
  - Creates new "Example: ..." node, links it as related, and applies +0.05 to source node
- Stub-fill (memorizer lens):
  - Targets empty or missing Layer 1 text node (random or node-scoped)
  - Requires user input of at least 10 chars
  - Fills Layer 1 content in place and applies +0.05 to target node

Other Packet 16 behavior:

- Defensive guard prevents child-graph double-click navigation during any active drill
- StudyNode highlights selected bridge endpoints during active Bridge drill
- Session auto-rotation includes Bridge, Example, and Stub-fill via lens mapping and eligibility checks

### Settings and shortcuts

Settings modal supports:

- Mastery color stops and brightness
- Hide sidebar drill buttons
- Default session mode
- Lens naming
- Edge nickname customization

Shortcut legend is generated from the same shortcut registry used at runtime.

Current shortcuts:

- Ctrl+E: toggle canvas/focus
- Ctrl+U: toggle universe view
- Esc: deselect (when drill phase is idle)
- ?: toggle shortcut legend
- Ctrl+/: toggle shortcut legend
- Ctrl+,: open settings
- S: study selected node (Cloze)
- Ctrl+Shift+S: open session modal
- N: create node

## Technical Stack

- React 18
- TypeScript 6
- Vite 5
- Zustand
- @xyflow/react
- Firebase SDK
- IndexedDB via idb
- Monaco editor (code layers)

## Storage Modes

Configured by `VITE_STORAGE_MODE`:

- local: IndexedDB backend (`src/services/storage/localBackend.ts`)
- cloud: Firestore backend (`src/services/storage/firestoreBackend.ts`)

Packet 14/15 updates:

- Added `universePrefs` object store (IndexedDB v2) to persist universe edge data and graph positions
- Added `updateGraph()` method to both backends for PATCH-style updates to graph metadata
- Added `getUniversePrefs()` / `setUniversePrefs()` methods with Timestamp serialization
- Child graph links are persisted via graph/node patch writes (`childGraphId`, `parentNodeId`, `parentGraphId`)

Packet 16 updates:

- Drill kind union expanded with `bridge`, `example`, and `stub-fill`
- Session lens map and random drill progression include all three new drill kinds
- New eligibility helpers added in `src/utils/drillEligibility.ts` (`canBridge`, `canExample`, `canStubFill`)

Notes:

- Local mode is the default
- `getUserId()` is currently dev-only (`dev-user`)
- Cloud mode requires Auth/rules work to fully function for secured projects

## Seed Data

Seed entry points in `src/scripts/seedGraph.ts`:

- Embedded Systems Sandbox
- Linear Algebra Sandbox
- LGBTQ+ Identity Vocabulary (JSON)
- Houseplant Care (JSON)

The Houseplant Care dataset intentionally includes all four edge types for quick drill smoke tests.

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run preview`: preview production build
- `npm run firebase:deploy`: build + Firebase Hosting deploy
- `npm run firebase:hosting:channel`: build + Firebase preview channel deploy

## Deployment

Primary hosting command:

```bash
npm run firebase:deploy
```

There is no `npm run deploy` script in this repo.

## Architecture Snapshot

Main stores:

- `graphStore`: graph docs, selection, CRUD, subscriptions
- `drillStore`: drill lifecycle + grading + mastery effects
- `sessionStore`: session lifecycle + drill progression/pooling
- `viewStore`: canvas/focus/dual/universe mode and panel collapse state
- `universeStore`: universe canvas state, graph positions, edges, aggregates (Packet 14)
- `userPrefsStore`: persisted user preferences + modal flags

Main UI shells/components:

- `AppShell`: Main layout grid with view mode routing
- `GraphCanvas`: React Flow canvas for node/edge editing
- `UniverseCanvas`: React Flow canvas for graph galaxy view (Packet 14)
- `GraphCard`: Reusable node component for Universe canvas (Packet 14)
- `CanvasContextMenu`: Context menu with drill/session launch (Packet 11d)
- `FocusWorkspace`: Drill session container with phases and grading
- `FocusPicker`: Modal for starting a new session
- `SessionModal`: Modal for session configuration
- `SessionBanner`: Header showing active session progress
- `SettingsModal`: User preferences (colors, defaults, shortcut display)
- `ShortcutLegendModal`: Registry-driven shortcut reference
- `Inspector`: Side panel for graph/node info
- `Sidebar`: Left navigation with drill buttons, create graph, breadcrumb, and view mode toggles
- `Breadcrumb`: Nested graph navigation and inline rename for current crumb (Packet 15)

## Known Limitations

- `window.confirm()` is still used in `GraphCanvas` delete paths (planned future packet replacement)
- `sessionStore.ts` currently contains a duplicate `interface SessionStore` declaration at file end (TypeScript merge makes it harmless but it is dead code)
- No dedicated auth flow yet; cloud mode is not full production-ready without rules/auth setup

## Repository Layout (high level)

```text
src/
  components/
    canvas/
    layout/
    workspace/
  hooks/
  lib/
  scripts/
    seedData/
  services/storage/
  store/
  styles/
  types/
  utils/
```

Packet 15 also adds:

- `src/components/layout/Breadcrumb.tsx`
- `src/utils/graphHierarchy.ts`

Packet 16 also adds:

- `src/components/canvas/BridgeOverlay.tsx`
- `src/components/workspace/ExampleDrill.tsx`
- `src/components/workspace/StubFillDrill.tsx`

If major architecture or packet milestones change, update this README in the same commit.

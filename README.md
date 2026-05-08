# Nexus Study Engine

Last updated: 2026-05-08 (Packet 11d)

Nexus Study Engine is a graph-first study app built with React + TypeScript. You create knowledge graphs on a canvas, attach layered content to nodes, and run drills that update mastery over time.

## Current Status

Implemented through Packet 11d:

- Graph canvas with node and edge editing
- 7 drill types
- Session system (open, class-study, exam-prep)
- Focus Workspace drill flow (idle, active, graded)
- Right-click drill launch menus with submenu support (Packet 11d)
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

### Packet 11d submenu UX

Context menu updates now shipped:

- Pane menu has:
  - Start a session... (flat item)
  - Start a drill -> submenu (Path Finder, Missing Link, Cluster Title, Sorter, Scenario Builder, Debugger random)
- Node menu has:
  - Study this node -> submenu (Cloze, Debugger)
  - Parent item disables when neither child drill is eligible
- Submenu behavior:
  - Hover-open with delay
  - Direction flip near right viewport edge
  - Esc and outside-click close behavior preserved

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
- `viewStore`: canvas/focus mode and panel collapse state
- `userPrefsStore`: persisted user preferences + modal flags

Main UI shells/components:

- `AppShell`
- `GraphCanvas`
- `CanvasContextMenu`
- `FocusWorkspace`
- `FocusPicker`
- `SessionModal`
- `SessionBanner`
- `SettingsModal`
- `ShortcutLegendModal`
- `Inspector`
- `Sidebar`

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

If major architecture or packet milestones change, update this README in the same commit.

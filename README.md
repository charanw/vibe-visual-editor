# Visual Vibes

Visual Vibes is a visual editor for proprietary Vibe templates.

A Vibe is a structured workflow template that defines steps, inputs, routing, error handling, and completion behavior. This app makes Vibes easier to read, edit, validate, and debug through an interactive visual interface.

## What This App Does

Visual Vibes lets you:

- Upload and view Vibe files
- Edit Vibe source directly
- Visualize workflow steps as an interactive graph
- Switch between Flow View and Error View
- Inspect and edit individual steps
- Edit step inputs using Key/Value fields or raw JSON
- Add, remove, and connect workflow steps
- View error paths, error handlers, and terminating errors
- Zoom, pan, recenter, and fullscreen the canvas
- Export updated Vibes

## What Is a Vibe?

A Vibe is a proprietary workflow template used to define how a process should run.

Each Vibe contains:

- Workflow metadata
- Step definitions
- Step inputs
- Main flow routing
- Error handling paths
- Completion behavior

Example Vibe structure:

```yaml
workflow:
  id: example_workflow
  name: Example Workflow
  description: A simple workflow example
  steps:
    - id: normalize_request
      function: setVariable
      input:
        type: fixed
        channel: web
      next_step_id: get_customer_profile

    - id: get_customer_profile
      function: apiRequest
      input:
        endpoint: /customers/profile
      on_error_step_id: customer_profile_error

    - id: customer_profile_error
      function: setVariable
      input:
        error: customer profile lookup failed
```

## Views

### Flow View

Flow View shows the main execution path of the Vibe. Explicit
`next_step_id` values define authored routing; when a step omits
`next_step_id`, the visualizer treats the next step in YAML order as the
effective next step.

The custom SVG canvas uses ELK Layered (`elkjs`) to compute workflow geometry.
Visual Vibes keeps the YAML-derived graph as the source of truth, then asks ELK
for node positions and routed edge bend points without using React Flow. Desktop
canvases default to horizontal flow, while mobile canvases default to vertical
flow:

```txt
1  ->  2  ->  3  ->  4  ->  5
                         |
10 <-  9  <-  8  <-  7  <-  6
|
11 -> 12 -> 13 -> 14 -> 15
```

### Error View

Error View shows error paths as readable chains.

Each error path is grouped with its source and recovery steps, making it easier
to see:

- Which step has an error path
- Where the error path goes
- Which steps are error handlers
- Which paths end in terminating errors
- Which paths recover back into the normal flow

## Visual Conventions

The canvas uses color and shape to make Vibes easier to understand:

- Blue nodes represent normal Vibe steps.
- Yellow nodes represent error handlers.
- Yellow dashed edges represent error paths.
- Red nodes represent terminating errors.
- Red dashed edges point into terminating errors.
- Green nodes represent conclusions.
- A checkered flag marks starting points in the main Flow View.

## Editing a Vibe

To edit a step:

1. Select a node on the canvas.
2. Unlock step editing from the canvas or the pencil icon in the Inspector.
3. Update the step ID, function, description, input, or error handling fields.
4. Save the step.

The Inspector supports two input editing modes:

### Key/Value Mode

Best for simple top-level input fields.

### Raw JSON Mode

Best for nested objects or advanced input structures.

## Error Handling

The Inspector includes error handling fields for each step.

A step can define:

- An error step ID
- An error message

When a step has an error path, the Error View shows the related chain visually.

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Run unit tests:

```bash
npm test
```

Run the production build:

```bash
npm start
```

## Architecture Overview

The app uses a **feature-based, layered architecture** that separates concerns into presentation, state management, and domain logic. The Next.js route layer stays thin and imports the Visual Vibes feature through one public entry point:

```ts
import { VisualVibesEditor } from "@/features/visual-vibes";
```

### Directory Structure

```txt
src/
  app/                           Next.js route shell and global styles

  features/visual-vibes/         Editor UI layer (presentation & state)
    index.ts                      Public feature entry point
    types.ts                      Shared feature contracts
    components/
      VibeCanvas.tsx              Main canvas wrapper
      VibeFileControls.tsx         File upload/download UI
      VibeInspector.tsx            Inspector wrapper
      VibeYamlEditor.tsx           YAML source editor
      VisualVibesEditor.tsx        Main editor component
      canvas/
        components/               Canvas rendering & controls (nodes, edges, zoom, etc.)
        hooks/                    Canvas-specific state hooks
        utils/                    Canvas layout and rendering utilities
      editor/
        AppFooter.tsx             Status and metadata display
        PanelHeader.tsx           Pane headers and controls
        PaneResizeHandler.tsx      Resizable pane logic
        editorGraphFilters.ts     View filtering logic
      inspector/
        InspectorField.tsx         Field input components
        InspectorIcons.tsx         Icon utilities
        inputTypes.ts             Input field type definitions
        inputUtils.ts             Input validation/formatting helpers
      panes/
        CanvasPane.tsx             Flow/Error view switcher
        SourcePane.tsx             YAML editor pane
        InspectorPane.tsx          Step inspector pane
    hooks/                        Feature state management
      useCanvasResizeObserver.ts  Canvas resize handling
      useDefaultVibeYaml.ts       Default Vibe loading
      (others)                    Store subscriptions, actions, selectors
    state/
      visualVibesStore.ts         Zustand state store
      editorActions.ts            State mutation functions
      editorHistory.ts            Undo/redo history
      editorSelectors.ts          State selectors
    utils/                        Feature-specific helpers
      editorUtils.ts              Editor logic utilities
      mobileLayoutUtils.ts        Responsive layout helpers
      paneResizeUtils.ts          Pane sizing utilities

  lib/visual-vibes/              Domain logic layer (pure functions & types)
    appConfig.ts                  App configuration
    schema.ts                     Zod schema definitions
    validation.ts                 Validation logic
    yaml.ts                       YAML utilities
    __tests__/                    Unit tests

    functions/                    Function registry
      registry.ts                 Central function registry
      types.ts                    Function definition types
      categories.ts               Function categories
      fieldSchemas.ts             Reusable input field schemas
      index.ts                    Barrel export

    graph/
      buildGraph.ts              Extract graph from Vibe YAML
      graphTraversal.ts          Graph traversal algorithms
      graphTypes.ts              Graph type definitions

    layout/
      layoutGraph.ts             ELK Layered graph-to-canvas layout adapter
      layoutTypes.ts             Layout type definitions

    routing/
      effectiveRouting.ts        Resolve explicit and YAML-order next steps
      index.ts                   Routing barrel export

    mutations/
      addStep.ts                 Add new workflow step
      deleteStep.ts              Delete workflow step
      renameStep.ts              Rename step ID
      reorderSteps.ts            Change step order
      updateStep.ts              Update entire step
      updateStepField.ts         Update single step field
      updateRouting.ts           Modify step routing
      index.ts                   Mutations barrel export

    selectors/                    Workflow data queries
      getStepById.ts             Find step by ID
      getStepReferences.ts       Find steps that reference a step
      getIncomingEdges.ts        Find edges pointing to a step
      getOutgoingEdges.ts        Find edges from a step
      getDownstreamSteps.ts      Find all reachable steps
      getUnreachableSteps.ts     Find orphaned steps
      index.ts                   Barrel export

    parser/
      parseYaml.ts               Parse YAML to typed objects
      serializeYaml.ts           Serialize typed objects to YAML

  public/
    vibes/                        Example YAML files
      example-vibe.yml           Default editor starter Vibe
```

### Key Architecture Concepts

**Layered Architecture:**

- **Presentation Layer** (`features/visual-vibes/components`) — React components and UI logic
- **State Management** (`features/visual-vibes/state` + `hooks`) — Zustand store, selectors, actions
- **Domain Layer** (`lib/visual-vibes`) — Pure functions for business logic, independent of React

**Data Flow:**

1. User interactions in components dispatch actions to the Zustand store
2. Actions call domain logic functions (mutations, graph building, layout)
3. Store updates state, components re-render via hooks/selectors
4. Canvas re-renders with updated layout

**Key Modules:**

- **Graph Layer** — Converts Vibe YAML structure into graph nodes/edges for visualization
- **Routing Layer** — Resolves effective execution order from explicit routing and YAML-order fallthrough
- **Layout Layer** — Uses ELK Layered to compute node positions and routed edges for the custom SVG canvas
- **Mutations Layer** — Pure functions to safely modify Vibes (add/remove/reorder/edit steps)
- **Parser Layer** — Bidirectional YAML ↔ typed objects with validation
- **Canvas Layer** — SVG-based interactive visualization with zoom, pan, and node selection
- **Function Registry** — Centralized definitions of available functions and their metadata
- **Selectors Layer** — Consistent query functions for workflow data without repeated searches

### Function Registry

The `lib/visual-vibes/functions` module defines what each Studio X function is and how the editor should treat it:

```typescript
import {
  getFunctionDefinition,
  getFunctionsByCategory,
} from "@/lib/visual-vibes/functions";

const definition = getFunctionDefinition("aiProcessing");
const groups = getFunctionsByCategory(); // Group functions by category for UI
```

**Registry includes:**

- Function metadata (id, label, category, description)
- Default input templates with example values
- Reusable field schemas for parameter definitions
- Behavioral flags (isTerminal, isControlFlow, isExperimental)

This replaces ad-hoc function definitions with a single, extensible source of truth.

### Workflow Selectors

The `lib/visual-vibes/selectors` module provides consistent query functions for accessing workflow data:

```typescript
import {
  getStepById,
  getStepReferences,
  getDownstreamSteps,
} from "@/lib/visual-vibes/selectors";

const step = getStepById(vibe, "step-id");
const references = getStepReferences(vibe, "step-id"); // What references this step?
const downstream = getDownstreamSteps(vibe, "step-id"); // What steps follow?
```

**Available selectors:**

- `getStepById` — Find a step by ID
- `getStepReferences` — Find all steps that reference a given step
- `getIncomingEdges` — Find edges pointing to a step
- `getOutgoingEdges` — Find edges from a step
- `getDownstreamSteps` — Find all reachable steps (BFS traversal)
- `getUnreachableSteps` — Find orphaned/disconnected steps

This keeps components clean, prevents repeated searches, and makes behavior consistent across the codebase.

### Technology Stack

- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS 4
- **Editor:** Monaco Editor (embedded for YAML editing)
- **Type Safety:** TypeScript, Zod (schema validation)
- **Testing:** Node test runner with TypeScript

### Feature Internals

- `features/visual-vibes/index.ts` is the public import surface for the feature.
- `features/visual-vibes/types.ts` defines shared interaction contracts such as canvas view mode, edge operations, metadata fields, and step updates.
- `VisualVibesEditor` composes the workspace and delegates cross-pane actions to `useVisualVibesEditorActions`.
- `components/panes` owns the three workspace regions: source, canvas, and inspector.
- `components/canvas` owns canvas-specific controls, metadata display, icons, badges, constants, and graph classification helpers.
- `components/inspector` owns form controls, input parsing helpers, and step-function templates.
- `hooks` owns state and lifecycle logic for YAML loading, edit modes, responsive layout, graph layout, canvas resize observation, and editor actions.
- `lib/visual-vibes/__tests__` covers the domain layer with Node's built-in test runner.

## Notes

Visual Vibes keeps the Vibe source as the source of truth while providing a clearer visual editing experience.

The goal is to make proprietary Vibe templates easier to understand, update, and troubleshoot without losing the structure of the original template.

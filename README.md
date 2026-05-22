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

Flow View shows the main execution path of the Vibe.

It uses a serpentine layout so larger Vibes can remain readable on one page:

```txt
1  →  2  →  3  →  4  →  5
                         ↓
10 ←  9  ←  8  ←  7  ←  6
↓
11 → 12 → 13 → 14 → 15
```

### Error View

Error View shows error paths as vertical chains.

Each error path is organized into its own column, making it easier to see:

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

Run the production build:

```bash
npm start
```

## Project Structure

The app uses feature-based architecture. Route-level code imports the Visual Vibes feature through its public entry point:

```ts
import { VisualVibesEditor } from "@/features/visual-vibes";
```

```txt
src/
  app/
    page.tsx
    layout.tsx
    globals.css
  features/
    visual-vibes/
      index.ts
      components/
        VisualVibesEditor.tsx
        VibeCanvas.tsx
        VibeInspector.tsx
        VibeFileControls.tsx
        VibeYamlEditor.tsx
        canvas/
          CanvasBadges.tsx
          CanvasIcons.tsx
          CanvasLegend.tsx
          EditableMetadataField.tsx
          canvasConstants.ts
          canvasGraphUtils.ts
        editor/
          AppFooter.tsx
          PanelHeader.tsx
          PaneResizeHandler.tsx
          editorGraphFilters.ts
        inspector/
          InputKeyValueRowEditor.tsx
          InspectorField.tsx
          InspectorIcons.tsx
          inputTypes.ts
          inputUtils.ts
          stepFunctionTemplates.ts
        panes/
          CanvasPane.tsx
          InspectorPane.tsx
          SourcePane.tsx
      hooks/
        useCanvasResizeObserver.ts
        useDefaultVibeYaml.ts
        useEditingState.ts
        useGraphLayout.ts
        useLayoutState.ts
        useVibeState.ts
      utils/
        editorUtils.ts
        mobileLayoutUtils.ts
        paneResizeUtils.ts
  lib/
    visual-vibes/
      appConfig.ts
      graph.ts
      layout.ts
      schema.ts
      validation.ts
      yaml.ts
  public/
    vibes/
      example-vibe.yml
```

### Feature Boundaries

- `features/visual-vibes/index.ts` is the public import surface for the feature.
- `components/panes` contains the three major workspace regions: source, canvas, and inspector.
- `components/canvas` contains canvas-specific display helpers, icons, constants, and graph classification utilities.
- `components/inspector` contains inspector form controls, input parsing, and step-function templates.
- `hooks` contains state and lifecycle logic for YAML loading, editing modes, responsive layout, graph layout, and canvas resize observation.
- `utils` contains feature-level helpers shared across the editor shell and panes.
- `lib/visual-vibes` contains domain logic for parsing, validating, graph conversion, layout, schema, and app metadata.

## Notes

Visual Vibes keeps the Vibe source as the source of truth while providing a clearer visual editing experience.

The goal is to make proprietary Vibe templates easier to understand, update, and troubleshoot without losing the structure of the original template.

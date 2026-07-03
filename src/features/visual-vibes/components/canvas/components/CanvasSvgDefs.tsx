/** Shared SVG markers used by graph edges. */
export function CanvasSvgDefs() {
  return (
    <defs>
      <pattern
        id="canvas-grid-small"
        width="24"
        height="24"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 24 0 H 0 V 24"
          fill="none"
          stroke="rgba(148, 163, 184, 0.12)"
          strokeWidth="1"
        />
      </pattern>

      <pattern
        id="canvas-grid"
        width="96"
        height="96"
        patternUnits="userSpaceOnUse"
      >
        <rect width="96" height="96" fill="url(#canvas-grid-small)" />
        <path
          d="M 96 0 H 0 V 96"
          fill="none"
          stroke="rgba(56, 189, 248, 0.13)"
          strokeWidth="1.5"
        />
      </pattern>

      <filter
        id="selected-node-glow"
        x="-35%"
        y="-45%"
        width="170%"
        height="190%"
      >
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="7"
          floodColor="rgb(56, 189, 248)"
          floodOpacity="0.72"
        />
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="2"
          floodColor="rgb(125, 211, 252)"
          floodOpacity="0.95"
        />
      </filter>

      <marker
        id="arrow-data"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="5"
        viewBox="0 0 10 10"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L10,5 L0,10 z" fill="var(--edge-color)" />
      </marker>

      <marker
        id="arrow-next"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="5"
        viewBox="0 0 10 10"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L10,5 L0,10 z" fill="var(--brand-primary)" />
      </marker>

      <marker
        id="arrow-error"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="5"
        viewBox="0 0 10 10"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" />
      </marker>

      <marker
        id="arrow-terminal-error"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="5"
        viewBox="0 0 10 10"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L10,5 L0,10 z" fill="var(--danger)" />
      </marker>

      <marker
        id="arrow-preview"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="5"
        viewBox="0 0 10 10"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L10,5 L0,10 z" fill="rgba(125, 211, 252, 0.95)" />
      </marker>
    </defs>
  );
}

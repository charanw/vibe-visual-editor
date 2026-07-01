/** Shared SVG markers used by graph edges. */
export function CanvasSvgDefs() {
  return (
    <defs>
      <marker
        id="arrow-data"
        markerWidth="12"
        markerHeight="12"
        refX="9"
        refY="3"
        viewBox="0 0 10 6"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)" />
      </marker>

      <marker
        id="arrow-next"
        markerWidth="12"
        markerHeight="12"
        refX="9"
        refY="3"
        viewBox="0 0 10 6"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L0,6 L9,3 z" fill="var(--brand-primary)" />
      </marker>

      <marker
        id="arrow-error"
        markerWidth="12"
        markerHeight="12"
        refX="9"
        refY="3"
        viewBox="0 0 10 6"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
      </marker>

      <marker
        id="arrow-terminal-error"
        markerWidth="12"
        markerHeight="12"
        refX="9"
        refY="3"
        viewBox="0 0 10 6"
        orient="auto"
        markerUnits="strokeWidth"
        style={{ overflow: "visible" }}
      >
        <path d="M0,0 L0,6 L9,3 z" fill="var(--danger)" />
      </marker>
    </defs>
  );
}

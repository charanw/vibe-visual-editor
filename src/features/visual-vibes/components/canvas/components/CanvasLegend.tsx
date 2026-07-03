type LegendItemProps = {
  className: string;
  label: string;
  variant?: "line" | "dash" | "node" | "rhombus" | "hex" | "circle";
};

/** Single item in the canvas edge/node legend. */
export function LegendItem({
  className,
  label,
  variant = "line",
}: LegendItemProps) {
  const shape =
    variant === "node"
      ? "h-3 w-5 rounded border"
      : variant === "rhombus"
        ? "h-3 w-5 -skew-x-[28deg] border"
        : variant === "hex"
          ? "h-3 w-5 border [clip-path:polygon(18%_0,82%_0,100%_50%,82%_100%,18%_100%,0_50%)]"
          : variant === "circle"
            ? "h-3 w-3 rounded-full border"
            : `w-8 border-t-2 ${variant === "dash" ? "border-dashed" : ""}`;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block ${shape} ${className}`} />
      <span>{label}</span>
    </div>
  );
}

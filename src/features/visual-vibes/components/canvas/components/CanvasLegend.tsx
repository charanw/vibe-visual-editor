type LegendItemProps = {
  className: string;
  label: string;
  variant?:
    | "line"
    | "dash"
    | "node"
    | "rhombus"
    | "hex"
    | "circle"
    | "document"
    | "stack"
    | "pill"
    | "chevron";
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
            : variant === "document"
              ? "h-3 w-5 border [clip-path:polygon(0_0,78%_0,100%_35%,100%_100%,0_100%)]"
              : variant === "stack"
                ? "relative h-3 w-5 rounded border before:absolute before:-right-1 before:-top-1 before:h-3 before:w-5 before:rounded before:border before:border-inherit before:opacity-60"
                : variant === "pill"
                  ? "h-3 w-5 rounded-full border"
                  : variant === "chevron"
                    ? "h-3 w-5 border [clip-path:polygon(18%_0,100%_0,100%_100%,18%_100%,0_50%)]"
                    : `w-8 border-t-2 ${variant === "dash" ? "border-dashed" : ""}`;

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block ${shape} ${className}`} />
      <span>{label}</span>
    </div>
  );
}

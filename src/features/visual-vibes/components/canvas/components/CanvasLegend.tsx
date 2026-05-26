type LegendItemProps = {
  lineClassName: string;
  label: string;
};

/** Single item in the canvas edge/node legend. */
export function LegendItem({ lineClassName, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-8 border-t-2 ${lineClassName}`} />
      <span>{label}</span>
    </div>
  );
}

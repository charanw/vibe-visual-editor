import type { MouseEvent as ReactMouseEvent } from "react";

/** Badge rendered on conclusion-like workflow nodes. */
export function ConclusionBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="15" fill="#22c55e" opacity="0.95" />
      <path
        d="M-6 0 -1 5 7 -6"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </g>
  );
}

/** Badge rendered on flow entry nodes. */
export function StartingFlagBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r="15"
        fill="var(--panel-bg)"
        stroke="var(--brand-primary)"
        strokeWidth="2"
        opacity="0.96"
      />

      <path
        d="M-6 8V-8"
        stroke="var(--brand-primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M-5 -8 C-1 -10 3 -6 8 -8 V0 C3 2 -1 -2 -5 0 Z"
        fill="var(--panel-muted-bg)"
        stroke="var(--brand-primary)"
        strokeWidth="1"
      />

      <rect
        x="-4.5"
        y="-7.2"
        width="4"
        height="4"
        fill="var(--brand-primary)"
      />
      <rect x="3.5" y="-6.6" width="4" height="4" fill="var(--brand-primary)" />
      <rect
        x="-0.5"
        y="-2.8"
        width="4"
        height="4"
        fill="var(--brand-primary)"
      />
    </g>
  );
}

type NodeActionButtonProps = {
  x: number;
  y: number;
  label: string;
  onClick: (event: ReactMouseEvent<SVGGElement>) => void;
};

/** Hover action rendered beneath a node while canvas editing is enabled. */
export function NodeActionButton({
  x,
  y,
  label,
  onClick,
}: NodeActionButtonProps) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      <rect x="-4" y="-4" width="104" height="38" rx="17" fill="transparent" />

      <rect
        width="96"
        height="30"
        rx="15"
        fill="var(--panel-bg)"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
      />

      <text
        x="48"
        y="19"
        textAnchor="middle"
        fill="var(--brand-primary)"
        fontSize="10"
        fontWeight="700"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

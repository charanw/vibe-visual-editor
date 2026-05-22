"use client";

type VibeCanvasProps = {
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
};

const placeholderSteps = [
  {
    id: "step_one",
    functionName: "firstFunction",
    x: 80,
    y: 120,
  },
  {
    id: "step_two",
    functionName: "secondFunction",
    x: 390,
    y: 120,
  },
];

export function VibeCanvas({ selectedStepId, onSelectStep }: VibeCanvasProps) {
  return (
    <div className="h-full w-full overflow-auto bg-[var(--canvas-bg)] p-8">
      <div className="h-full min-h-[520px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--canvas-inner-bg)] shadow-sm">
        <svg
          width="760"
          height="360"
          viewBox="0 0 760 360"
          className="h-full min-h-[520px] w-full"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)" />
            </marker>
          </defs>

          <line
            x1="280"
            y1="175"
            x2="390"
            y2="175"
            stroke="var(--edge-color)"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />

          {placeholderSteps.map((step) => {
            const isSelected = selectedStepId === step.id;

            return (
              <g
                key={step.id}
                transform={`translate(${step.x}, ${step.y})`}
                onClick={() => onSelectStep(step.id)}
                className="cursor-pointer"
              >
                <rect
                  width="200"
                  height="110"
                  rx="16"
                  fill={
                    isSelected
                      ? "var(--node-selected-bg)"
                      : "var(--node-bg)"
                  }
                  stroke={
                    isSelected
                      ? "var(--node-selected-border)"
                      : "var(--node-border)"
                  }
                  strokeWidth="2"
                />

                <text
                  x="18"
                  y="34"
                  fill="var(--brand-primary)"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="1.4"
                >
                  VIBE STEP
                </text>

                <text
                  x="18"
                  y="60"
                  fill="var(--text-primary)"
                  fontSize="14"
                  fontWeight="700"
                >
                  {step.id}
                </text>

                <text x="18" y="84" fill="var(--text-muted)" fontSize="12">
                  {step.functionName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
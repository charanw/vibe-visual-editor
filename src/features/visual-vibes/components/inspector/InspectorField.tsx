import type { ReactNode } from 'react';

type InspectorFieldProps = {
  label: string;
  helperText?: string;
  children: ReactNode;
};

export function InspectorField({ label, helperText, children }: InspectorFieldProps) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-[var(--text-primary)]">
        {label}
      </div>

      {helperText && (
        <div className="mb-2 text-xs leading-5 text-[var(--text-muted)]">
          {helperText}
        </div>
      )}

      {children}
    </label>
  );
}


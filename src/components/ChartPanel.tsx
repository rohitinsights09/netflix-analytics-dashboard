import type { ReactNode } from 'react';

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartPanel({
  title,
  subtitle,
  rightSlot,
  children,
  className = '',
}: ChartPanelProps) {
  return (
    <section
      className={`bg-[#141414] border border-white/10 rounded-lg p-5 flex flex-col ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

interface DarkTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
  }>;
  label?: string | number;
  unit?: string;
}

export function DarkTooltip({ active, payload, label, unit = '' }: DarkTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#0e0e0e] border border-white/15 rounded-md px-3 py-2 shadow-xl text-xs">
      {label !== undefined && label !== '' && (
        <div className="font-semibold text-white mb-1.5 border-b border-white/10 pb-1">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? entry.name}-${i}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span
                className="w-2 h-2 rounded-xs inline-block shrink-0"
                style={{ backgroundColor: entry.color || '#E50914' }}
              />
              {entry.name}
            </span>
            <span className="font-mono font-medium text-white tabular-nums">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {unit ? ` ${unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  accent?: boolean;
}

export function KpiCard({ label, value, sublabel, icon: Icon, accent = false }: KpiCardProps) {
  return (
    <div className="bg-[#141414] border border-white/10 rounded-lg p-4 transition-colors duration-150 hover:border-white/20">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        <Icon
          className={`w-4 h-4 shrink-0 ${accent ? 'text-[#E50914]' : 'text-neutral-500'}`}
        />
      </div>
      <div className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </div>
      {sublabel && (
        <p className="mt-1.5 text-xs text-neutral-400 truncate tabular-nums">{sublabel}</p>
      )}
    </div>
  );
}

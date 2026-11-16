import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ContentTypeFilter, FilterState } from '../types/netflix';

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  options: {
    countries: Array<{ name: string; count: number }>;
    genres: Array<{ name: string; count: number }>;
    ratings: Array<{ name: string; count: number }>;
    minYear: number;
    maxYear: number;
  };
  filteredCount: number;
  totalCount: number;
  hideTypeToggle?: boolean;
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  options,
  filteredCount,
  totalCount,
  hideTypeToggle = false,
}: FilterBarProps) {
  const isModified =
    (!hideTypeToggle && filters.type !== 'All') ||
    filters.country !== 'All' ||
    filters.genre !== 'All' ||
    filters.rating !== 'All' ||
    filters.yearMin !== options.minYear ||
    filters.yearMax !== options.maxYear ||
    filters.search.trim() !== '';

  const yearPresets = [
    { label: 'All Years', min: options.minYear, max: options.maxYear },
    { label: '2015–2021', min: 2015, max: options.maxYear },
    { label: '2018–2021', min: 2018, max: options.maxYear },
    { label: '2000–2014', min: 2000, max: 2014 },
    { label: 'Pre-2000', min: options.minYear, max: 1999 },
  ];

  const activePreset = yearPresets.find(
    (p) => p.min === filters.yearMin && p.max === filters.yearMax
  )?.label;

  return (
    <div className="bg-[#141414] border border-white/10 rounded-lg px-4 py-3 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Filters</span>
          </div>

          {!hideTypeToggle && (
            <div className="inline-flex bg-[#0c0c0c] border border-white/10 rounded-md p-0.5">
              {(['All', 'Movie', 'TV Show'] as ContentTypeFilter[]).map((t) => {
                const active = filters.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ ...filters, type: t })}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#E50914] text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {t === 'All' ? 'All Types' : t === 'Movie' ? 'Movies' : 'TV Shows'}
                  </button>
                );
              })}
            </div>
          )}

          <select
            aria-label="Filter by Country"
            value={filters.country}
            onChange={(e) => onChange({ ...filters, country: e.target.value })}
            className="bg-[#0c0c0c] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#E50914] max-w-[175px]"
          >
            <option value="All">All Countries ({options.countries.length})</option>
            {options.countries.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Genre"
            value={filters.genre}
            onChange={(e) => onChange({ ...filters, genre: e.target.value })}
            className="bg-[#0c0c0c] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#E50914] max-w-[190px]"
          >
            <option value="All">All Genres ({options.genres.length})</option>
            {options.genres.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.count})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Rating"
            value={filters.rating}
            onChange={(e) => onChange({ ...filters, rating: e.target.value })}
            className="bg-[#0c0c0c] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#E50914]"
          >
            <option value="All">All Ratings</option>
            {options.ratings.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({r.count})
              </option>
            ))}
          </select>

          <select
            aria-label="Release Year Window"
            value={activePreset ?? 'custom'}
            onChange={(e) => {
              const preset = yearPresets.find((p) => p.label === e.target.value);
              if (preset) {
                onChange({ ...filters, yearMin: preset.min, yearMax: preset.max });
              }
            }}
            className="bg-[#0c0c0c] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#E50914]"
          >
            {yearPresets.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
            {!activePreset && (
              <option value="custom">
                {filters.yearMin}–{filters.yearMax}
              </option>
            )}
          </select>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-neutral-400 font-mono tabular-nums whitespace-nowrap">
            <strong className="text-white">{filteredCount.toLocaleString()}</strong> /{' '}
            {totalCount.toLocaleString()} titles
          </span>
          {isModified && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

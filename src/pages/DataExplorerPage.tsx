import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { DataQualityReport, FilterState, NetflixRecord } from '../types/netflix';
import { downloadStaticArtifact, exportExecutiveExcelWorkbook, exportFilteredRecordsCsv } from '../utils/exports';

interface DataExplorerPageProps {
  records: NetflixRecord[];
  allRecords: NetflixRecord[];
  filters: FilterState;
  onChangeFilters: (next: FilterState) => void;
  onResetFilters: () => void;
  options: {
    countries: Array<{ name: string; count: number }>;
    genres: Array<{ name: string; count: number }>;
    ratings: Array<{ name: string; count: number }>;
    minYear: number;
    maxYear: number;
  };
  qualityReport: DataQualityReport | null;
}

const PAGE_SIZE = 25;

export function DataExplorerPage({
  records,
  allRecords,
  filters,
  onChangeFilters,
  onResetFilters,
  options,
  qualityReport,
}: DataExplorerPageProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'quality'>('table');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'release_year' | 'title' | 'date_added'>('release_year');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRecord, setSelectedRecord] = useState<NetflixRecord | null>(null);

  // Extract discrete release years present in dataset for direct Release Year filter
  const releaseYears = useMemo(() => {
    const years = new Set<number>();
    for (const r of allRecords) years.add(r.release_year);
    return [...years].sort((a, b) => b - a);
  }, [allRecords]);

  const sortedRecords = useMemo(() => {
    const copy = [...records];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'release_year') cmp = a.release_year - b.release_year;
      else if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else cmp = (a.date_added || '').localeCompare(b.date_added || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [records, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (field: 'release_year' | 'title' | 'date_added') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'title' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const singleSelectedYear =
    filters.yearMin === filters.yearMax ? String(filters.yearMin) : 'All';

  return (
    <div className="space-y-5">
      {/* Explorer Action Header & Tabs */}
      <div className="bg-[#141414] border border-white/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex bg-[#0b0b0b] border border-white/10 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'table'
                ? 'bg-[#E50914] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Interactive Catalog Table ({records.length.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quality')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'quality'
                ? 'bg-[#E50914] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Data Quality Report
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              exportFilteredRecordsCsv(
                sortedRecords,
                `netflix_insights_${sortedRecords.length}_titles.csv`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#E50914]" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportExecutiveExcelWorkbook(sortedRecords, allRecords, qualityReport)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E50914] hover:bg-[#f40612] text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {activeTab === 'table' ? (
        <>
          {/* Dedicated Search & Exact Release Year Filter Bar */}
          <div className="bg-[#141414] border border-white/10 rounded-lg p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  onChangeFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
                placeholder="Search title, director, cast, genre, or description..."
                className="w-full bg-[#0b0b0b] border border-white/10 rounded-md pl-9 pr-8 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#E50914]"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeFilters({ ...filters, search: '' });
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="md:col-span-2">
              <select
                aria-label="Exact Release Year"
                value={singleSelectedYear}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'All') {
                    onChangeFilters({
                      ...filters,
                      yearMin: options.minYear,
                      yearMax: options.maxYear,
                    });
                  } else {
                    const yr = Number(val);
                    onChangeFilters({ ...filters, yearMin: yr, yearMax: yr });
                  }
                  setPage(1);
                }}
                className="w-full bg-[#0b0b0b] border border-white/10 rounded-md px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#E50914]"
              >
                <option value="All">Exact Release Year: All</option>
                {releaseYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-3 text-xs text-neutral-400">
              <span className="font-mono tabular-nums">
                Showing {sortedRecords.length.toLocaleString()} matching titles
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetFilters();
                  setPage(1);
                }}
                className="text-neutral-300 hover:text-white underline underline-offset-2 cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[11px]">
              <span className="text-neutral-500 mr-1">Quick Slices:</span>
              {[
                {
                  label: 'Korean Series',
                  patch: { type: 'TV Show' as const, country: 'South Korea', genre: 'All', rating: 'All', yearMin: options.minYear, yearMax: options.maxYear, search: '' },
                },
                {
                  label: 'Indian Cinema',
                  patch: { type: 'Movie' as const, country: 'India', genre: 'All', rating: 'All', yearMin: options.minYear, yearMax: options.maxYear, search: '' },
                },
                {
                  label: 'Kids & Family',
                  patch: { type: 'All' as const, country: 'All', genre: 'Children & Family Movies', rating: 'All', yearMin: options.minYear, yearMax: options.maxYear, search: '' },
                },
                {
                  label: 'Stand-Up Comedy',
                  patch: { type: 'All' as const, country: 'All', genre: 'Stand-Up Comedy', rating: 'All', yearMin: options.minYear, yearMax: options.maxYear, search: '' },
                },
                {
                  label: '2020–2021 Releases',
                  patch: { type: 'All' as const, country: 'All', genre: 'All', rating: 'All', yearMin: 2020, yearMax: options.maxYear, search: '' },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onChangeFilters(preset.patch);
                    setPage(1);
                  }}
                  className="px-2.5 py-1 rounded bg-[#0b0b0b] hover:bg-white/10 text-neutral-300 border border-white/10 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Data Table */}
          <div className="bg-[#141414] border border-white/10 rounded-lg overflow-hidden">
            {pageRows.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-white">No matching titles found.</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Try widening your search keyword or resetting filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0e0e0e] border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-medium">ID</th>
                      <th
                        onClick={() => toggleSort('title')}
                        className="py-3 px-4 font-medium cursor-pointer hover:text-white"
                      >
                        Title {sortField === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Country</th>
                      <th
                        onClick={() => toggleSort('release_year')}
                        className="py-3 px-4 font-medium text-right cursor-pointer hover:text-white"
                      >
                        Year {sortField === 'release_year' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th className="py-3 px-4 font-medium">Rating</th>
                      <th className="py-3 px-4 font-medium text-right">Duration</th>
                      <th className="py-3 px-4 font-medium">Genres</th>
                      <th
                        onClick={() => toggleSort('date_added')}
                        className="py-3 px-4 font-medium text-right cursor-pointer hover:text-white"
                      >
                        Date Added {sortField === 'date_added' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pageRows.map((row) => (
                      <tr
                        key={row.show_id}
                        onClick={() => setSelectedRecord(row)}
                        className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono text-neutral-500 whitespace-nowrap">
                          {row.show_id}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-white max-w-[240px] truncate">
                          {row.title}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-medium ${
                              row.type === 'Movie' ? 'text-[#E50914]' : 'text-neutral-300'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-neutral-300 max-w-[160px] truncate">
                          {row.country}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-neutral-300 text-right tabular-nums">
                          {row.release_year}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-neutral-300 whitespace-nowrap">
                          {row.rating}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-neutral-300 text-right whitespace-nowrap tabular-nums">
                          {row.duration}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-400 max-w-[220px] truncate">
                          {row.listed_in}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-neutral-400 text-right whitespace-nowrap tabular-nums">
                          {row.date_added || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-[#0e0e0e] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
              <div className="font-mono tabular-nums">
                Page {safePage} of {totalPages.toLocaleString()} · Rows{' '}
                {sortedRecords.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, sortedRecords.length)} of{' '}
                {sortedRecords.length.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Data Quality Report Tab */
        qualityReport && (
          <div className="space-y-5">
            <div className="bg-[#141414] border border-white/10 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Dataset Audit &amp; Cleaning Verification Report
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Raw CSV preserved untouched · {qualityReport.raw_row_count.toLocaleString()} raw rows
                    cleaned to {qualityReport.cleaned_row_count.toLocaleString()} records across{' '}
                    {qualityReport.column_count_cleaned} standardized fields.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadStaticArtifact('/data/netflix_cleaned.csv', 'netflix_cleaned.csv')
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#E50914]" />
                  Cleaned CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadStaticArtifact('/data/data_quality_report.md', 'data_quality_report.md')
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#E50914]" />
                  Quality Report (.md)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Missing Value Audit */}
              <div className="bg-[#141414] border border-white/10 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Raw Missing Value Audit ({qualityReport.raw_row_count.toLocaleString()} Rows)
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400 text-[11px] uppercase">
                      <th className="py-2 pr-3 font-medium">Column</th>
                      <th className="py-2 px-3 font-medium text-right">Raw Missing</th>
                      <th className="py-2 pl-3 font-medium text-right">% of Raw</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(qualityReport.raw_missing_values).map(([col, cnt]) => (
                      <tr key={col}>
                        <td className="py-2 pr-3 font-mono text-neutral-200">{col}</td>
                        <td className="py-2 px-3 font-mono text-right text-white tabular-nums">
                          {cnt.toLocaleString()}
                        </td>
                        <td className="py-2 pl-3 font-mono text-right text-neutral-400 tabular-nums">
                          {((cnt / qualityReport.raw_row_count) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Duplicates & Anomalies Repaired */}
              <div className="space-y-5">
                <div className="bg-[#141414] border border-white/10 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Shifted Duration-in-Rating Anomalies Repaired
                  </h4>
                  <div className="space-y-2 text-xs">
                    {qualityReport.anomalies_repaired.shifted_duration_in_rating.map((a) => (
                      <div
                        key={a.show_id}
                        className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded px-3 py-2"
                      >
                        <div>
                          <span className="font-mono text-[#E50914] mr-2">{a.show_id}</span>
                          <span className="text-white font-medium">{a.title}</span>
                        </div>
                        <span className="font-mono text-neutral-400">
                          rating &quot;{a.raw_rating}&quot; → duration
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#141414] border border-white/10 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Duplicate Titles Removed ({qualityReport.duplicates_removed_count})
                  </h4>
                  <div className="space-y-2 text-xs">
                    {qualityReport.duplicates_removed.map((d) => (
                      <div
                        key={d.removed_show_id}
                        className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded px-3 py-2"
                      >
                        <div>
                          <span className="text-white font-medium">{d.title}</span>
                          <span className="text-neutral-500 ml-2">
                            ({d.type}, {d.release_year})
                          </span>
                        </div>
                        <span className="font-mono text-neutral-400">
                          Removed {d.removed_show_id} · Kept {d.retained_show_id}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-white mb-3">
                Cleaning Pipeline Execution Steps
              </h4>
              <ul className="space-y-2 text-xs text-neutral-300">
                {qualityReport.cleaning_pipeline_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#E50914] shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      )}

      {/* Title Detail Drawer / Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-[#141414] border border-white/15 rounded-lg max-w-xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-mono text-[#E50914]">
                  {selectedRecord.show_id} · {selectedRecord.type} · {selectedRecord.release_year}
                </div>
                <h3 className="text-lg font-semibold text-white mt-1">
                  {selectedRecord.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close title details"
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {selectedRecord.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-white/10">
              <div>
                <span className="text-neutral-500 block">Rating / Tier</span>
                <span className="text-white font-medium">
                  {selectedRecord.rating} ({selectedRecord.rating_tier})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Duration</span>
                <span className="text-white font-mono">{selectedRecord.duration}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Country</span>
                <span className="text-white">{selectedRecord.country}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Date Added</span>
                <span className="text-white font-mono">
                  {selectedRecord.date_added || 'Not Recorded'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500 block">Director</span>
                <span className="text-neutral-200">{selectedRecord.director}</span>
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500 block">Cast</span>
                <span className="text-neutral-200">{selectedRecord.cast}</span>
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500 block">Genres</span>
                <span className="text-neutral-200">{selectedRecord.listed_in}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

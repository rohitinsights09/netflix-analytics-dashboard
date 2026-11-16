import { useEffect, useMemo, useState } from 'react';
import { Code2, FileSpreadsheet, Menu, Printer } from 'lucide-react';
import { FilterBar } from './components/FilterBar';
import { Sidebar } from './components/Sidebar';
import { AboutProjectPage } from './pages/AboutProjectPage';
import { BusinessInsightsPage } from './pages/BusinessInsightsPage';
import { ContentAnalyticsPage } from './pages/ContentAnalyticsPage';
import { CountriesGenresPage } from './pages/CountriesGenresPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { MoviesPage } from './pages/MoviesPage';
import { OverviewPage } from './pages/OverviewPage';
import { TvShowsPage } from './pages/TvShowsPage';
import type { DataQualityReport, FilterState, NetflixRecord, PageId } from './types/netflix';
import { applyFilters, extractFilterOptions } from './utils/analytics';
import {
  downloadStaticArtifact,
  exportExecutiveExcelWorkbook,
} from './utils/exports';

const PAGE_META: Record<PageId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'Executive KPI summary, catalog composition, and top trends',
  },
  content: {
    title: 'Content Analytics',
    subtitle: 'Catalog expansion velocity, seasonality, audience tiers & format comparisons',
  },
  movies: {
    title: 'Movies',
    subtitle: 'Feature runtime distributions, averages, medians, genres & directors',
  },
  tvshows: {
    title: 'TV Shows',
    subtitle: 'Season depth, renewal concentration, release trajectory & series genres',
  },
  'countries-genres': {
    title: 'Countries & Genres',
    subtitle: 'Geographic production hubs, category penetration & cross-market matrix',
  },
  insights: {
    title: 'Business Insights',
    subtitle: 'Strategic findings backed by live metrics, charts & verified SQL',
  },
  explorer: {
    title: 'Data Explorer',
    subtitle: 'Searchable catalog grid, data quality audit & CSV / Excel downloads',
  },
  about: {
    title: 'About Project',
    subtitle: 'Portfolio documentation, methodology, deliverables & local setup',
  },
};

export default function App() {
  const [records, setRecords] = useState<NetflixRecord[]>([]);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activePage, setActivePage] = useState<PageId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const options = useMemo(() => extractFilterOptions(records), [records]);

  const [filters, setFilters] = useState<FilterState>({
    type: 'All',
    country: 'All',
    genre: 'All',
    rating: 'All',
    yearMin: 1925,
    yearMax: 2021,
    search: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function loadDataset() {
      try {
        const [dataRes, qualityRes] = await Promise.all([
          fetch('/data/netflix_cleaned.json'),
          fetch('/data/data_quality_report.json'),
        ]);
        if (!dataRes.ok) throw new Error('Failed to load cleaned Netflix catalog dataset.');
        const dataJson: NetflixRecord[] = await dataRes.json();
        const qualityJson: DataQualityReport | null = qualityRes.ok
          ? await qualityRes.json()
          : null;

        if (!cancelled) {
          const opts = extractFilterOptions(dataJson);
          setRecords(dataJson);
          setQualityReport(qualityJson);
          setFilters((prev) => ({
            ...prev,
            yearMin: opts.minYear,
            yearMax: opts.maxYear,
          }));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load dataset.');
          setLoading(false);
        }
      }
    }
    loadDataset();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetFilters = () => {
    setFilters({
      type: 'All',
      country: 'All',
      genre: 'All',
      rating: 'All',
      yearMin: options.minYear,
      yearMax: options.maxYear,
      search: '',
    });
  };

  const filteredRecords = useMemo(
    () => applyFilters(records, filters),
    [records, filters]
  );

  const handleDownloadZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    try {
      await downloadStaticArtifact('/downloads/netflix-insights-rohit-shinde.zip', 'netflix-insights-rohit-shinde.zip');
    } finally {
      setDownloadingZip(false);
    }
  };

  const currentMeta = PAGE_META[activePage];

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100 flex">
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onDownloadZip={handleDownloadZip}
        downloadingZip={downloadingZip}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#080808]/95 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-1.5 rounded-md text-neutral-300 hover:text-white bg-white/5 border border-white/10 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="text-neutral-300 font-medium">Netflix Insights</span>
                  <span>/</span>
                  <span className="text-white font-medium truncate">{currentMeta.title}</span>
                  <span className="hidden sm:inline text-neutral-600">·</span>
                  <span className="hidden sm:inline font-mono text-neutral-400 tabular-nums">
                    {records.length > 0
                      ? `${records.length.toLocaleString()} Cleaned Titles`
                      : 'Loading catalog...'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">
                  {currentMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={loading}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-neutral-400" />
                Print Report
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadStaticArtifact(
                    '/data/netflix_insights_queries.sql',
                    'netflix_insights_queries.sql'
                  )
                }
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Code2 className="w-3.5 h-3.5 text-[#E50914]" />
                <span className="hidden sm:inline">Download SQL</span>
                <span className="sm:hidden">SQL</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportExecutiveExcelWorkbook(filteredRecords, records, qualityReport)
                }
                disabled={loading || records.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#E50914] hover:bg-[#f40612] text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel Report</span>
                <span className="sm:hidden">Excel</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-12 bg-[#141414] border border-white/10 rounded-lg" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-[#141414] border border-white/10 rounded-lg"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="h-80 bg-[#141414] border border-white/10 rounded-lg" />
                <div className="h-80 bg-[#141414] border border-white/10 rounded-lg" />
              </div>
            </div>
          ) : loadError ? (
            <div className="bg-[#141414] border border-[#E50914]/40 rounded-lg p-6 text-sm text-neutral-200">
              {loadError}
            </div>
          ) : (
            <>
              {activePage !== 'about' && (
                <div className="no-print">
                  <FilterBar
                    filters={filters}
                    onChange={setFilters}
                    onReset={resetFilters}
                    options={options}
                    filteredCount={filteredRecords.length}
                    totalCount={records.length}
                    hideTypeToggle={activePage === 'movies' || activePage === 'tvshows'}
                  />
                </div>
              )}

              {activePage === 'overview' && (
                <OverviewPage
                  records={filteredRecords}
                  allRecordsCount={records.length}
                  filters={filters}
                  onChangeFilters={setFilters}
                  onResetFilters={resetFilters}
                />
              )}
              {activePage === 'content' && (
                <ContentAnalyticsPage records={filteredRecords} onResetFilters={resetFilters} />
              )}
              {activePage === 'movies' && (
                <MoviesPage records={filteredRecords} onResetFilters={resetFilters} />
              )}
              {activePage === 'tvshows' && (
                <TvShowsPage records={filteredRecords} onResetFilters={resetFilters} />
              )}
              {activePage === 'countries-genres' && (
                <CountriesGenresPage records={filteredRecords} onResetFilters={resetFilters} />
              )}
              {activePage === 'insights' && (
                <BusinessInsightsPage records={filteredRecords} onResetFilters={resetFilters} />
              )}
              {activePage === 'explorer' && (
                <DataExplorerPage
                  records={filteredRecords}
                  allRecords={records}
                  filters={filters}
                  onChangeFilters={setFilters}
                  onResetFilters={resetFilters}
                  options={options}
                  qualityReport={qualityReport}
                />
              )}
              {activePage === 'about' && (
                <AboutProjectPage
                  allRecords={records}
                  qualityReport={qualityReport}
                  onDownloadZip={handleDownloadZip}
                  downloadingZip={downloadingZip}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <span>NETFLIX INSIGHTS · Content Analytics &amp; Business Intelligence</span>
          <span className="font-medium text-neutral-200">
            Designed &amp; Developed by Rohit Shinde
          </span>
        </footer>
      </div>
    </div>
  );
}

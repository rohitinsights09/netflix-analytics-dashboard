import { CalendarRange, Film, Globe2, Layers, Tags, Tv } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartPanel, DarkTooltip } from '../components/ChartPanel';
import { KpiCard } from '../components/KpiCard';
import type { FilterState, NetflixRecord } from '../types/netflix';
import {
  computeAddedTrends,
  computeOverviewMetrics,
  computeRatingsDistribution,
  computeReleaseTrends,
  computeTopCountries,
  computeTopGenres,
} from '../utils/analytics';

interface OverviewPageProps {
  records: NetflixRecord[];
  allRecordsCount: number;
  filters: FilterState;
  onChangeFilters: (next: FilterState) => void;
  onResetFilters: () => void;
}

export function OverviewPage({
  records,
  allRecordsCount,
  filters,
  onChangeFilters,
  onResetFilters,
}: OverviewPageProps) {
  if (records.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-lg p-12 text-center">
        <p className="text-base font-medium text-white">No titles match the selected filters.</p>
        <p className="text-xs text-neutral-400 mt-1">
          Adjust your filter selections or reset to inspect all cleaned catalog records.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 px-4 py-2 bg-[#E50914] hover:bg-[#f40612] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  const metrics = computeOverviewMetrics(records);
  const addedTrends = computeAddedTrends(records);
  const releaseTrends = computeReleaseTrends(records, 1990);
  const topGenres = computeTopGenres(records, 10);
  const topCountries = computeTopCountries(records, 10);
  const ratings = computeRatingsDistribution(records).byRating.slice(0, 12);

  const typeSplitData = [
    { name: 'Movies', filterVal: 'Movie' as const, value: metrics.totalMovies, color: '#E50914' },
    { name: 'TV Shows', filterVal: 'TV Show' as const, value: metrics.totalTvShows, color: '#737373' },
  ];

  const selectionSharePct =
    allRecordsCount > 0 ? ((metrics.totalTitles / allRecordsCount) * 100).toFixed(1) : '100.0';

  const toggleTypeFilter = (val: 'Movie' | 'TV Show') => {
    onChangeFilters({
      ...filters,
      type: filters.type === val ? 'All' : val,
    });
  };

  const toggleGenreFilter = (genre: string) => {
    onChangeFilters({
      ...filters,
      genre: filters.genre === genre ? 'All' : genre,
    });
  };

  const toggleCountryFilter = (country: string) => {
    onChangeFilters({
      ...filters,
      country: filters.country === country ? 'All' : country,
    });
  };

  const toggleRatingFilter = (rating: string) => {
    onChangeFilters({
      ...filters,
      rating: filters.rating === rating ? 'All' : rating,
    });
  };

  return (
    <div className="space-y-6">
      {/* 6 Dynamic KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Titles"
          value={metrics.totalTitles.toLocaleString()}
          sublabel={
            metrics.totalTitles === allRecordsCount
              ? '100% of cleaned catalog'
              : `${selectionSharePct}% of ${allRecordsCount.toLocaleString()} baseline`
          }
          icon={Layers}
          accent
        />
        <KpiCard
          label="Total Movies"
          value={metrics.totalMovies.toLocaleString()}
          sublabel={`${metrics.movieSharePct}% of active selection`}
          icon={Film}
        />
        <KpiCard
          label="Total TV Shows"
          value={metrics.totalTvShows.toLocaleString()}
          sublabel={`${metrics.tvShowSharePct}% of active selection`}
          icon={Tv}
        />
        <KpiCard
          label="Total Countries"
          value={metrics.totalCountries.toLocaleString()}
          sublabel="Known production regions"
          icon={Globe2}
        />
        <KpiCard
          label="Total Genres"
          value={metrics.totalGenres.toLocaleString()}
          sublabel="Distinct category tags"
          icon={Tags}
        />
        <KpiCard
          label="Years Covered"
          value={`${metrics.minYear}–${metrics.maxYear}`}
          sublabel={`${metrics.yearSpan} release years spanned`}
          icon={CalendarRange}
        />
      </div>

      {/* Row 1: Movies vs TV Shows + Content Added Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ChartPanel
          title="Movies vs TV Shows"
          subtitle="Click a slice to cross-filter catalog format"
          className="lg:col-span-4"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeSplitData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={3}
                  stroke="#080808"
                  strokeWidth={2}
                  className="cursor-pointer"
                  onClick={(_entry, idx) => {
                    const item = typeSplitData[idx];
                    if (item) toggleTypeFilter(item.filterVal);
                  }}
                >
                  {typeSplitData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip unit="titles" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => toggleTypeFilter('Movie')}
              className={`text-left rounded p-1.5 transition-colors cursor-pointer ${
                filters.type === 'Movie' ? 'bg-[#E50914]/15' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#E50914]" />
                Movies
              </div>
              <div className="font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                {metrics.totalMovies.toLocaleString()}{' '}
                <span className="text-xs text-neutral-400">({metrics.movieSharePct}%)</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleTypeFilter('TV Show')}
              className={`text-left rounded p-1.5 transition-colors cursor-pointer ${
                filters.type === 'TV Show' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#737373]" />
                TV Shows
              </div>
              <div className="font-mono text-base font-semibold text-white mt-0.5 tabular-nums">
                {metrics.totalTvShows.toLocaleString()}{' '}
                <span className="text-xs text-neutral-400">({metrics.tvShowSharePct}%)</span>
              </div>
            </button>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Content Added Over Time"
          subtitle="Annual platform additions parsed from date_added (2008–2021)"
          className="lg:col-span-8"
        >
          <div className="h-76">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={addedTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovMoviesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E50914" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#E50914" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ovTvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A3A3A3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A3A3A3" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#a3a3a3' }} />
                <Area
                  type="monotone"
                  dataKey="movies"
                  name="Movies Added"
                  stroke="#E50914"
                  strokeWidth={2}
                  fill="url(#ovMoviesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="tvShows"
                  name="TV Shows Added"
                  stroke="#D4D4D4"
                  strokeWidth={2}
                  fill="url(#ovTvGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Row 2: Top 10 Genres + Top 10 Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Top 10 Genres"
          subtitle="Click any genre bar to cross-filter the entire dashboard"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topGenres}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Bar
                  dataKey="total"
                  name="Titles"
                  fill="#E50914"
                  radius={[0, 3, 3, 0]}
                  className="cursor-pointer"
                  onClick={(_data, idx) => {
                    const item = topGenres[idx];
                    if (item) toggleGenreFilter(item.name);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Top 10 Countries"
          subtitle="Click any country bar to isolate its titles across all charts"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCountries}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="movies"
                  name="Movies"
                  stackId="a"
                  fill="#E50914"
                  className="cursor-pointer"
                  onClick={(_data, idx) => {
                    const item = topCountries[idx];
                    if (item) toggleCountryFilter(item.name);
                  }}
                />
                <Bar
                  dataKey="tvShows"
                  name="TV Shows"
                  stackId="a"
                  fill="#737373"
                  radius={[0, 3, 3, 0]}
                  className="cursor-pointer"
                  onClick={(_data, idx) => {
                    const item = topCountries[idx];
                    if (item) toggleCountryFilter(item.name);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Row 3: Content Released Over Time + Ratings Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Content Released Over Time (1990–2021)"
          subtitle="Original theatrical / broadcast release year distribution"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={releaseTrends} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" stackId="r" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="r" fill="#525252" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Ratings Distribution"
          subtitle="Click any rating column to cross-filter by maturity classification"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratings} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="rating" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="movies"
                  name="Movies"
                  stackId="rat"
                  fill="#E50914"
                  className="cursor-pointer"
                  onClick={(_data, idx) => {
                    const item = ratings[idx];
                    if (item) toggleRatingFilter(item.rating);
                  }}
                />
                <Bar
                  dataKey="tvShows"
                  name="TV Shows"
                  stackId="rat"
                  fill="#A3A3A3"
                  radius={[2, 2, 0, 0]}
                  className="cursor-pointer"
                  onClick={(_data, idx) => {
                    const item = ratings[idx];
                    if (item) toggleRatingFilter(item.rating);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}

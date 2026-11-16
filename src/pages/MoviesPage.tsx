import { Clock, Film, Gauge, Maximize2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartPanel, DarkTooltip } from '../components/ChartPanel';
import { KpiCard } from '../components/KpiCard';
import type { NetflixRecord } from '../types/netflix';
import { computeMovieAnalytics } from '../utils/analytics';

interface MoviesPageProps {
  records: NetflixRecord[];
  onResetFilters: () => void;
}

export function MoviesPage({ records, onResetFilters }: MoviesPageProps) {
  const movieData = computeMovieAnalytics(records);

  if (movieData.totalMovies === 0) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-lg p-12 text-center">
        <p className="text-base font-medium text-white">No Movie records match the current filters.</p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 px-4 py-2 bg-[#E50914] hover:bg-[#f40612] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Movies"
          value={movieData.totalMovies.toLocaleString()}
          sublabel={`${movieData.measuredMovies.toLocaleString()} with runtime metadata`}
          icon={Film}
          accent
        />
        <KpiCard
          label="Average Duration"
          value={`${movieData.avgMinutes} min`}
          sublabel="Arithmetic mean runtime"
          icon={Clock}
        />
        <KpiCard
          label="Median Duration"
          value={`${movieData.medianMinutes} min`}
          sublabel="50th percentile feature length"
          icon={Gauge}
        />
        <KpiCard
          label="Runtime Range"
          value={`${movieData.minMinutes}–${movieData.maxMinutes}m`}
          sublabel="Shortest short to longest epic"
          icon={Maximize2}
        />
      </div>

      {/* Duration Distribution & Fine Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ChartPanel
          title="Movie Duration Brackets"
          subtitle="Distribution across standard runtime segments"
          className="lg:col-span-5"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movieData.durationDistribution}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="bucket" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="movies" />} />
                <Bar dataKey="count" name="Movies" fill="#E50914" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Runtime Histogram (15-Minute Bins)"
          subtitle="Granular distribution highlighting the 90–119 minute concentration"
          className="lg:col-span-7"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movieData.histogramBins}
                margin={{ top: 8, right: 12, left: 0, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="range"
                  stroke="#a3a3a3"
                  fontSize={10}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="movies" />} />
                <Bar dataKey="count" name="Movies" fill="#dc2626" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Movie Releases Over Time & Average Runtime Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Movie Releases Over Time (1990–2021)"
          subtitle="Annual film volume by theatrical release year"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={movieData.releaseTrends}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="movRelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E50914" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#E50914" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="movies" />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Movies Released"
                  stroke="#E50914"
                  strokeWidth={2}
                  fill="url(#movRelGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Average Movie Runtime Trend (2005–2021)"
          subtitle="Mean runtime in minutes across recent release cohorts"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={movieData.durationByReleaseYear}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  unit="m"
                />
                <Tooltip content={<DarkTooltip unit="min" />} />
                <Line
                  type="monotone"
                  dataKey="avgDuration"
                  name="Avg Duration"
                  stroke="#E50914"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#E50914' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Popular Genres, Ratings & Top Directors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ChartPanel
          title="Popular Movie Genres"
          subtitle="Top 10 film categories"
          className="lg:col-span-5"
        >
          <div className="h-76">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movieData.topGenres}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={145}
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip unit="movies" />} />
                <Bar dataKey="total" name="Movies" fill="#E50914" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Movie Ratings Breakdown"
          subtitle="Classification share across films"
          className="lg:col-span-4"
        >
          <div className="h-76">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movieData.ratings.slice(0, 10)}
                margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="rating" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="movies" />} />
                <Bar dataKey="total" name="Movies" fill="#A3A3A3" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Most Prolific Film Directors"
          subtitle="Top credited directors (excl. Not Specified)"
          className="lg:col-span-3"
        >
          <div className="divide-y divide-white/10">
            {movieData.topDirectors.map((d, idx) => (
              <div
                key={d.director}
                className="py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-neutral-500 w-4 shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="text-neutral-200 truncate">{d.director}</span>
                </div>
                <span className="font-mono font-semibold text-[#E50914] tabular-nums shrink-0">
                  {d.titles}
                </span>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}

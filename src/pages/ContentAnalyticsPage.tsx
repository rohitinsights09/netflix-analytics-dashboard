import { Clock, Flame, Layers, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import {
  computeAddedTrends,
  computeDecadeBreakdown,
  computeMonthlySeasonality,
  computeRatingsDistribution,
  computeReleaseTrends,
  computeTopCast,
  computeTopCountries,
  computeTopGenres,
  computeYearMonthHeatmap,
} from '../utils/analytics';

interface ContentAnalyticsPageProps {
  records: NetflixRecord[];
  onResetFilters: () => void;
}

export function ContentAnalyticsPage({ records, onResetFilters }: ContentAnalyticsPageProps) {
  if (records.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-lg p-12 text-center">
        <p className="text-base font-medium text-white">No records match your active filters.</p>
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

  const addedTrends = computeAddedTrends(records);
  let cumulative = 0;
  const cumulativeGrowth = addedTrends.map((d) => {
    cumulative += d.total;
    return {
      year: d.year,
      annual: d.total,
      cumulative,
      tvSharePct: d.total > 0 ? Number(((d.tvShows / d.total) * 100).toFixed(1)) : 0,
    };
  });

  const seasonality = computeMonthlySeasonality(records);
  const topGenres = computeTopGenres(records, 14);
  const topCountries = computeTopCountries(records, 12);
  const ratings = computeRatingsDistribution(records);
  const releaseTrends = computeReleaseTrends(records, 1980);
  const heatmap = computeYearMonthHeatmap(records, 2015);
  const decades = computeDecadeBreakdown(records);
  const topCast = computeTopCast(records, 12);

  // Release-to-platform lag comparison
  let mLagSum = 0;
  let mLagN = 0;
  let tLagSum = 0;
  let tLagN = 0;
  let sameYearTotal = 0;
  let datedTotal = 0;

  for (const r of records) {
    if (!r.year_added || r.year_added < r.release_year) continue;
    const lag = r.year_added - r.release_year;
    datedTotal += 1;
    if (lag === 0) sameYearTotal += 1;
    if (r.type === 'Movie') {
      mLagSum += lag;
      mLagN += 1;
    } else {
      tLagSum += lag;
      tLagN += 1;
    }
  }

  const peakYear = addedTrends.reduce(
    (best, cur) => (cur.total > best.total ? cur : best),
    { year: 0, total: 0, movies: 0, tvShows: 0 }
  );

  const avgMovieLag = mLagN > 0 ? (mLagSum / mLagN).toFixed(2) : '0.00';
  const avgTvLag = tLagN > 0 ? (tLagSum / tLagN).toFixed(2) : '0.00';
  const sameYearPct = datedTotal > 0 ? ((sameYearTotal / datedTotal) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Peak Addition Year"
          value={peakYear.year || 'N/A'}
          sublabel={`${peakYear.total.toLocaleString()} titles added`}
          icon={Flame}
          accent
        />
        <KpiCard
          label="Same-Year Releases"
          value={`${sameYearPct}%`}
          sublabel={`${sameYearTotal.toLocaleString()} added in release year`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Avg Movie Lag"
          value={`${avgMovieLag} yrs`}
          sublabel="Release year to platform drop"
          icon={Clock}
        />
        <KpiCard
          label="Avg TV Show Lag"
          value={`${avgTvLag} yrs`}
          sublabel="Faster turnaround than films"
          icon={Layers}
        />
      </div>

      {/* Content Growth & Monthly Cadence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Cumulative Catalog Growth"
          subtitle="Compounding library volume by platform addition year"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeGrowth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E50914" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#E50914" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative Titles"
                  stroke="#E50914"
                  strokeWidth={2.2}
                  fill="url(#cumGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Monthly Release Cadence (Seasonality)"
          subtitle="Aggregated catalog drops across calendar months"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonality} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="month" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" stackId="m" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="m" fill="#737373" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Year x Month Drop Heatmap */}
      <ChartPanel
        title="Platform Addition Heatmap (Year × Month, 2015–2021)"
        subtitle="Monthly release drop velocity showing peak expansion waves"
      >
        {heatmap.rows.length === 0 ? (
          <p className="text-xs text-neutral-400 py-4">
            No platform addition dates from 2015 onward exist in the active selection.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 text-[11px]">
                  <th className="py-2 pr-3 font-medium">Year</th>
                  {heatmap.monthLabels.map((m) => (
                    <th key={m} className="py-2 px-1.5 font-medium text-right">
                      {m}
                    </th>
                  ))}
                  <th className="py-2 pl-3 font-medium text-right">Annual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {heatmap.rows.map((row) => (
                  <tr key={row.year}>
                    <td className="py-1.5 pr-3 font-mono font-semibold text-white">{row.year}</td>
                    {row.months.map((val, mIdx) => {
                      const alpha =
                        val === 0 ? 0 : Math.max(0.12, Math.min(0.9, val / heatmap.maxCell));
                      return (
                        <td key={mIdx} className="py-1 px-1 text-right">
                          <div
                            className="rounded px-1.5 py-1 font-mono tabular-nums text-[11px]"
                            style={{
                              backgroundColor:
                                val > 0
                                  ? `rgba(229, 9, 20, ${alpha.toFixed(2)})`
                                  : 'rgba(255,255,255,0.02)',
                              color: val > 0 ? '#ffffff' : '#525252',
                            }}
                          >
                            {val}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-1.5 pl-3 font-mono font-semibold text-right text-neutral-200 tabular-nums">
                      {row.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartPanel>

      {/* Movie vs TV Show Share Trend + Audience Rating Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="TV Show Share Evolution (% of Annual Additions)"
          subtitle="Percentage of titles added each year that are serialized TV Shows"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeGrowth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<DarkTooltip unit="%" />} />
                <Line
                  type="monotone"
                  dataKey="tvSharePct"
                  name="TV Show Share"
                  stroke="#E50914"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#E50914' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Audience Rating Tier Comparison"
          subtitle="Mature vs Teens vs Kids & Family split across Movies and TV Shows"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratings.byTier} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="tier" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" fill="#E50914" radius={[3, 3, 0, 0]} />
                <Bar dataKey="tvShows" name="TV Shows" fill="#737373" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Release Decade Breakdown + Top Credited Cast */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ChartPanel
          title="Release Decade Breakdown"
          subtitle="Library distribution from pre-1980 classics to 2020–2021 releases"
          className="lg:col-span-6"
        >
          <div className="h-76">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decades} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="decade" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" stackId="dec" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="dec" fill="#737373" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Most Featured Cast Members (Top 12)"
          subtitle="Actors & voice talent appearing across the most catalog titles"
          className="lg:col-span-6"
        >
          <div className="h-76">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCast}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" stackId="cast" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="cast" fill="#A3A3A3" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Genre & Country Deep Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Top 14 Genres (Movie vs TV Comparison)"
          subtitle="Category footprint across format lines"
        >
          <div className="h-96">
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
                  width={155}
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" stackId="g" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="g" fill="#737373" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Top 12 Countries & Format Mix"
          subtitle="Regional catalog share between Movies and TV Shows"
        >
          <div className="h-96">
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
                  width={115}
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip unit="titles" />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="movies" name="Movies" stackId="c" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="c" fill="#A3A3A3" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Release Year Distribution */}
      <ChartPanel
        title="Release Year Trajectory (1980–2021)"
        subtitle="Catalog vintage distribution comparing theatrical back-catalog vs modern series"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={releaseTrends} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
              <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip unit="titles" />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="movies"
                name="Movies Released"
                stroke="#E50914"
                fill="#E50914"
                fillOpacity={0.28}
              />
              <Area
                type="monotone"
                dataKey="tvShows"
                name="TV Shows Released"
                stroke="#D4D4D4"
                fill="#D4D4D4"
                fillOpacity={0.18}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>
    </div>
  );
}

import { Award, Layers, Repeat, Tv } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartPanel, DarkTooltip } from '../components/ChartPanel';
import { KpiCard } from '../components/KpiCard';
import type { NetflixRecord } from '../types/netflix';
import { computeTvAnalytics } from '../utils/analytics';

interface TvShowsPageProps {
  records: NetflixRecord[];
  onResetFilters: () => void;
}

export function TvShowsPage({ records, onResetFilters }: TvShowsPageProps) {
  const tvData = computeTvAnalytics(records);

  if (tvData.totalShows === 0) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-lg p-12 text-center">
        <p className="text-base font-medium text-white">No TV Show records match the current filters.</p>
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
          label="Total TV Shows"
          value={tvData.totalShows.toLocaleString()}
          sublabel="Serialized series & limited runs"
          icon={Tv}
          accent
        />
        <KpiCard
          label="Single-Season Share"
          value={`${tvData.singleSeasonSharePct}%`}
          sublabel={`${tvData.singleSeasonCount.toLocaleString()} 1-season titles`}
          icon={Layers}
        />
        <KpiCard
          label="Average Seasons"
          value={tvData.avgSeasons}
          sublabel={`${tvData.multiSeasonCount.toLocaleString()} multi-season series`}
          icon={Repeat}
        />
        <KpiCard
          label="Max Season Depth"
          value={`${tvData.maxSeasons} Seasons`}
          sublabel="Longest running series in view"
          icon={Award}
        />
      </div>

      {/* Season Distribution + TV Releases Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Season Distribution"
          subtitle="Concentration of single-season vs multi-season series"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tvData.seasonBuckets}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="label" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="shows" />} />
                <Bar dataKey="count" name="TV Shows" fill="#E50914" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="TV Show Releases Over Time (1995–2021)"
          subtitle="Surge in serialized series production over the past decade"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={tvData.releaseTrends}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="tvRelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E50914" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#E50914" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="shows" />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="TV Shows Released"
                  stroke="#E50914"
                  strokeWidth={2}
                  fill="url(#tvRelGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Genre Breakdown + Ratings Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="TV Show Genre Breakdown"
          subtitle="Top 10 series categories"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tvData.topGenres}
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
                <Tooltip content={<DarkTooltip unit="shows" />} />
                <Bar dataKey="total" name="TV Shows" fill="#E50914" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="TV Show Ratings Distribution"
          subtitle="Parental rating profile of series catalog"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tvData.ratings}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="rating" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip unit="shows" />} />
                <Bar dataKey="total" name="TV Shows" fill="#A3A3A3" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Longest Running Series Table */}
      <ChartPanel
        title="Longest-Running Series in Active Selection"
        subtitle="Multi-season titles ranked by season depth (6+ seasons)"
      >
        {tvData.longestRunningShows.length === 0 ? (
          <p className="text-xs text-neutral-400 py-4">
            No series with 6 or more seasons exist inside the current filter slice.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 pr-4 font-medium">ID</th>
                  <th className="py-2.5 pr-4 font-medium">Series Title</th>
                  <th className="py-2.5 pr-4 font-medium">Primary Country</th>
                  <th className="py-2.5 pr-4 font-medium">Rating</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Release Year</th>
                  <th className="py-2.5 font-medium text-right">Seasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tvData.longestRunningShows.map((s) => (
                  <tr key={s.show_id} className="hover:bg-white/[0.03]">
                    <td className="py-2.5 pr-4 font-mono text-neutral-500">{s.show_id}</td>
                    <td className="py-2.5 pr-4 font-medium text-white">{s.title}</td>
                    <td className="py-2.5 pr-4 text-neutral-300">{s.country}</td>
                    <td className="py-2.5 pr-4 font-mono text-neutral-300">{s.rating}</td>
                    <td className="py-2.5 pr-4 font-mono text-neutral-400 text-right tabular-nums">
                      {s.release_year}
                    </td>
                    <td className="py-2.5 font-mono font-semibold text-[#E50914] text-right tabular-nums">
                      {s.seasons}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartPanel>
    </div>
  );
}

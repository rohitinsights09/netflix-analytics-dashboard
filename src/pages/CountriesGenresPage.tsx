import { useState } from 'react';
import { Globe2, GitMerge, Tags, Tv } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartPanel, DarkTooltip } from '../components/ChartPanel';
import { KpiCard } from '../components/KpiCard';
import type { NetflixRecord } from '../types/netflix';
import {
  computeCountryGenreComparison,
  computeOverviewMetrics,
  computeTopCountries,
  computeTopGenres,
} from '../utils/analytics';

interface CountriesGenresPageProps {
  records: NetflixRecord[];
  onResetFilters: () => void;
}

export function CountriesGenresPage({ records, onResetFilters }: CountriesGenresPageProps) {
  const overview = computeOverviewMetrics(records);
  const topCountries = computeTopCountries(records, 15);
  const topGenres = computeTopGenres(records, 15);
  const cgData = computeCountryGenreComparison(records, 10, 8);

  const [focusCountry, setFocusCountry] = useState<string>('All');

  if (records.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-lg p-12 text-center">
        <p className="text-base font-medium text-white">No records match the current filters.</p>
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

  const focusedRecords =
    focusCountry === 'All'
      ? records
      : records.filter((r) => r.countries.includes(focusCountry));
  const focusedGenres = computeTopGenres(focusedRecords, 10);

  // Max cell value in matrix for proportional opacity shading
  let maxMatrixVal = 1;
  for (const row of cgData.matrix) {
    for (const g of cgData.topGenres) {
      if ((row.counts[g] ?? 0) > maxMatrixVal) maxMatrixVal = row.counts[g];
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Production Countries"
          value={overview.totalCountries}
          sublabel="Distinct nations represented"
          icon={Globe2}
          accent
        />
        <KpiCard
          label="Distinct Genres"
          value={overview.totalGenres}
          sublabel="Categorized content verticals"
          icon={Tags}
        />
        <KpiCard
          label="Co-Productions"
          value={cgData.coProductionStats.multiCountryCount.toLocaleString()}
          sublabel={`${cgData.coProductionStats.coProductionRatePct}% of known-country titles`}
          icon={GitMerge}
        />
        <KpiCard
          label="Top Market"
          value={topCountries[0]?.name ?? 'N/A'}
          sublabel={
            topCountries[0]
              ? `${topCountries[0].total.toLocaleString()} titles (${topCountries[0].tvSharePct}% TV)`
              : ''
          }
          icon={Tv}
        />
      </div>

      {/* Top 15 Countries + Interactive Country-to-Genre Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Top 15 Content-Producing Countries"
          subtitle="Movies vs TV Shows split by production hub"
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
                <Bar dataKey="tvShows" name="TV Shows" stackId="c" fill="#737373" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title={
            focusCountry === 'All'
              ? 'Top Genres Across Selection'
              : `Genre DNA: ${focusCountry}`
          }
          subtitle={
            focusCountry === 'All'
              ? 'Select a country on the right to isolate its genre footprint'
              : `Analyzing ${focusedRecords.length.toLocaleString()} titles produced with ${focusCountry}`
          }
          rightSlot={
            <select
              aria-label="Spotlight Country"
              value={focusCountry}
              onChange={(e) => setFocusCountry(e.target.value)}
              className="bg-[#0c0c0c] border border-white/15 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#E50914]"
            >
              <option value="All">All Markets</option>
              {topCountries.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.total})
                </option>
              ))}
            </select>
          }
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={focusedGenres}
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
                <Bar dataKey="movies" name="Movies" stackId="fg" fill="#E50914" />
                <Bar dataKey="tvShows" name="TV Shows" stackId="fg" fill="#A3A3A3" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Country x Genre Heatmap Matrix */}
      <ChartPanel
        title="Country × Genre Intensity Matrix"
        subtitle="Cross-tabulation of Top 10 Countries against Top 8 Genres (click a country row to spotlight)"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 text-[11px]">
                <th className="py-2.5 pr-4 font-medium">Country</th>
                <th className="py-2.5 px-2 font-medium text-right">Titles</th>
                {cgData.topGenres.map((genre) => (
                  <th
                    key={genre}
                    className="py-2.5 px-2 font-medium text-right whitespace-nowrap"
                    title={genre}
                  >
                    {genre.length > 16 ? `${genre.slice(0, 15)}…` : genre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cgData.matrix.map((row) => {
                const isSelected = focusCountry === row.country;
                return (
                  <tr
                    key={row.country}
                    onClick={() =>
                      setFocusCountry(isSelected ? 'All' : row.country)
                    }
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#E50914]/15' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-white whitespace-nowrap">
                      {row.country}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-neutral-300 tabular-nums">
                      {row.total.toLocaleString()}
                    </td>
                    {cgData.topGenres.map((genre) => {
                      const val = row.counts[genre] ?? 0;
                      const alpha = val === 0 ? 0 : Math.max(0.12, Math.min(0.85, val / maxMatrixVal));
                      return (
                        <td key={genre} className="py-1.5 px-1.5 text-right">
                          <div
                            className="rounded px-2 py-1 font-mono tabular-nums text-[11px]"
                            style={{
                              backgroundColor:
                                val > 0 ? `rgba(229, 9, 20, ${alpha.toFixed(2)})` : 'rgba(255,255,255,0.02)',
                              color: val > 0 ? '#ffffff' : '#525252',
                            }}
                          >
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartPanel>

      {/* Top 15 Genres Share Overview */}
      <ChartPanel
        title="Genre Penetration Rankings (Top 15)"
        subtitle="Catalog share and Movie/TV composition across top categories"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 pr-4 font-medium">#</th>
                <th className="py-2.5 pr-4 font-medium">Genre Category</th>
                <th className="py-2.5 pr-4 font-medium text-right">Total Titles</th>
                <th className="py-2.5 pr-4 font-medium text-right">Movies</th>
                <th className="py-2.5 pr-4 font-medium text-right">TV Shows</th>
                <th className="py-2.5 font-medium text-right">Catalog Penetration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topGenres.map((g, i) => (
                <tr key={g.name} className="hover:bg-white/[0.03]">
                  <td className="py-2 pr-4 font-mono text-neutral-500">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium text-white">{g.name}</td>
                  <td className="py-2 pr-4 font-mono text-right text-white tabular-nums">
                    {g.total.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-right text-neutral-300 tabular-nums">
                    {g.movies.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-right text-neutral-300 tabular-nums">
                    {g.tvShows.toLocaleString()}
                  </td>
                  <td className="py-2 font-mono text-right text-[#E50914] tabular-nums">
                    {g.sharePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    </div>
  );
}

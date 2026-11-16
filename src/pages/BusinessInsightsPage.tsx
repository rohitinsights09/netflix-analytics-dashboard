import { useState } from 'react';
import { Code2, Download, Play, Terminal } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DarkTooltip } from '../components/ChartPanel';
import type { NetflixRecord } from '../types/netflix';
import { computeBusinessInsights } from '../utils/analytics';
import { downloadStaticArtifact } from '../utils/exports';

interface BusinessInsightsPageProps {
  records: NetflixRecord[];
  onResetFilters: () => void;
}

const PRESET_SQL_QUERIES: Array<{ label: string; sql: string }> = [
  {
    label: '1. Catalog Mix & Date Span',
    sql: `SELECT
    COUNT(*) AS total_titles,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS total_movies,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS total_tv_shows,
    ROUND(100.0 * SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) / COUNT(*), 2) AS movie_share_pct,
    MIN(release_year) AS earliest_year,
    MAX(release_year) AS latest_year
FROM netflix_titles`,
  },
  {
    label: '2. Top 12 Countries (Format Split)',
    sql: `SELECT
    tc.country,
    COUNT(*) AS total_titles,
    SUM(CASE WHEN nt.type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN nt.type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows,
    ROUND(100.0 * SUM(CASE WHEN nt.type = 'TV Show' THEN 1 ELSE 0 END) / COUNT(*), 1) AS tv_share_pct
FROM title_countries tc
JOIN netflix_titles nt ON nt.show_id = tc.show_id
WHERE tc.country <> 'Unknown'
GROUP BY tc.country
ORDER BY total_titles DESC
LIMIT 12`,
  },
  {
    label: '3. Top 12 Genres & Penetration',
    sql: `SELECT
    tg.genre,
    COUNT(*) AS total_titles,
    SUM(CASE WHEN nt.type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN nt.type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM netflix_titles), 2) AS catalog_pct
FROM title_genres tg
JOIN netflix_titles nt ON nt.show_id = tg.show_id
GROUP BY tg.genre
ORDER BY total_titles DESC
LIMIT 12`,
  },
  {
    label: '4. Annual Platform Additions',
    sql: `SELECT
    year_added,
    COUNT(*) AS titles_added,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows
FROM netflix_titles
WHERE year_added IS NOT NULL
GROUP BY year_added
ORDER BY year_added DESC`,
  },
  {
    label: '5. Release-to-Platform Lag',
    sql: `SELECT
    type,
    COUNT(*) AS sample_size,
    ROUND(AVG(year_added - release_year), 2) AS avg_years_lag,
    SUM(CASE WHEN year_added = release_year THEN 1 ELSE 0 END) AS same_year_drops,
    ROUND(100.0 * SUM(CASE WHEN year_added = release_year THEN 1 ELSE 0 END) / COUNT(*), 2) AS same_year_pct
FROM netflix_titles
WHERE year_added IS NOT NULL AND year_added >= release_year
GROUP BY type`,
  },
  {
    label: '6. Rating Tier Summary',
    sql: `SELECT
    rating_tier,
    COUNT(*) AS total_titles,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM netflix_titles), 2) AS share_pct
FROM netflix_titles
GROUP BY rating_tier
ORDER BY total_titles DESC`,
  },
];

interface SqlResultState {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  rowCount: number;
  truncated: boolean;
  executionMs: number;
}

export function BusinessInsightsPage({ records, onResetFilters }: BusinessInsightsPageProps) {
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [sqlInput, setSqlInput] = useState(PRESET_SQL_QUERIES[0].sql);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlResult, setSqlResult] = useState<SqlResultState | null>(null);

  const runSqlQuery = async (queryToRun?: string) => {
    const sql = queryToRun ?? sqlInput;
    setSqlLoading(true);
    setSqlError(null);
    try {
      const res = await fetch('/api/sql-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSqlError(data.error || 'SQL query execution failed.');
        setSqlResult(null);
      } else {
        setSqlResult(data);
      }
    } catch {
      setSqlError('Unable to reach SQLite query engine.');
    } finally {
      setSqlLoading(false);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-lg p-12 text-center">
        <p className="text-base font-medium text-white">
          No records available to compute business insights under current filters.
        </p>
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

  const insights = computeBusinessInsights(records);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#141414] border border-white/10 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Strategic Business Insights ({insights.length} Verified Findings)
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Every metric, trend, and chart below is computed dynamically from the{' '}
            <span className="font-mono text-white">{records.length.toLocaleString()}</span>{' '}
            active cleaned records and validated against SQLite queries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const next = !showWorkbench;
              setShowWorkbench(next);
              if (next && !sqlResult) {
                runSqlQuery(sqlInput);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-[#E50914]" />
            {showWorkbench ? 'Hide SQL Workbench' : 'Open Live SQL Workbench'}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadStaticArtifact(
                '/data/netflix_insights_queries.sql',
                'netflix_insights_queries.sql'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#E50914] hover:bg-[#f40612] text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download .SQL File
          </button>
        </div>
      </div>

      {/* Interactive SQLite Query Workbench */}
      {showWorkbench && (
        <section className="bg-[#101010] border border-white/15 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#E50914]" />
              <h3 className="text-sm font-semibold text-white">
                Live SQLite Workbench (Read-Only Engine)
              </h3>
              <span className="text-xs text-neutral-500 font-mono">
                Tables: netflix_titles · title_genres · title_countries
              </span>
            </div>
            <button
              type="button"
              onClick={() => runSqlQuery()}
              disabled={sqlLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#E50914] hover:bg-[#f40612] text-white rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              {sqlLoading ? 'Executing...' : 'Run SQL Query'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_SQL_QUERIES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSqlInput(preset.sql);
                  runSqlQuery(preset.sql);
                }}
                className="px-2.5 py-1 text-[11px] font-medium bg-[#1a1a1a] hover:bg-[#242424] text-neutral-300 border border-white/10 rounded transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <textarea
            aria-label="SQLite SQL Query Editor"
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            rows={7}
            spellCheck={false}
            className="w-full bg-[#080808] border border-white/15 rounded-md p-3 font-mono text-xs text-neutral-200 focus:outline-none focus:border-[#E50914]"
          />

          {sqlError && (
            <div className="bg-[#E50914]/15 border border-[#E50914]/40 rounded px-3 py-2 text-xs text-red-200">
              {sqlError}
            </div>
          )}

          {sqlResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>
                  Returned {sqlResult.rowCount.toLocaleString()} row(s)
                  {sqlResult.truncated ? ' (capped at 500)' : ''}
                </span>
                <span>Query time: {sqlResult.executionMs} ms</span>
              </div>
              <div className="overflow-x-auto border border-white/10 rounded-md max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#181818] sticky top-0">
                    <tr className="border-b border-white/10 text-neutral-300 font-mono text-[11px]">
                      {sqlResult.columns.map((col) => (
                        <th key={col} className="py-2 px-3 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {sqlResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.03]">
                        {row.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className="py-1.5 px-3 text-neutral-200 whitespace-nowrap tabular-nums"
                          >
                            {val === null ? 'NULL' : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 10 Business Insight Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {insights.map((ins) => (
          <article
            key={ins.id}
            className="bg-[#141414] border border-white/10 rounded-lg p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3.5">
                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
                    <span className="font-mono text-[#E50914] font-semibold">
                      INSIGHT {ins.number}
                    </span>
                    <span>·</span>
                    <span>{ins.category}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1 leading-snug">
                    {ins.title}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                    {ins.metricLabel}
                  </div>
                  <div className="font-mono text-lg font-semibold text-[#E50914] tabular-nums">
                    {ins.metricValue}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="font-semibold text-white uppercase tracking-wide text-[11px] block mb-0.5">
                    What happened?
                  </span>
                  <p className="text-neutral-300">{ins.whatHappened}</p>
                </div>
                <div>
                  <span className="font-semibold text-white uppercase tracking-wide text-[11px] block mb-0.5">
                    What does the data indicate?
                  </span>
                  <p className="text-neutral-300">{ins.whatItIndicates}</p>
                </div>
                <div>
                  <span className="font-semibold text-white uppercase tracking-wide text-[11px] block mb-0.5">
                    Why is this important?
                  </span>
                  <p className="text-neutral-400">{ins.whyImportant}</p>
                </div>
              </div>
            </div>

            {/* Supporting Visualization */}
            <div className="pt-3 border-t border-white/10 h-48">
              <ResponsiveContainer width="100%" height="100%">
                {ins.chartType === 'area' ? (
                  <AreaChart
                    data={ins.chartData}
                    margin={{ top: 6, right: 8, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="name" stroke="#737373" fontSize={10} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    {ins.chartSeriesKeys.length > 1 && (
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    )}
                    {ins.chartSeriesKeys.map((s) => (
                      <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={0.28}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                ) : ins.chartType === 'horizontal-bar' ? (
                  <BarChart
                    data={ins.chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                    <XAxis type="number" stroke="#737373" fontSize={10} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      stroke="#a3a3a3"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    {ins.chartSeriesKeys.map((s) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stackId="hb"
                        fill={s.color}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart
                    data={ins.chartData}
                    margin={{ top: 6, right: 8, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="name" stroke="#a3a3a3" fontSize={10} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    {ins.chartSeriesKeys.length > 1 && (
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    )}
                    {ins.chartSeriesKeys.map((s) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        fill={s.color}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

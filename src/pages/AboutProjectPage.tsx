import {
  Code2,
  Database,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Terminal,
  User,
} from 'lucide-react';
import type { DataQualityReport, NetflixRecord } from '../types/netflix';
import {
  downloadStaticArtifact,
  exportExecutiveExcelWorkbook,
  exportFilteredRecordsCsv,
} from '../utils/exports';

interface AboutProjectPageProps {
  allRecords: NetflixRecord[];
  qualityReport: DataQualityReport | null;
  onDownloadZip: () => void;
  downloadingZip: boolean;
}

export function AboutProjectPage({
  allRecords,
  qualityReport,
  onDownloadZip,
  downloadingZip,
}: AboutProjectPageProps) {
  return (
    <div className="space-y-6">
      {/* Creator Profile & Project Metadata */}
      <section className="bg-[#141414] border border-white/10 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#E50914]/15 border border-[#E50914]/40 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-[#E50914]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#E50914] font-semibold">
                Personal Portfolio Project
              </div>
              <h2 className="font-display text-3xl font-bold tracking-wide text-white mt-0.5">
                NETFLIX INSIGHTS
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Content Analytics &amp; Business Intelligence Dashboard
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-neutral-500 block">Created By</span>
              <span className="text-white font-semibold mt-0.5 block">Rohit Shinde</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Role</span>
              <span className="text-white font-medium mt-0.5 block">
                Data Analyst / Project Developer
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-neutral-500 block">Core Stack</span>
              <span className="text-neutral-200 mt-0.5 block">
                Python, SQL, Excel, React, Data Visualization
              </span>
            </div>
          </div>
        </div>

        {/* Objectives & Methodology */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5 text-xs leading-relaxed">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Project Objectives</h3>
            <p className="text-neutral-300">
              Netflix Insights transforms a raw streaming catalog CSV into an end-to-end
              Business Intelligence workspace. The project demonstrates practical capability across
              raw dataset inspection, programmatic data cleaning, SQL-backed analytical validation,
              automated workbook reporting, and interactive front-end visualization.
            </p>
            <ul className="space-y-1.5 text-neutral-300 list-disc pl-4">
              <li>
                Inspect raw catalog anomalies without altering source files or fabricating metrics.
              </li>
              <li>
                Deliver multi-dimensional filtering across Movies, TV Shows, 122 countries, 42
                genres, maturity ratings, and release years (1925–2021).
              </li>
              <li>
                Translate descriptive metrics into structured Business Insights linking data
                patterns to catalog strategy.
              </li>
              <li>
                Provide exportable portfolio artifacts: cleaned CSV, SQLite query script, Excel
                multi-sheet workbook, and full project ZIP archive.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Analytical Methodology</h3>
            <div className="space-y-2.5 text-neutral-300">
              <div className="bg-[#0d0d0d] border border-white/10 rounded p-3">
                <div className="font-semibold text-white">
                  1. Data Inspection &amp; Cleaning (Python)
                </div>
                <p className="text-neutral-400 mt-0.5">
                  Audited {qualityReport?.raw_row_count.toLocaleString() ?? '8,807'} raw records;
                  recovered 3 shifted duration entries (s5542, s5795, s5814), deduplicated 4
                  redundant titles, cleaned 7 malformed country lists, and extracted numeric
                  runtime and season counters into{' '}
                  {qualityReport?.cleaned_row_count.toLocaleString() ?? '8,803'} verified rows.
                </p>
              </div>
              <div className="bg-[#0d0d0d] border border-white/10 rounded p-3">
                <div className="font-semibold text-white">2. Relational SQL Verification (SQLite)</div>
                <p className="text-neutral-400 mt-0.5">
                  Normalized multi-value genres and countries into bridge tables to compute exact
                  distributions, year-over-year addition trends, runtime metrics, and
                  release-to-platform lag figures.
                </p>
              </div>
              <div className="bg-[#0d0d0d] border border-white/10 rounded p-3">
                <div className="font-semibold text-white">
                  3. Interactive BI &amp; Reporting (React + TypeScript + SheetJS)
                </div>
                <p className="text-neutral-400 mt-0.5">
                  Built dynamic client-side aggregation and Recharts visualizations paired with
                  live CSV, multi-sheet Excel (.xlsx), and downloadable SQL exports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables Hub */}
      <section className="bg-[#141414] border border-white/10 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-white mb-1">
          Portfolio Deliverables &amp; Downloads
        </h3>
        <p className="text-xs text-neutral-400 mb-4">
          Download the cleaned dataset, verified SQL script, multi-sheet Excel report, data quality
          documentation, or the complete source code package.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() =>
              exportFilteredRecordsCsv(allRecords, 'netflix_cleaned_rohit_shinde.csv')
            }
            className="flex items-center gap-3 p-3.5 rounded-md bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-white/10 text-left transition-colors cursor-pointer"
          >
            <Database className="w-5 h-5 text-[#E50914] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Cleaned Dataset (.csv)</div>
              <div className="text-[11px] text-neutral-400">
                {allRecords.length.toLocaleString()} cleaned &amp; enriched rows
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              exportExecutiveExcelWorkbook(allRecords, allRecords, qualityReport)
            }
            className="flex items-center gap-3 p-3.5 rounded-md bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-white/10 text-left transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-5 h-5 text-[#E50914] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Excel BI Workbook (.xlsx)</div>
              <div className="text-[11px] text-neutral-400">
                5-sheet KPI, Country, Rating &amp; Data report
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadStaticArtifact(
                '/data/netflix_insights_queries.sql',
                'netflix_insights_queries.sql'
              )
            }
            className="flex items-center gap-3 p-3.5 rounded-md bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-white/10 text-left transition-colors cursor-pointer"
          >
            <Code2 className="w-5 h-5 text-[#E50914] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">SQL Query Suite (.sql)</div>
              <div className="text-[11px] text-neutral-400">
                10 verified SQLite analytical queries
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadStaticArtifact('/data/data_quality_report.md', 'data_quality_report.md')
            }
            className="flex items-center gap-3 p-3.5 rounded-md bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-white/10 text-left transition-colors cursor-pointer"
          >
            <FileText className="w-5 h-5 text-[#E50914] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Data Quality Report (.md)</div>
              <div className="text-[11px] text-neutral-400">
                Missing values, duplicates &amp; fixes log
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadStaticArtifact('/data/netflix_insights.db', 'netflix_insights.db')
            }
            className="flex items-center gap-3 p-3.5 rounded-md bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-white/10 text-left transition-colors cursor-pointer"
          >
            <Download className="w-5 h-5 text-[#E50914] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">SQLite Database (.db)</div>
              <div className="text-[11px] text-neutral-400">
                Indexed relational SQLite 3 database
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onDownloadZip}
            disabled={downloadingZip}
            className="flex items-center gap-3 p-3.5 rounded-md bg-[#E50914]/15 hover:bg-[#E50914]/25 border border-[#E50914]/40 text-left transition-colors cursor-pointer disabled:opacity-60"
          >
            <FileArchive className="w-5 h-5 text-[#E50914] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">
                {downloadingZip ? 'Packaging ZIP...' : 'Complete Project (.zip)'}
              </div>
              <div className="text-[11px] text-neutral-300">
                Full source code, scripts, SQL &amp; README
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Limitations & Windows VS Code Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#141414] border border-white/10 rounded-lg p-5 space-y-3 text-xs leading-relaxed">
          <h3 className="text-sm font-semibold text-white">Dataset Limitations &amp; Caveats</h3>
          <ul className="space-y-2 text-neutral-300 list-disc pl-4">
            <li>
              <strong>Temporal Cutoff:</strong> The catalog snapshot concludes in late 2021 and does
              not capture titles added or removed in subsequent years.
            </li>
            <li>
              <strong>No Engagement or Financial Metrics:</strong> The dataset tracks metadata
              only—it does not include viewership hours, completion rates, subscriber churn, or
              production budgets.
            </li>
            <li>
              <strong>Missing Metadata:</strong> 831 titles lack country attribution and 2,633 lack
              director credits; rankings explicitly exclude &quot;Unknown&quot; and &quot;Not
              Specified&quot; placeholders to prevent skew.
            </li>
            <li>
              <strong>Multi-Tag Attribution:</strong> Co-productions and multi-genre titles are
              credited across each listed country and genre in category breakdowns.
            </li>
          </ul>
        </section>

        <section className="bg-[#141414] border border-white/10 rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#E50914]" />
            <h3 className="text-sm font-semibold text-white">
              Running Locally in VS Code (Windows)
            </h3>
          </div>
          <ol className="space-y-1.5 text-neutral-300 list-decimal pl-4">
            <li>Download and extract the Complete Project ZIP archive.</li>
            <li>Open the extracted folder in Visual Studio Code.</li>
            <li>
              Open the VS Code terminal (<code className="font-mono text-white">Ctrl + `</code>)
              and install dependencies:
            </li>
          </ol>
          <pre className="bg-[#0b0b0b] border border-white/10 rounded p-3 font-mono text-[11px] text-neutral-200 overflow-x-auto">
{`npm install
python scripts/process_netflix_data.py
npm run dev`}
          </pre>
          <p className="text-neutral-400">
            Navigate to <code className="font-mono text-white">http://localhost:3000</code> in your
            browser.
          </p>
        </section>
      </div>
    </div>
  );
}

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { DataQualityReport, NetflixRecord } from '../types/netflix';
import {
  computeAddedTrends,
  computeMovieAnalytics,
  computeOverviewMetrics,
  computeRatingsDistribution,
  computeTopCountries,
  computeTopGenres,
  computeTvAnalytics,
} from './analytics';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFilteredRecordsCsv(records: NetflixRecord[], filename = 'netflix_filtered_export.csv') {
  const exportRows = records.map((r) => ({
    show_id: r.show_id,
    type: r.type,
    title: r.title,
    director: r.director,
    cast: r.cast,
    country: r.country,
    date_added: r.date_added,
    release_year: r.release_year,
    rating: r.rating,
    rating_tier: r.rating_tier,
    duration: r.duration,
    duration_minutes: r.duration_minutes ?? '',
    seasons_count: r.seasons_count ?? '',
    listed_in: r.listed_in,
    description: r.description,
  }));

  const csv = Papa.unparse(exportRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, filename);
}

export function exportExecutiveExcelWorkbook(
  filteredRecords: NetflixRecord[],
  allRecords: NetflixRecord[],
  qualityReport: DataQualityReport | null,
  filename = 'netflix_insights_report_rohit_shinde.xlsx'
) {
  const wb = XLSX.utils.book_new();
  const overview = computeOverviewMetrics(filteredRecords);
  const movieStats = computeMovieAnalytics(filteredRecords);
  const tvStats = computeTvAnalytics(filteredRecords);
  const topCountries = computeTopCountries(filteredRecords, 25);
  const topGenres = computeTopGenres(filteredRecords, 25);
  const ratings = computeRatingsDistribution(filteredRecords);
  const addedTrends = computeAddedTrends(filteredRecords);

  // Sheet 1: Executive Summary
  const summaryRows = [
    ['NETFLIX INSIGHTS — CONTENT ANALYTICS & BUSINESS INTELLIGENCE REPORT'],
    ['Created by', 'Rohit Shinde'],
    ['Scope', filteredRecords.length === allRecords.length ? 'Full Cleaned Catalog' : `Filtered Subset (${filteredRecords.length} of ${allRecords.length} titles)`],
    ['Generated On', new Date().toISOString().slice(0, 10)],
    [],
    ['KEY PERFORMANCE INDICATORS', 'VALUE'],
    ['Total Titles', overview.totalTitles],
    ['Total Movies', overview.totalMovies],
    ['Movie Share (%)', `${overview.movieSharePct}%`],
    ['Total TV Shows', overview.totalTvShows],
    ['TV Show Share (%)', `${overview.tvShowSharePct}%`],
    ['Unique Countries (excl. Unknown)', overview.totalCountries],
    ['Unique Genres', overview.totalGenres],
    ['Release Year Range', `${overview.minYear} - ${overview.maxYear}`],
    [],
    ['MOVIE DURATION METRICS', 'VALUE'],
    ['Average Movie Duration (min)', movieStats.avgMinutes],
    ['Median Movie Duration (min)', movieStats.medianMinutes],
    ['Shortest Movie (min)', movieStats.minMinutes],
    ['Longest Movie (min)', movieStats.maxMinutes],
    [],
    ['TV SHOW SEASON METRICS', 'VALUE'],
    ['Average Seasons per Show', tvStats.avgSeasons],
    ['Single-Season Show Share (%)', `${tvStats.singleSeasonSharePct}%`],
    ['Maximum Seasons', tvStats.maxSeasons],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // Sheet 2: Top Countries & Genres
  const cgHeader = [['TOP COUNTRIES', 'Total Titles', 'Movies', 'TV Shows', 'TV Share %', '', 'TOP GENRES', 'Total Titles', 'Movies', 'TV Shows', 'Catalog %']];
  const maxLen = Math.max(topCountries.length, topGenres.length);
  for (let i = 0; i < maxLen; i++) {
    const c = topCountries[i];
    const g = topGenres[i];
    cgHeader.push([
      c ? c.name : '',
      c ? String(c.total) : '',
      c ? String(c.movies) : '',
      c ? String(c.tvShows) : '',
      c ? `${c.tvSharePct}%` : '',
      '',
      g ? g.name : '',
      g ? String(g.total) : '',
      g ? String(g.movies) : '',
      g ? String(g.tvShows) : '',
      g ? `${g.sharePct}%` : '',
    ]);
  }
  const wsCG = XLSX.utils.aoa_to_sheet(cgHeader);
  wsCG['!cols'] = [
    { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 4 },
    { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCG, 'Countries & Genres');

  // Sheet 3: Ratings & Yearly Additions
  const ryRows = [['RATING', 'Audience Tier', 'Total Titles', 'Movies', 'TV Shows', '', 'YEAR ADDED', 'Total Added', 'Movies Added', 'TV Shows Added']];
  const maxRy = Math.max(ratings.byRating.length, addedTrends.length);
  for (let i = 0; i < maxRy; i++) {
    const r = ratings.byRating[i];
    const y = addedTrends[i];
    ryRows.push([
      r ? r.rating : '',
      r ? r.tier : '',
      r ? String(r.total) : '',
      r ? String(r.movies) : '',
      r ? String(r.tvShows) : '',
      '',
      y ? String(y.year) : '',
      y ? String(y.total) : '',
      y ? String(y.movies) : '',
      y ? String(y.tvShows) : '',
    ]);
  }
  const wsRY = XLSX.utils.aoa_to_sheet(ryRows);
  wsRY['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 4 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRY, 'Ratings & Trends');

  // Sheet 4: Data Quality Report
  if (qualityReport) {
    const dqRows: Array<Array<string | number>> = [
      ['DATA QUALITY & CLEANING REPORT', ''],
      ['Raw Records', qualityReport.raw_row_count],
      ['Cleaned Records', qualityReport.cleaned_row_count],
      ['Duplicates Removed', qualityReport.duplicates_removed_count],
      ['Shifted Duration Rows Repaired', qualityReport.anomalies_repaired.shifted_duration_in_rating.length],
      ['Malformed Country Strings Fixed', qualityReport.anomalies_repaired.malformed_country_lists_count],
      [],
      ['RAW COLUMN', 'MISSING COUNT BEFORE CLEANING'],
      ...Object.entries(qualityReport.raw_missing_values).map(([col, cnt]) => [col, cnt]),
    ];
    const wsDQ = XLSX.utils.aoa_to_sheet(dqRows);
    wsDQ['!cols'] = [{ wch: 36 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsDQ, 'Data Quality Audit');
  }

  // Sheet 5: Catalog Records
  const tableRows = filteredRecords.map((r) => ({
    Show_ID: r.show_id,
    Type: r.type,
    Title: r.title,
    Director: r.director,
    Country: r.country,
    Date_Added: r.date_added,
    Release_Year: r.release_year,
    Rating: r.rating,
    Duration: r.duration,
    Genres: r.listed_in,
  }));
  const wsData = XLSX.utils.json_to_sheet(tableRows);
  wsData['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 34 }, { wch: 24 }, { wch: 24 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 34 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Catalog Data');

  XLSX.writeFile(wb, filename);
}

export async function downloadStaticArtifact(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

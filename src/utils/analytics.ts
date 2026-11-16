import type { BusinessInsight, FilterState, NetflixRecord } from '../types/netflix';

export function applyFilters(records: NetflixRecord[], filters: FilterState): NetflixRecord[] {
  const q = filters.search.trim().toLowerCase();
  return records.filter((r) => {
    if (filters.type !== 'All' && r.type !== filters.type) return false;
    if (r.release_year < filters.yearMin || r.release_year > filters.yearMax) return false;
    if (filters.country !== 'All' && !r.countries.includes(filters.country)) return false;
    if (filters.genre !== 'All' && !r.genres.includes(filters.genre)) return false;
    if (filters.rating !== 'All' && r.rating !== filters.rating) return false;
    if (q) {
      const hit =
        r.title.toLowerCase().includes(q) ||
        r.director.toLowerCase().includes(q) ||
        r.cast.toLowerCase().includes(q) ||
        r.listed_in.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
}

export function extractFilterOptions(records: NetflixRecord[]) {
  const countryCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const ratingCounts = new Map<string, number>();
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const r of records) {
    if (r.release_year < minYear) minYear = r.release_year;
    if (r.release_year > maxYear) maxYear = r.release_year;
    for (const c of r.countries) {
      if (c && c !== 'Unknown') countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
    }
    for (const g of r.genres) {
      if (g) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
    if (r.rating) ratingCounts.set(r.rating, (ratingCounts.get(r.rating) ?? 0) + 1);
  }

  return {
    countries: [...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    genres: [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    ratings: [...ratingCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    minYear: Number.isFinite(minYear) ? minYear : 1925,
    maxYear: Number.isFinite(maxYear) ? maxYear : 2021,
  };
}

export function computeOverviewMetrics(records: NetflixRecord[]) {
  let movies = 0;
  let tvShows = 0;
  let minYear = Infinity;
  let maxYear = -Infinity;
  const countries = new Set<string>();
  const genres = new Set<string>();

  for (const r of records) {
    if (r.type === 'Movie') movies += 1;
    else tvShows += 1;
    if (r.release_year < minYear) minYear = r.release_year;
    if (r.release_year > maxYear) maxYear = r.release_year;
    for (const c of r.countries) {
      if (c && c !== 'Unknown') countries.add(c);
    }
    for (const g of r.genres) {
      if (g) genres.add(g);
    }
  }

  const total = records.length;
  return {
    totalTitles: total,
    totalMovies: movies,
    totalTvShows: tvShows,
    movieSharePct: total > 0 ? Number(((movies / total) * 100).toFixed(1)) : 0,
    tvShowSharePct: total > 0 ? Number(((tvShows / total) * 100).toFixed(1)) : 0,
    totalCountries: countries.size,
    totalGenres: genres.size,
    minYear: Number.isFinite(minYear) ? minYear : 0,
    maxYear: Number.isFinite(maxYear) ? maxYear : 0,
    yearSpan: Number.isFinite(minYear) && Number.isFinite(maxYear) ? maxYear - minYear + 1 : 0,
  };
}

export function computeAddedTrends(records: NetflixRecord[]) {
  const byYear = new Map<number, { year: number; total: number; movies: number; tvShows: number }>();
  for (const r of records) {
    if (!r.year_added) continue;
    const entry = byYear.get(r.year_added) ?? { year: r.year_added, total: 0, movies: 0, tvShows: 0 };
    entry.total += 1;
    if (r.type === 'Movie') entry.movies += 1;
    else entry.tvShows += 1;
    byYear.set(r.year_added, entry);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export function computeMonthlySeasonality(records: NetflixRecord[]) {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const buckets = monthLabels.map((month, idx) => ({
    monthNum: idx + 1,
    month,
    total: 0,
    movies: 0,
    tvShows: 0,
  }));

  for (const r of records) {
    if (!r.month_added || r.month_added < 1 || r.month_added > 12) continue;
    const b = buckets[r.month_added - 1];
    b.total += 1;
    if (r.type === 'Movie') b.movies += 1;
    else b.tvShows += 1;
  }
  return buckets;
}

export function computeReleaseTrends(records: NetflixRecord[], minYearFloor = 1990) {
  const byYear = new Map<number, { year: number; total: number; movies: number; tvShows: number }>();
  for (const r of records) {
    if (r.release_year < minYearFloor) continue;
    const entry = byYear.get(r.release_year) ?? { year: r.release_year, total: 0, movies: 0, tvShows: 0 };
    entry.total += 1;
    if (r.type === 'Movie') entry.movies += 1;
    else entry.tvShows += 1;
    byYear.set(r.release_year, entry);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export function computeTopGenres(records: NetflixRecord[], limit = 10) {
  const map = new Map<string, { name: string; total: number; movies: number; tvShows: number }>();
  for (const r of records) {
    for (const g of r.genres) {
      if (!g) continue;
      const entry = map.get(g) ?? { name: g, total: 0, movies: 0, tvShows: 0 };
      entry.total += 1;
      if (r.type === 'Movie') entry.movies += 1;
      else entry.tvShows += 1;
      map.set(g, entry);
    }
  }
  const totalTitles = Math.max(records.length, 1);
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      sharePct: Number(((item.total / totalTitles) * 100).toFixed(1)),
    }));
}

export function computeTopCountries(records: NetflixRecord[], limit = 10) {
  const map = new Map<string, { name: string; total: number; movies: number; tvShows: number }>();
  for (const r of records) {
    for (const c of r.countries) {
      if (!c || c === 'Unknown') continue;
      const entry = map.get(c) ?? { name: c, total: 0, movies: 0, tvShows: 0 };
      entry.total += 1;
      if (r.type === 'Movie') entry.movies += 1;
      else entry.tvShows += 1;
      map.set(c, entry);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      tvSharePct: item.total > 0 ? Number(((item.tvShows / item.total) * 100).toFixed(1)) : 0,
      movieSharePct: item.total > 0 ? Number(((item.movies / item.total) * 100).toFixed(1)) : 0,
    }));
}

export function computeRatingsDistribution(records: NetflixRecord[]) {
  const map = new Map<string, { rating: string; tier: string; total: number; movies: number; tvShows: number }>();
  const tierMap = new Map<string, { tier: string; total: number; movies: number; tvShows: number }>();

  for (const r of records) {
    const key = r.rating || 'Not Rated';
    const tier = r.rating_tier || 'Unrated';
    const entry = map.get(key) ?? { rating: key, tier, total: 0, movies: 0, tvShows: 0 };
    entry.total += 1;
    if (r.type === 'Movie') entry.movies += 1;
    else entry.tvShows += 1;
    map.set(key, entry);

    const tEntry = tierMap.get(tier) ?? { tier, total: 0, movies: 0, tvShows: 0 };
    tEntry.total += 1;
    if (r.type === 'Movie') tEntry.movies += 1;
    else tEntry.tvShows += 1;
    tierMap.set(tier, tEntry);
  }

  return {
    byRating: [...map.values()].sort((a, b) => b.total - a.total),
    byTier: [...tierMap.values()].sort((a, b) => b.total - a.total),
  };
}

export function computeMovieAnalytics(records: NetflixRecord[]) {
  const movies = records.filter((r) => r.type === 'Movie');
  const durations = movies
    .map((m) => m.duration_minutes)
    .filter((d): d is number => typeof d === 'number' && d > 0)
    .sort((a, b) => a - b);

  const count = durations.length;
  const avgMinutes = count > 0 ? Number((durations.reduce((acc, v) => acc + v, 0) / count).toFixed(1)) : 0;
  let medianMinutes = 0;
  if (count > 0) {
    const mid = Math.floor(count / 2);
    medianMinutes = count % 2 === 0 ? Number(((durations[mid - 1] + durations[mid]) / 2).toFixed(1)) : durations[mid];
  }
  const minMinutes = count > 0 ? durations[0] : 0;
  const maxMinutes = count > 0 ? durations[count - 1] : 0;

  const bucketDefs = [
    { label: '< 60 min', min: 0, max: 59 },
    { label: '60–89 min', min: 60, max: 89 },
    { label: '90–119 min', min: 90, max: 119 },
    { label: '120–149 min', min: 120, max: 149 },
    { label: '150+ min', min: 150, max: Infinity },
  ];
  const durationDistribution = bucketDefs.map((b) => {
    const bucketCount = durations.filter((d) => d >= b.min && d <= b.max).length;
    return {
      bucket: b.label,
      count: bucketCount,
      sharePct: count > 0 ? Number(((bucketCount / count) * 100).toFixed(1)) : 0,
    };
  });

  // Fine-grained 15-min runtime histogram (15m to 210m+)
  const histogramBins: Array<{ range: string; count: number }> = [];
  for (let start = 0; start <= 195; start += 15) {
    const end = start + 14;
    const label = start === 195 ? '195+ min' : `${start}–${end}m`;
    const binCount =
      start === 195
        ? durations.filter((d) => d >= 195).length
        : durations.filter((d) => d >= start && d <= end).length;
    histogramBins.push({ range: label, count: binCount });
  }

  // Average movie duration by release decade / recent years
  const yearDurMap = new Map<number, { sum: number; count: number }>();
  for (const m of movies) {
    if (m.release_year >= 2005 && m.duration_minutes) {
      const cur = yearDurMap.get(m.release_year) ?? { sum: 0, count: 0 };
      cur.sum += m.duration_minutes;
      cur.count += 1;
      yearDurMap.set(m.release_year, cur);
    }
  }
  const durationByReleaseYear = [...yearDurMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      avgDuration: Number((v.sum / v.count).toFixed(1)),
      count: v.count,
    }));

  // Top directors for movies
  const directorMap = new Map<string, number>();
  for (const m of movies) {
    if (!m.director || m.director === 'Not Specified') continue;
    for (const dir of m.director.split(',').map((s) => s.trim())) {
      if (dir) directorMap.set(dir, (directorMap.get(dir) ?? 0) + 1);
    }
  }
  const topDirectors = [...directorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([director, titles]) => ({ director, titles }));

  return {
    totalMovies: movies.length,
    measuredMovies: count,
    avgMinutes,
    medianMinutes,
    minMinutes,
    maxMinutes,
    durationDistribution,
    histogramBins,
    durationByReleaseYear,
    releaseTrends: computeReleaseTrends(movies, 1990),
    topGenres: computeTopGenres(movies, 10),
    ratings: computeRatingsDistribution(movies).byRating,
    topDirectors,
  };
}

export function computeTvAnalytics(records: NetflixRecord[]) {
  const shows = records.filter((r) => r.type === 'TV Show');
  const seasonVals = shows
    .map((s) => s.seasons_count)
    .filter((n): n is number => typeof n === 'number' && n > 0);

  const count = seasonVals.length;
  const avgSeasons = count > 0 ? Number((seasonVals.reduce((a, b) => a + b, 0) / count).toFixed(2)) : 0;
  const maxSeasons = count > 0 ? Math.max(...seasonVals) : 0;
  const singleSeasonCount = seasonVals.filter((s) => s === 1).length;
  const singleSeasonSharePct = count > 0 ? Number(((singleSeasonCount / count) * 100).toFixed(1)) : 0;
  const multiSeasonCount = count - singleSeasonCount;

  // Grouped season distribution: 1, 2, 3, 4, 5, 6+
  const seasonMap = new Map<number, number>();
  for (const s of seasonVals) {
    seasonMap.set(s, (seasonMap.get(s) ?? 0) + 1);
  }
  const seasonBuckets = [
    { label: '1 Season', count: seasonMap.get(1) ?? 0 },
    { label: '2 Seasons', count: seasonMap.get(2) ?? 0 },
    { label: '3 Seasons', count: seasonMap.get(3) ?? 0 },
    { label: '4 Seasons', count: seasonMap.get(4) ?? 0 },
    { label: '5 Seasons', count: seasonMap.get(5) ?? 0 },
    {
      label: '6+ Seasons',
      count: [...seasonMap.entries()].filter(([k]) => k >= 6).reduce((acc, [, v]) => acc + v, 0),
    },
  ].map((b) => ({
    ...b,
    sharePct: count > 0 ? Number(((b.count / count) * 100).toFixed(1)) : 0,
  }));

  const exactSeasonBreakdown = [...seasonMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([seasons, total]) => ({
      seasons: `${seasons} ${seasons === 1 ? 'Season' : 'Seasons'}`,
      seasonsNum: seasons,
      count: total,
      sharePct: count > 0 ? Number(((total / count) * 100).toFixed(1)) : 0,
    }));

  const longestRunningShows = [...shows]
    .filter((s) => (s.seasons_count ?? 0) >= 6)
    .sort((a, b) => (b.seasons_count ?? 0) - (a.seasons_count ?? 0))
    .slice(0, 10)
    .map((s) => ({
      show_id: s.show_id,
      title: s.title,
      country: s.primary_country,
      seasons: s.seasons_count ?? 0,
      release_year: s.release_year,
      rating: s.rating,
    }));

  return {
    totalShows: shows.length,
    avgSeasons,
    maxSeasons,
    singleSeasonCount,
    singleSeasonSharePct,
    multiSeasonCount,
    seasonBuckets,
    exactSeasonBreakdown,
    releaseTrends: computeReleaseTrends(shows, 1995),
    topGenres: computeTopGenres(shows, 10),
    ratings: computeRatingsDistribution(shows).byRating,
    longestRunningShows,
  };
}

export function computeCountryGenreComparison(records: NetflixRecord[], topC = 10, topG = 8) {
  const topCountries = computeTopCountries(records, topC).map((c) => c.name);
  const topGenres = computeTopGenres(records, topG).map((g) => g.name);

  // Co-production stats
  let multiCountryCount = 0;
  let singleCountryCount = 0;
  let unknownCountryCount = 0;

  for (const r of records) {
    if (r.country === 'Unknown' || r.countries.length === 0) {
      unknownCountryCount += 1;
    } else if (r.countries.length > 1) {
      multiCountryCount += 1;
    } else {
      singleCountryCount += 1;
    }
  }

  // Build matrix: Country -> { genre -> count }
  const matrix = topCountries.map((country) => {
    const countryRecords = records.filter((r) => r.countries.includes(country));
    const counts: Record<string, number> = {};
    for (const g of topGenres) {
      counts[g] = countryRecords.filter((r) => r.genres.includes(g)).length;
    }
    const movies = countryRecords.filter((r) => r.type === 'Movie').length;
    const tvShows = countryRecords.length - movies;
    return {
      country,
      total: countryRecords.length,
      movies,
      tvShows,
      counts,
    };
  });

  return {
    topCountries,
    topGenres,
    matrix,
    coProductionStats: {
      singleCountryCount,
      multiCountryCount,
      unknownCountryCount,
      coProductionRatePct:
        singleCountryCount + multiCountryCount > 0
          ? Number(((multiCountryCount / (singleCountryCount + multiCountryCount)) * 100).toFixed(1))
          : 0,
    },
  };
}

export function computeBusinessInsights(records: NetflixRecord[]): BusinessInsight[] {
  const total = Math.max(records.length, 1);
  const movies = records.filter((r) => r.type === 'Movie');
  const tvShows = records.filter((r) => r.type === 'TV Show');
  const moviePct = ((movies.length / total) * 100).toFixed(1);
  const tvPct = ((tvShows.length / total) * 100).toFixed(1);

  // 2. Addition growth & peak year
  const addedTrends = computeAddedTrends(records);
  const peakAdded = addedTrends.reduce(
    (best, cur) => (cur.total > best.total ? cur : best),
    { year: 0, total: 0, movies: 0, tvShows: 0 }
  );
  const y2016 = addedTrends.find((y) => y.year === 2016)?.total ?? 0;
  const y2021 = addedTrends.find((y) => y.year === 2021)?.total ?? 0;
  const growth2016ToPeak = y2016 > 0 ? (peakAdded.total / y2016).toFixed(1) : 'N/A';

  // 3. International footprint
  const knownCountryRecords = records.filter((r) => r.country !== 'Unknown');
  const usRecords = knownCountryRecords.filter((r) => r.countries.includes('United States'));
  const nonUsExclusive = knownCountryRecords.filter((r) => !r.countries.includes('United States'));
  const nonUsPct =
    knownCountryRecords.length > 0
      ? ((nonUsExclusive.length / knownCountryRecords.length) * 100).toFixed(1)
      : '0.0';
  const topCountries = computeTopCountries(records, 8);

  // 4. Mature vs Family rating skew
  const ratings = computeRatingsDistribution(records);
  const matureCount = ratings.byTier.find((t) => t.tier === 'Mature & Adult')?.total ?? 0;
  const kidsCount = ratings.byTier.find((t) => t.tier === 'Kids & Family')?.total ?? 0;
  const maturePct = ((matureCount / total) * 100).toFixed(1);
  const kidsPct = ((kidsCount / total) * 100).toFixed(1);

  // 5. Regional format specialization (India vs South Korea & Japan vs US)
  const regionalFormat = computeTopCountries(records, 6).map((c) => ({
    country: c.name,
    MovieShare: c.movieSharePct,
    TVShare: c.tvSharePct,
  }));
  const indiaStats = topCountries.find((c) => c.name === 'India');
  const skStats = topCountries.find((c) => c.name === 'South Korea');

  // 6. Single-season TV Show concentration
  const tvAnalytics = computeTvAnalytics(records);

  // 7. Movie duration clustering
  const movieAnalytics = computeMovieAnalytics(records);
  const standardFeatureBucket = movieAnalytics.durationDistribution.find((b) => b.bucket === '90–119 min');

  // 8. Release-to-platform lag (Movies vs TV Shows)
  let movieLagSum = 0;
  let movieLagCount = 0;
  let movieSameYear = 0;
  let tvLagSum = 0;
  let tvLagCount = 0;
  let tvSameYear = 0;

  for (const r of records) {
    if (!r.year_added || r.year_added < r.release_year) continue;
    const lag = r.year_added - r.release_year;
    if (r.type === 'Movie') {
      movieLagSum += lag;
      movieLagCount += 1;
      if (lag === 0) movieSameYear += 1;
    } else {
      tvLagSum += lag;
      tvLagCount += 1;
      if (lag === 0) tvSameYear += 1;
    }
  }
  const avgMovieLag = movieLagCount > 0 ? Number((movieLagSum / movieLagCount).toFixed(2)) : 0;
  const avgTvLag = tvLagCount > 0 ? Number((tvLagSum / tvLagCount).toFixed(2)) : 0;
  const movieSameYearPct = movieLagCount > 0 ? Number(((movieSameYear / movieLagCount) * 100).toFixed(1)) : 0;
  const tvSameYearPct = tvLagCount > 0 ? Number(((tvSameYear / tvLagCount) * 100).toFixed(1)) : 0;

  // 9. Monthly addition seasonality
  const seasonality = computeMonthlySeasonality(records);
  const peakMonth = seasonality.reduce(
    (best, cur) => (cur.total > best.total ? cur : best),
    { month: 'N/A', total: 0, movies: 0, tvShows: 0, monthNum: 0 }
  );
  const lowMonth = seasonality.reduce(
    (low, cur) => (cur.total < low.total ? cur : low),
    seasonality[0] ?? { month: 'N/A', total: 0, movies: 0, tvShows: 0, monthNum: 0 }
  );

  // 10. Top Genres Dominance
  const topGenres = computeTopGenres(records, 8);
  const topGenre = topGenres[0];

  return [
    {
      id: 'catalog-mix',
      number: '01',
      category: 'Catalog Architecture',
      title: 'Feature Films Anchor Volume While Series Anchor Retention',
      metricLabel: 'Movie vs TV Ratio',
      metricValue: `${moviePct}% / ${tvPct}%`,
      whatHappened: `Across ${records.length.toLocaleString()} cleaned titles, Movies account for ${movies.length.toLocaleString()} entries (${moviePct}%) compared to ${tvShows.length.toLocaleString()} TV Shows (${tvPct}%).`,
      whatItIndicates: `The catalog relies heavily on feature films for breadth and rapid genre coverage, giving subscribers more than 2.2x as many movie choices as serialized series.`,
      whyImportant: `Balancing one-off movie consumption with multi-hour episodic viewing directly governs subscriber churn and content acquisition ROI.`,
      chartType: 'bar',
      chartSeriesKeys: [
        { key: 'movies', label: 'Movies', color: '#E50914' },
        { key: 'tvShows', label: 'TV Shows', color: '#737373' },
      ],
      chartData: addedTrends.slice(-7).map((d) => ({
        name: String(d.year),
        movies: d.movies,
        tvShows: d.tvShows,
      })),
    },
    {
      id: 'growth-inflection',
      number: '02',
      category: 'Acquisition Velocity',
      title: `Catalog Expansion Peaked in ${peakAdded.year || 2019} Before Pandemic Slowdown`,
      metricLabel: `Peak Year (${peakAdded.year})`,
      metricValue: `${peakAdded.total.toLocaleString()} titles`,
      whatHappened: `Annual catalog additions surged ${growth2016ToPeak}x from ${y2016.toLocaleString()} titles in 2016 to a peak of ${peakAdded.total.toLocaleString()} titles in ${peakAdded.year}, before moderating to ${y2021.toLocaleString()} additions in 2021.`,
      whatItIndicates: `Aggressive global scaling defined 2017–2019, whereas 2020–2021 reflects COVID-19 production bottlenecks and more selective, higher-budget commissioning.`,
      whyImportant: `Acquisition teams must forecast release pipeline delays and diversify licensing partners to prevent subscriber content fatigue during production slowdowns.`,
      chartType: 'area',
      chartSeriesKeys: [{ key: 'total', label: 'Titles Added', color: '#E50914' }],
      chartData: addedTrends.map((d) => ({ name: String(d.year), total: d.total })),
    },
    {
      id: 'global-footprint',
      number: '03',
      category: 'Global Localization',
      title: 'Over Half of Known-Origin Titles Originate Outside the United States',
      metricLabel: 'Non-US Exclusive Share',
      metricValue: `${nonUsPct}%`,
      whatHappened: `Out of ${knownCountryRecords.length.toLocaleString()} titles with country metadata, ${nonUsExclusive.length.toLocaleString()} (${nonUsPct}%) have zero US production involvement, spanning ${computeOverviewMetrics(records).totalCountries} countries.`,
      whatItIndicates: `International growth is driven by local-language slates—led by India, the UK, Canada, France, Japan, and South Korea—rather than exporting Hollywood titles alone.`,
      whyImportant: `Regional hits frequently cross borders (such as Korean dramas and Spanish thrillers), offering superior cost-per-viewing-hour efficiency in global markets.`,
      chartType: 'horizontal-bar',
      chartSeriesKeys: [
        { key: 'movies', label: 'Movies', color: '#E50914' },
        { key: 'tvShows', label: 'TV Shows', color: '#A3A3A3' },
      ],
      chartData: topCountries.slice(0, 7).map((c) => ({
        name: c.name,
        movies: c.movies,
        tvShows: c.tvShows,
      })),
    },
    {
      id: 'mature-skew',
      number: '04',
      category: 'Audience Segmentation',
      title: 'Mature & Adult Content Dominates Nearly Half the Library',
      metricLabel: 'Mature Tier Share',
      metricValue: `${maturePct}%`,
      whatHappened: `TV-MA, R, and NC-17 titles total ${matureCount.toLocaleString()} (${maturePct}%), dramatically outpacing Kids & Family titles at ${kidsCount.toLocaleString()} (${kidsPct}%).`,
      whatItIndicates: `Catalog positioning heavily targets adult and young-adult demographics via prestige dramas, stand-up comedy, and true-crime docuseries.`,
      whyImportant: `Family households represent sticky, low-churn plans; under-indexing on kids programming leaves an opening for family-focused streaming competitors.`,
      chartType: 'bar',
      chartSeriesKeys: [{ key: 'total', label: 'Titles', color: '#E50914' }],
      chartData: ratings.byTier.map((t) => ({ name: t.tier, total: t.total })),
    },
    {
      id: 'regional-format',
      number: '05',
      category: 'Regional Strategy',
      title: 'India Heavily Favors Movies While South Korea & Japan Lead in Series',
      metricLabel: 'India vs S. Korea Movie %',
      metricValue: `${indiaStats?.movieSharePct ?? 0}% vs ${skStats?.movieSharePct ?? 0}%`,
      whatHappened: `Among major hubs, India's catalog is ${indiaStats?.movieSharePct ?? 0}% Movies (${indiaStats?.movies ?? 0} films vs ${indiaStats?.tvShows ?? 0} shows), whereas South Korea is ${skStats?.tvSharePct ?? 0}% TV Shows.`,
      whatItIndicates: `Content sourcing adapts to local viewing traditions—theatrical film pipelines in India versus serialized drama and anime ecosystems in East Asia.`,
      whyImportant: `Format-matched commissioning boosts regional relevance instead of forcing a uniform US series-first template onto every territory.`,
      chartType: 'bar',
      chartSeriesKeys: [
        { key: 'MovieShare', label: 'Movie %', color: '#E50914' },
        { key: 'TVShare', label: 'TV Show %', color: '#525252' },
      ],
      chartData: regionalFormat.map((r) => ({
        name: r.country,
        MovieShare: r.MovieShare,
        TVShare: r.TVShare,
      })),
    },
    {
      id: 'single-season-tv',
      number: '06',
      category: 'Series Lifecycle',
      title: 'Two-Thirds of TV Series Have Only a Single Season',
      metricLabel: '1-Season Share',
      metricValue: `${tvAnalytics.singleSeasonSharePct}%`,
      whatHappened: `${tvAnalytics.singleSeasonCount.toLocaleString()} out of ${tvAnalytics.totalShows.toLocaleString()} TV Shows (${tvAnalytics.singleSeasonSharePct}%) sit at exactly 1 season, with an average of ${tvAnalytics.avgSeasons} seasons per series.`,
      whatItIndicates: `High representation of limited miniseries, docuseries, newly debuted originals, and early-canceled series relative to long-running multi-season franchises.`,
      whyImportant: `Viewer frustration over unfinished 1-season shows can erode brand trust; clearly tagging Limited Series helps calibrate subscriber expectations.`,
      chartType: 'bar',
      chartSeriesKeys: [{ key: 'count', label: 'TV Shows', color: '#E50914' }],
      chartData: tvAnalytics.seasonBuckets.map((b) => ({ name: b.label, count: b.count })),
    },
    {
      id: 'duration-sweet-spot',
      number: '07',
      category: 'Runtime Economics',
      title: 'Feature Films Cluster Tightly Around a 98-Minute Median Runtime',
      metricLabel: 'Median / Mean Runtime',
      metricValue: `${movieAnalytics.medianMinutes} / ${movieAnalytics.avgMinutes} min`,
      whatHappened: `Movie runtimes average ${movieAnalytics.avgMinutes} minutes (median ${movieAnalytics.medianMinutes} min), with ${standardFeatureBucket?.sharePct ?? 0}% (${standardFeatureBucket?.count.toLocaleString() ?? 0} films) falling in the 90–119 minute bracket.`,
      whatItIndicates: `Viewer engagement and completion rates favor single-sitting feature lengths between 90 and 120 minutes, balanced by shorter stand-up specials and documentaries.`,
      whyImportant: `Understanding optimal runtime distributions supports recommendation ranking and pacing greenlights for original film slates.`,
      chartType: 'bar',
      chartSeriesKeys: [{ key: 'count', label: 'Movies', color: '#E50914' }],
      chartData: movieAnalytics.durationDistribution.map((b) => ({
        name: b.bucket,
        count: b.count,
      })),
    },
    {
      id: 'freshness-lag',
      number: '08',
      category: 'Licensing Lag',
      title: 'TV Shows Arrive Twice as Fast After Release as Licensed Movies',
      metricLabel: 'Same-Year TV vs Movie %',
      metricValue: `${tvSameYearPct}% vs ${movieSameYearPct}%`,
      whatHappened: `TV Shows average just ${avgTvLag} years between release and platform addition (${tvSameYearPct}% added in the exact release year), while Movies average ${avgMovieLag} years (${movieSameYearPct}% same-year).`,
      whatItIndicates: `Series strategy skews strongly toward day-and-date originals and current-season licensing, whereas the movie catalog incorporates deep theatrical back-catalog licensing.`,
      whyImportant: `Combining fresh original series with cost-effective legacy film libraries optimizes subscriber acquisition alongside back-catalog retention.`,
      chartType: 'bar',
      chartSeriesKeys: [
        { key: 'avgLagYears', label: 'Avg Lag (Years)', color: '#A3A3A3' },
        { key: 'sameYearPct', label: 'Same-Year %', color: '#E50914' },
      ],
      chartData: [
        { name: 'Movies', avgLagYears: avgMovieLag, sameYearPct: movieSameYearPct },
        { name: 'TV Shows', avgLagYears: avgTvLag, sameYearPct: tvSameYearPct },
      ],
    },
    {
      id: 'seasonal-cadence',
      number: '09',
      category: 'Release Cadence',
      title: `Monthly Additions Peak in ${peakMonth.month} (${peakMonth.total.toLocaleString()}) & Dip in ${lowMonth.month}`,
      metricLabel: `${peakMonth.month} vs ${lowMonth.month} Volume`,
      metricValue: `${peakMonth.total} vs ${lowMonth.total}`,
      whatHappened: `Catalog drops peak in ${peakMonth.month} (${peakMonth.total.toLocaleString()} titles) alongside strong Q3/Q4 activity (July, October, December), while ${lowMonth.month} sees the lowest additions (${lowMonth.total.toLocaleString()}).`,
      whatItIndicates: `Platform programming aligns major drops with mid-summer viewing peaks and Q4 holiday acquisition campaigns.`,
      whyImportant: `Scheduling flagship releases during high-intent viewing windows maximizes launch-week completion and lowers post-holiday churn.`,
      chartType: 'area',
      chartSeriesKeys: [
        { key: 'movies', label: 'Movies Added', color: '#E50914' },
        { key: 'tvShows', label: 'TV Shows Added', color: '#D4D4D4' },
      ],
      chartData: seasonality.map((m) => ({
        name: m.month,
        movies: m.movies,
        tvShows: m.tvShows,
      })),
    },
    {
      id: 'genre-concentration',
      number: '10',
      category: 'Genre Elasticity',
      title: `${topGenre?.name ?? 'International Movies'} & Dramas Lead Multi-Tag Discovery`,
      metricLabel: 'Top Genre Penetration',
      metricValue: `${topGenre?.sharePct ?? 0}%`,
      whatHappened: `Across ${computeOverviewMetrics(records).totalGenres} unique tags, '${topGenre?.name ?? 'International Movies'}' leads with ${topGenre?.total.toLocaleString() ?? 0} titles (${topGenre?.sharePct ?? 0}% of catalog), followed by Dramas and Comedies.`,
      whatItIndicates: `Multi-genre tagging concentrates discoverability around cross-border cinema, serialized dramas, and broad-appeal comedy rather than niche verticals.`,
      whyImportant: `High tag density enables finer recommendation clusters while highlighting underserved niche categories for targeted growth.`,
      chartType: 'horizontal-bar',
      chartSeriesKeys: [{ key: 'total', label: 'Titles', color: '#E50914' }],
      chartData: topGenres.slice(0, 7).map((g) => ({
        name: g.name,
        total: g.total,
      })),
    },
  ];
}

export function computeYearMonthHeatmap(records: NetflixRecord[], startYear = 2015) {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearMap = new Map<number, number[]>();

  for (const r of records) {
    if (!r.year_added || r.year_added < startYear || !r.month_added) continue;
    const arr = yearMap.get(r.year_added) ?? Array(12).fill(0);
    arr[r.month_added - 1] += 1;
    yearMap.set(r.year_added, arr);
  }

  const years = [...yearMap.keys()].sort((a, b) => a - b);
  let maxCell = 1;
  const rows = years.map((yr) => {
    const months = yearMap.get(yr) ?? Array(12).fill(0);
    const total = months.reduce((a, b) => a + b, 0);
    for (const v of months) {
      if (v > maxCell) maxCell = v;
    }
    return { year: yr, months, total };
  });

  return { monthLabels, rows, maxCell };
}

export function computeDecadeBreakdown(records: NetflixRecord[]) {
  const buckets = [
    { decade: 'Pre-1980', min: -Infinity, max: 1979, movies: 0, tvShows: 0, total: 0 },
    { decade: '1980s', min: 1980, max: 1989, movies: 0, tvShows: 0, total: 0 },
    { decade: '1990s', min: 1990, max: 1999, movies: 0, tvShows: 0, total: 0 },
    { decade: '2000s', min: 2000, max: 2009, movies: 0, tvShows: 0, total: 0 },
    { decade: '2010s', min: 2010, max: 2019, movies: 0, tvShows: 0, total: 0 },
    { decade: '2020–2021', min: 2020, max: 2029, movies: 0, tvShows: 0, total: 0 },
  ];

  for (const r of records) {
    const b = buckets.find((d) => r.release_year >= d.min && r.release_year <= d.max);
    if (!b) continue;
    b.total += 1;
    if (r.type === 'Movie') b.movies += 1;
    else b.tvShows += 1;
  }
  return buckets;
}

export function computeTopCast(records: NetflixRecord[], limit = 12) {
  const map = new Map<string, { name: string; total: number; movies: number; tvShows: number }>();
  for (const r of records) {
    if (!r.cast || r.cast === 'Not Specified') continue;
    const seenInRow = new Set<string>();
    for (const rawName of r.cast.split(',')) {
      const actor = rawName.trim();
      if (!actor || actor === 'Not Specified' || seenInRow.has(actor)) continue;
      seenInRow.add(actor);
      const entry = map.get(actor) ?? { name: actor, total: 0, movies: 0, tvShows: 0 };
      entry.total += 1;
      if (r.type === 'Movie') entry.movies += 1;
      else entry.tvShows += 1;
      map.set(actor, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}


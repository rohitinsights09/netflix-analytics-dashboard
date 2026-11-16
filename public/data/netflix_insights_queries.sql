-- ============================================================================
-- NETFLIX INSIGHTS — SQL ANALYTICS & BUSINESS INTELLIGENCE QUERIES
-- Created by Rohit Shinde
-- Compatible with SQLite 3 (run against cleaned netflix_titles dataset)
-- ============================================================================

-- 1. CATALOG OVERVIEW: TOTAL TITLES, MOVIES VS TV SHOWS & SHARE
SELECT
    COUNT(*) AS total_titles,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS total_movies,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS total_tv_shows,
    ROUND(100.0 * SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) / COUNT(*), 2) AS movie_share_pct,
    ROUND(100.0 * SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) / COUNT(*), 2) AS tv_show_share_pct,
    MIN(release_year) AS earliest_release_year,
    MAX(release_year) AS latest_release_year
FROM netflix_titles;

-- 2. TOP 15 GENRES BY TITLE COUNT & TYPE SPLIT
SELECT
    tg.genre,
    COUNT(*) AS total_titles,
    SUM(CASE WHEN nt.type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN nt.type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM netflix_titles), 2) AS catalog_penetration_pct
FROM title_genres tg
JOIN netflix_titles nt ON nt.show_id = tg.show_id
GROUP BY tg.genre
ORDER BY total_titles DESC
LIMIT 15;

-- 3. TOP 15 CONTENT-PRODUCING COUNTRIES (EXCLUDING UNKNOWN)
SELECT
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
LIMIT 15;

-- 4. CONTENT RELEASE YEAR TRENDS (1990 - 2021)
SELECT
    release_year,
    COUNT(*) AS total_released,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies_released,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows_released
FROM netflix_titles
WHERE release_year >= 1990
GROUP BY release_year
ORDER BY release_year ASC;

-- 5. CATALOG ADDITION TRENDS BY YEAR (DATE_ADDED)
SELECT
    year_added,
    COUNT(*) AS titles_added,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies_added,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows_added
FROM netflix_titles
WHERE year_added IS NOT NULL
GROUP BY year_added
ORDER BY year_added ASC;

-- 6. RATING DISTRIBUTION & AUDIENCE TIERS
SELECT
    rating,
    rating_tier,
    COUNT(*) AS total_titles,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM netflix_titles), 2) AS share_pct
FROM netflix_titles
GROUP BY rating, rating_tier
ORDER BY total_titles DESC;

-- 7. MOVIE DURATION SUMMARY & RUNTIME BUCKETS
SELECT
    COUNT(duration_minutes) AS movie_count,
    MIN(duration_minutes) AS min_minutes,
    MAX(duration_minutes) AS max_minutes,
    ROUND(AVG(duration_minutes), 2) AS avg_minutes
FROM netflix_titles
WHERE type = 'Movie' AND duration_minutes IS NOT NULL;

SELECT
    CASE
        WHEN duration_minutes < 60 THEN 'Under 60 min (Shorts & Specials)'
        WHEN duration_minutes BETWEEN 60 AND 89 THEN '60 - 89 min'
        WHEN duration_minutes BETWEEN 90 AND 119 THEN '90 - 119 min (Standard Feature)'
        WHEN duration_minutes BETWEEN 120 AND 149 THEN '120 - 149 min'
        ELSE '150+ min (Epics)'
    END AS duration_bucket,
    COUNT(*) AS movie_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM netflix_titles WHERE type = 'Movie'), 2) AS share_pct
FROM netflix_titles
WHERE type = 'Movie' AND duration_minutes IS NOT NULL
GROUP BY duration_bucket
ORDER BY MIN(duration_minutes);

-- 8. TV SHOW SEASON DISTRIBUTION
SELECT
    seasons_count,
    COUNT(*) AS show_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM netflix_titles WHERE type = 'TV Show'), 2) AS share_pct
FROM netflix_titles
WHERE type = 'TV Show' AND seasons_count IS NOT NULL
GROUP BY seasons_count
ORDER BY seasons_count ASC;

-- 9. TOP 15 DIRECTORS BY TITLE COUNT (EXCLUDING NOT SPECIFIED)
SELECT
    director,
    COUNT(*) AS total_titles,
    SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies,
    SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows
FROM netflix_titles
WHERE director <> 'Not Specified'
GROUP BY director
ORDER BY total_titles DESC
LIMIT 15;

-- 10. AVERAGE TIME LAG BETWEEN RELEASE YEAR AND PLATFORM ADDITION
SELECT
    type,
    COUNT(*) AS sample_size,
    ROUND(AVG(year_added - release_year), 2) AS avg_years_to_platform,
    SUM(CASE WHEN year_added = release_year THEN 1 ELSE 0 END) AS same_year_releases,
    ROUND(100.0 * SUM(CASE WHEN year_added = release_year THEN 1 ELSE 0 END) / COUNT(*), 2) AS same_year_pct
FROM netflix_titles
WHERE year_added IS NOT NULL AND year_added >= release_year
GROUP BY type;

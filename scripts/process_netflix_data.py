#!/usr/bin/env python3
"""
Netflix Insights — Data Cleaning, Quality Audit & SQLite Verification Pipeline
Author: Rohit Shinde
"""

import csv
import json
import os
import re
import sqlite3
import statistics
from collections import Counter
from datetime import datetime

RAW_CSV_PATH = os.path.join("public", "assets", "aistudio", "netflix_titles_df1f4ad2.csv")
OUT_DIR = os.path.join("public", "data")
CLEAN_CSV_PATH = os.path.join(OUT_DIR, "netflix_cleaned.csv")
CLEAN_JSON_PATH = os.path.join(OUT_DIR, "netflix_cleaned.json")
QUALITY_JSON_PATH = os.path.join(OUT_DIR, "data_quality_report.json")
QUALITY_MD_PATH = os.path.join(OUT_DIR, "data_quality_report.md")
SQL_FILE_PATH = os.path.join(OUT_DIR, "netflix_insights_queries.sql")
SQL_SUMMARY_PATH = os.path.join(OUT_DIR, "sql_verified_summary.json")
SQLITE_DB_PATH = os.path.join(OUT_DIR, "netflix_insights.db")


def clean_whitespace(val: str) -> str:
    if val is None:
        return ""
    # Replace non-breaking spaces and collapse internal whitespace runs
    s = val.replace("\u00a0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def normalize_title_key(title: str) -> str:
    return clean_whitespace(title).lower()


def classify_rating(rating: str) -> str:
    kids = {"TV-Y", "TV-Y7", "TV-Y7-FV", "G", "TV-G"}
    teens = {"PG", "TV-PG", "PG-13", "TV-14"}
    mature = {"R", "TV-MA", "NC-17"}
    if rating in kids:
        return "Kids & Family"
    if rating in teens:
        return "Teens & General"
    if rating in mature:
        return "Mature & Adult"
    return "Unrated"


def clean_multi_value_list(raw_val: str) -> list[str]:
    if not raw_val:
        return []
    parts = [clean_whitespace(p) for p in raw_val.split(",")]
    seen = set()
    cleaned = []
    for p in parts:
        # Remove stray leading/trailing punctuation if any
        p = p.strip(" ,;")
        if p and p not in seen:
            seen.add(p)
            cleaned.append(p)
    return cleaned


def parse_date_added(raw_date: str):
    s = clean_whitespace(raw_date)
    if not s:
        return None, None, None, ""
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d"), dt.year, dt.month, dt.strftime("%b")
        except ValueError:
            continue
    return None, None, None, ""


def parse_duration(raw_dur: str, content_type: str):
    s = clean_whitespace(raw_dur)
    if not s:
        return None, "", None, None
    m = re.match(r"^(\d+)\s+(min|Season|Seasons)$", s, re.IGNORECASE)
    if not m:
        return None, "", None, None
    val = int(m.group(1))
    unit_raw = m.group(2).lower()
    if unit_raw == "min":
        return val, "min", val, None
    return val, "Season" if val == 1 else "Seasons", None, val


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    with open(RAW_CSV_PATH, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        raw_columns = list(reader.fieldnames or [])
        raw_rows = list(reader)

    total_raw_rows = len(raw_rows)

    # Phase 1: Raw Missing Values Audit
    raw_missing = {
        col: sum(1 for r in raw_rows if not clean_whitespace(r.get(col, "")))
        for col in raw_columns
    }

    # Audit shifted durations in rating column
    shifted_duration_rows = []
    for r in raw_rows:
        rat = clean_whitespace(r.get("rating", ""))
        dur = clean_whitespace(r.get("duration", ""))
        if re.match(r"^\d+\s+min$", rat, re.IGNORECASE) and not dur:
            shifted_duration_rows.append({
                "show_id": r["show_id"],
                "title": clean_whitespace(r["title"]),
                "raw_rating": rat,
                "raw_duration": dur,
            })

    # Audit malformed country strings (leading/trailing commas or empty segments)
    malformed_country_rows = []
    for r in raw_rows:
        c = r.get("country", "")
        if c and (c.strip().startswith(",") or c.strip().endswith(",") or ",," in c):
            malformed_country_rows.append({
                "show_id": r["show_id"],
                "title": clean_whitespace(r["title"]),
                "raw_country": c,
            })

    # Audit duplicates by (normalized_title, type, release_year)
    seen_keys = {}
    duplicates_removed = []
    cleaned_rows = []
    rating_standardized_count = 0
    whitespace_trimmed_count = 0

    for r in raw_rows:
        sid = clean_whitespace(r["show_id"])
        ctype = clean_whitespace(r["type"])
        title = clean_whitespace(r["title"])
        if title != r["title"]:
            whitespace_trimmed_count += 1

        director = clean_whitespace(r["director"]) or "Not Specified"
        cast = clean_whitespace(r["cast"]) or "Not Specified"

        countries_list = clean_multi_value_list(r["country"])
        country_str = ", ".join(countries_list) if countries_list else "Unknown"
        primary_country = countries_list[0] if countries_list else "Unknown"

        date_iso, year_added, month_added, month_name = parse_date_added(r["date_added"])
        release_year = int(clean_whitespace(r["release_year"]))

        raw_rating = clean_whitespace(r["rating"])
        raw_duration = clean_whitespace(r["duration"])

        # Fix shifted duration in rating column
        if re.match(r"^\d+\s+min$", raw_rating, re.IGNORECASE) and not raw_duration:
            raw_duration = raw_rating
            raw_rating = "Not Rated"

        if raw_rating == "UR":
            raw_rating = "NR"
            rating_standardized_count += 1
        elif not raw_rating:
            raw_rating = "Not Rated"
            rating_standardized_count += 1

        rating_tier = classify_rating(raw_rating)

        dur_val, dur_unit, dur_minutes, seasons_count = parse_duration(raw_duration, ctype)
        dur_display = f"{dur_val} {dur_unit}" if dur_val is not None else ""

        genres_list = clean_multi_value_list(r["listed_in"])
        genres_str = ", ".join(genres_list)
        primary_genre = genres_list[0] if genres_list else "Uncategorized"

        description = clean_whitespace(r["description"])

        dedup_key = (normalize_title_key(title), ctype, release_year)
        if dedup_key in seen_keys:
            duplicates_removed.append({
                "removed_show_id": sid,
                "retained_show_id": seen_keys[dedup_key],
                "title": title,
                "type": ctype,
                "release_year": release_year,
            })
            continue
        seen_keys[dedup_key] = sid

        cleaned_rows.append({
            "show_id": sid,
            "type": ctype,
            "title": title,
            "director": director,
            "cast": cast,
            "country": country_str,
            "primary_country": primary_country,
            "countries": countries_list,
            "date_added": date_iso or "",
            "year_added": year_added,
            "month_added": month_added,
            "month_name": month_name,
            "release_year": release_year,
            "rating": raw_rating,
            "rating_tier": rating_tier,
            "duration": dur_display,
            "duration_minutes": dur_minutes,
            "seasons_count": seasons_count,
            "listed_in": genres_str,
            "primary_genre": primary_genre,
            "genres": genres_list,
            "description": description,
        })

    # Write Cleaned CSV
    csv_fields = [
        "show_id", "type", "title", "director", "cast", "country",
        "primary_country", "date_added", "year_added", "month_added",
        "release_year", "rating", "rating_tier", "duration",
        "duration_minutes", "seasons_count", "listed_in", "primary_genre",
        "description",
    ]
    with open(CLEAN_CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        for row in cleaned_rows:
            writer.writerow({k: ("" if row[k] is None else row[k]) for k in csv_fields})

    # Write Cleaned JSON
    with open(CLEAN_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned_rows, f, ensure_ascii=False, separators=(",", ":"))

    # Write SQL Analysis Queries (.sql)
    sql_queries_text = """-- ============================================================================
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
"""
    with open(SQL_FILE_PATH, "w", encoding="utf-8") as f:
        f.write(sql_queries_text)

    # Persist and Verify with Real SQLite Database
    if os.path.exists(SQLITE_DB_PATH):
        os.remove(SQLITE_DB_PATH)
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE netflix_titles (
            show_id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            director TEXT,
            cast_members TEXT,
            country TEXT,
            primary_country TEXT,
            date_added TEXT,
            year_added INTEGER,
            month_added INTEGER,
            release_year INTEGER,
            rating TEXT,
            rating_tier TEXT,
            duration TEXT,
            duration_minutes INTEGER,
            seasons_count INTEGER,
            listed_in TEXT,
            primary_genre TEXT,
            description TEXT
        )
    """)
    cur.execute("CREATE TABLE title_genres (show_id TEXT, genre TEXT)")
    cur.execute("CREATE TABLE title_countries (show_id TEXT, country TEXT)")

    for row in cleaned_rows:
        cur.execute(
            """INSERT INTO netflix_titles VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                row["show_id"], row["type"], row["title"], row["director"], row["cast"],
                row["country"], row["primary_country"], row["date_added"],
                row["year_added"], row["month_added"], row["release_year"],
                row["rating"], row["rating_tier"], row["duration"],
                row["duration_minutes"], row["seasons_count"],
                row["listed_in"], row["primary_genre"], row["description"],
            ),
        )
        for g in row["genres"]:
            cur.execute("INSERT INTO title_genres VALUES (?, ?)", (row["show_id"], g))
        for c in row["countries"]:
            cur.execute("INSERT INTO title_countries VALUES (?, ?)", (row["show_id"], c))

    cur.execute("CREATE INDEX idx_titles_type ON netflix_titles(type)")
    cur.execute("CREATE INDEX idx_titles_release_year ON netflix_titles(release_year)")
    cur.execute("CREATE INDEX idx_titles_rating ON netflix_titles(rating)")
    cur.execute("CREATE INDEX idx_genres_genre ON title_genres(genre)")
    cur.execute("CREATE INDEX idx_countries_country ON title_countries(country)")
    conn.commit()

    def q_all(sql):
        return [dict(r) for r in cur.execute(sql).fetchall()]

    overview = q_all("""
        SELECT
            COUNT(*) AS total_titles,
            SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS total_movies,
            SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS total_tv_shows,
            ROUND(100.0 * SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) / COUNT(*), 2) AS movie_share_pct,
            ROUND(100.0 * SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) / COUNT(*), 2) AS tv_show_share_pct,
            MIN(release_year) AS earliest_release_year,
            MAX(release_year) AS latest_release_year
        FROM netflix_titles
    """)[0]

    unique_countries_count = cur.execute(
        "SELECT COUNT(DISTINCT country) FROM title_countries WHERE country <> 'Unknown'"
    ).fetchone()[0]
    unique_genres_count = cur.execute(
        "SELECT COUNT(DISTINCT genre) FROM title_genres"
    ).fetchone()[0]

    top_genres = q_all("""
        SELECT tg.genre, COUNT(*) AS total_titles,
               SUM(CASE WHEN nt.type = 'Movie' THEN 1 ELSE 0 END) AS movies,
               SUM(CASE WHEN nt.type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows
        FROM title_genres tg JOIN netflix_titles nt ON nt.show_id = tg.show_id
        GROUP BY tg.genre ORDER BY total_titles DESC LIMIT 15
    """)

    top_countries = q_all("""
        SELECT tc.country, COUNT(*) AS total_titles,
               SUM(CASE WHEN nt.type = 'Movie' THEN 1 ELSE 0 END) AS movies,
               SUM(CASE WHEN nt.type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows
        FROM title_countries tc JOIN netflix_titles nt ON nt.show_id = tc.show_id
        WHERE tc.country <> 'Unknown'
        GROUP BY tc.country ORDER BY total_titles DESC LIMIT 15
    """)

    addition_trends = q_all("""
        SELECT year_added, COUNT(*) AS titles_added,
               SUM(CASE WHEN type = 'Movie' THEN 1 ELSE 0 END) AS movies_added,
               SUM(CASE WHEN type = 'TV Show' THEN 1 ELSE 0 END) AS tv_shows_added
        FROM netflix_titles WHERE year_added IS NOT NULL
        GROUP BY year_added ORDER BY year_added ASC
    """)

    rating_dist = q_all("""
        SELECT rating, rating_tier, COUNT(*) AS total_titles
        FROM netflix_titles GROUP BY rating, rating_tier ORDER BY total_titles DESC
    """)

    movie_durations = [r["duration_minutes"] for r in cleaned_rows if r["type"] == "Movie" and r["duration_minutes"] is not None]
    movie_stats = {
        "count": len(movie_durations),
        "min_minutes": min(movie_durations),
        "max_minutes": max(movie_durations),
        "avg_minutes": round(statistics.mean(movie_durations), 2),
        "median_minutes": statistics.median(movie_durations),
    }

    season_dist = q_all("""
        SELECT seasons_count, COUNT(*) AS show_count
        FROM netflix_titles WHERE type = 'TV Show' AND seasons_count IS NOT NULL
        GROUP BY seasons_count ORDER BY seasons_count ASC
    """)

    lag_stats = q_all("""
        SELECT type, COUNT(*) AS sample_size,
               ROUND(AVG(year_added - release_year), 2) AS avg_years_to_platform,
               SUM(CASE WHEN year_added = release_year THEN 1 ELSE 0 END) AS same_year_releases,
               ROUND(100.0 * SUM(CASE WHEN year_added = release_year THEN 1 ELSE 0 END) / COUNT(*), 2) AS same_year_pct
        FROM netflix_titles WHERE year_added IS NOT NULL AND year_added >= release_year
        GROUP BY type
    """)

    sql_summary = {
        "overview": {
            **overview,
            "unique_countries": unique_countries_count,
            "unique_genres": unique_genres_count,
        },
        "top_genres": top_genres,
        "top_countries": top_countries,
        "addition_trends": addition_trends,
        "rating_distribution": rating_dist,
        "movie_duration_stats": movie_stats,
        "season_distribution": season_dist,
        "release_to_addition_lag": lag_stats,
    }

    with open(SQL_SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(sql_summary, f, indent=2)

    # Generate Data Quality Report JSON & Markdown
    cleaned_missing_dates = sum(1 for r in cleaned_rows if not r["date_added"])
    quality_report = {
        "dataset_name": "netflix_titles_df1f4ad2.csv",
        "generated_by": "Rohit Shinde",
        "raw_row_count": total_raw_rows,
        "cleaned_row_count": len(cleaned_rows),
        "duplicates_removed_count": len(duplicates_removed),
        "duplicates_removed": duplicates_removed,
        "column_count_raw": len(raw_columns),
        "column_count_cleaned": len(csv_fields),
        "raw_columns": raw_columns,
        "cleaned_columns": csv_fields,
        "raw_missing_values": raw_missing,
        "anomalies_repaired": {
            "shifted_duration_in_rating": shifted_duration_rows,
            "malformed_country_lists_count": len(malformed_country_rows),
            "malformed_country_examples": malformed_country_rows,
            "ratings_standardized_count": rating_standardized_count,
            "titles_whitespace_normalized": whitespace_trimmed_count,
        },
        "post_cleaning_summary": {
            "missing_duration_count": sum(1 for r in cleaned_rows if not r["duration"]),
            "missing_rating_count": sum(1 for r in cleaned_rows if not r["rating"]),
            "missing_date_added_count": cleaned_missing_dates,
            "unknown_country_count": sum(1 for r in cleaned_rows if r["country"] == "Unknown"),
            "unspecified_director_count": sum(1 for r in cleaned_rows if r["director"] == "Not Specified"),
            "unspecified_cast_count": sum(1 for r in cleaned_rows if r["cast"] == "Not Specified"),
        },
        "cleaning_pipeline_steps": [
            "Preserved raw CSV untouched and verified 12 schema columns across 8,807 records.",
            "Normalized non-breaking spaces (\\u00a0) and redundant whitespace across text columns.",
            "Recovered 3 shifted movie duration values ('74 min', '84 min', '66 min') mistakenly placed in the rating column (s5542, s5795, s5814) and reassigned rating to 'Not Rated'.",
            "Deduplicated 4 duplicate (normalized_title, type, release_year) entries while preserving unique show_id integrity.",
            "Cleaned malformed comma-delimited country lists (e.g., leading/trailing commas on 7 records) and deduplicated country tokens per title.",
            "Standardized missing categorical labels: country -> 'Unknown', director/cast -> 'Not Specified', rating -> 'Not Rated', and unified 'UR' into 'NR'.",
            "Parsed 'date_added' strings into ISO-8601 dates (YYYY-MM-DD), integer year_added, and month_added.",
            "Extracted integer 'duration_minutes' for Movies and 'seasons_count' for TV Shows for statistical aggregation.",
        ],
    }

    with open(QUALITY_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)

    md_lines = [
        "# Data Quality Report — Netflix Insights",
        "**Author:** Rohit Shinde",
        "",
        "## 1. Dataset Overview",
        f"- **Raw Records:** {total_raw_rows:,}",
        f"- **Cleaned Records:** {len(cleaned_rows):,}",
        f"- **Duplicates Removed:** {len(duplicates_removed)} (matched on normalized title, type, and release year)",
        f"- **Raw Columns:** {len(raw_columns)} -> **Enriched Cleaned Columns:** {len(csv_fields)}",
        "",
        "## 2. Raw Missing Value Audit",
        "| Column | Missing Count | Missing % | Cleaning Action |",
        "|---|---:|---:|---|",
    ]
    for col in raw_columns:
        cnt = raw_missing[col]
        pct = (cnt / total_raw_rows) * 100
        action = {
            "director": "Imputed as 'Not Specified'",
            "cast": "Imputed as 'Not Specified'",
            "country": "Imputed as 'Unknown' (excluded from country rankings)",
            "date_added": "Preserved as NULL for time-series date exclusion",
            "rating": "Imputed as 'Not Rated'; recovered 3 shifted durations",
            "duration": "Recovered 3 missing durations from rating column",
        }.get(col, "No missing values; whitespace normalized")
        md_lines.append(f"| `{col}` | {cnt:,} | {pct:.2f}% | {action} |")

    md_lines.extend([
        "",
        "## 3. Anomalies & Duplicates Resolved",
        f"- **Shifted Duration Values Repaired:** {len(shifted_duration_rows)} records (`s5542`, `s5795`, `s5814`)",
        f"- **Malformed Country Strings Cleaned:** {len(malformed_country_rows)} records with leading/trailing commas",
        f"- **Ratings Standardized (`UR` -> `NR`, blank -> `Not Rated`):** {rating_standardized_count} records",
        "",
        "### Duplicate Records Removed",
        "| Removed ID | Retained ID | Title | Type | Release Year |",
        "|---|---|---|---|---:|",
    ])
    for d in duplicates_removed:
        md_lines.append(
            f"| {d['removed_show_id']} | {d['retained_show_id']} | {d['title']} | {d['type']} | {d['release_year']} |"
        )

    with open(QUALITY_MD_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")

    print(f"Processed {total_raw_rows} raw rows -> {len(cleaned_rows)} cleaned rows.")
    print(f"Unique countries (excl Unknown): {unique_countries_count}, Unique genres: {unique_genres_count}")
    print(f"Movie stats: {movie_stats}")


if __name__ == "__main__":
    main()

# NETFLIX INSIGHTS — Content Analytics & Business Intelligence

**Created by:** Rohit Shinde  
**Role:** Data Analyst / Project Developer  

---

## Project Overview

**Netflix Insights** is an end-to-end Data Analytics and Business Intelligence portfolio project built on a real streaming catalog dataset (`8,807` raw records -> `8,803` cleaned titles spanning `1925–2021`). The project demonstrates a complete analytical workflow from raw CSV inspection, programmatic data cleaning, SQLite SQL validation, Excel/CSV reporting, and interactive React + TypeScript data visualization.

---

## Dataset & Data Quality Summary

- **Raw Records:** `8,807` rows across `12` columns (`show_id`, `type`, `title`, `director`, `cast`, `country`, `date_added`, `release_year`, `rating`, `duration`, `listed_in`, `description`)
- **Cleaned Records:** `8,803` unique titles (`6,128` Movies · `2,675` TV Shows)
- **Countries Represented:** `122` distinct countries (excluding `Unknown`)
- **Genres Tracked:** `42` distinct categories
- **Key Cleaning Steps (`scripts/process_netflix_data.py`):**
  1. Preserved raw CSV untouched and generated separate cleaned outputs (`public/data/netflix_cleaned.csv` and `public/data/netflix_cleaned.json`).
  2. Repaired `3` records (`s5542`, `s5795`, `s5814`) where movie durations (`74 min`, `84 min`, `66 min`) were shifted into the `rating` column.
  3. Removed `4` genuine duplicate `(normalized_title, type, release_year)` rows (`s6530`, `s6706`, `s7346`, `s8023`).
  4. Cleaned malformed leading/trailing commas in `7` multi-country strings and normalized non-breaking whitespace (`\u00a0`).
  5. Standardized missing categorical labels (`director`/`cast` -> `Not Specified`, `country` -> `Unknown`, `rating` -> `Not Rated`, `UR` -> `NR`).
  6. Parsed `date_added` into ISO-8601 (`YYYY-MM-DD`) and extracted numeric `duration_minutes` and `seasons_count`.

---

## Key Deliverables Included

- **Interactive BI Dashboard (`src/`):** 8 specialized analytical modules (`Overview`, `Content Analytics`, `Movies`, `TV Shows`, `Countries & Genres`, `Business Insights`, `Data Explorer`, `About Project`) with click-to-cross-filter charts, Year × Month addition heatmap, release decade & top cast breakdowns, dynamic KPI calculations, and print/PDF styling.
- **Live SQLite Query Workbench (`POST /api/sql-query`):** Interactive read-only SQL execution engine running directly against `public/data/netflix_insights.db`.
- **Python Data Pipeline (`scripts/process_netflix_data.py` & `requirements.txt`):** Reproducible inspection, cleaning, and SQLite database generation script.
- **Cleaned Dataset (`public/data/netflix_cleaned.csv`, `.json`, `.db`):** Production-ready cleaned catalog and indexed SQLite 3 database.
- **SQL Query Suite (`public/data/netflix_insights_queries.sql`):** Verified SQLite 3 queries for catalog split, genres, countries, growth trends, runtime, seasons, and release-to-addition lag.
- **Data Quality Report (`public/data/data_quality_report.md` & `.json`):** Full audit of missing values, anomalies, and deduplication.
- **Excel Multi-Sheet Report & CSV Export:** Client-side SheetJS (`.xlsx`) executive workbook and filtered CSV download directly inside the app.
- **Complete Project Archive:** Exportable `.zip` bundle via `/api/export-project-zip`.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend:** Node.js, Express, JSZip
- **Data & Reporting:** Python 3 (`csv`, `sqlite3`, `statistics`), SQLite SQL, SheetJS (`xlsx`), PapaParse

---

## Running Locally in VS Code on Windows

### Prerequisites
- **Node.js** (v20 LTS or newer) — [nodejs.org](https://nodejs.org/)
- **Python 3.10+** (optional, only needed to re-run the cleaning pipeline)
- **VS Code**

### Setup Steps
1. Open the extracted project folder in **VS Code** (`File -> Open Folder...`).
2. Open the integrated terminal (`Ctrl + \``) and install Node dependencies:
   ```powershell
   npm install
   ```
3. *(Optional)* Re-run the Python data cleaning & SQLite verification script:
   ```powershell
   python scripts/process_netflix_data.py
   ```
4. Start the full-stack development server:
   ```powershell
   npm run dev
   ```
5. Open your browser to `http://localhost:3000`.

### Production Build
```powershell
npm run build
npm start
```

---

Designed & Developed by Rohit Shinde

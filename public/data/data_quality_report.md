# Data Quality Report — Netflix Insights
**Author:** Rohit Shinde

## 1. Dataset Overview
- **Raw Records:** 8,807
- **Cleaned Records:** 8,803
- **Duplicates Removed:** 4 (matched on normalized title, type, and release year)
- **Raw Columns:** 12 -> **Enriched Cleaned Columns:** 19

## 2. Raw Missing Value Audit
| Column | Missing Count | Missing % | Cleaning Action |
|---|---:|---:|---|
| `show_id` | 0 | 0.00% | No missing values; whitespace normalized |
| `type` | 0 | 0.00% | No missing values; whitespace normalized |
| `title` | 0 | 0.00% | No missing values; whitespace normalized |
| `director` | 2,634 | 29.91% | Imputed as 'Not Specified' |
| `cast` | 825 | 9.37% | Imputed as 'Not Specified' |
| `country` | 831 | 9.44% | Imputed as 'Unknown' (excluded from country rankings) |
| `date_added` | 10 | 0.11% | Preserved as NULL for time-series date exclusion |
| `release_year` | 0 | 0.00% | No missing values; whitespace normalized |
| `rating` | 4 | 0.05% | Imputed as 'Not Rated'; recovered 3 shifted durations |
| `duration` | 3 | 0.03% | Recovered 3 missing durations from rating column |
| `listed_in` | 0 | 0.00% | No missing values; whitespace normalized |
| `description` | 0 | 0.00% | No missing values; whitespace normalized |

## 3. Anomalies & Duplicates Resolved
- **Shifted Duration Values Repaired:** 3 records (`s5542`, `s5795`, `s5814`)
- **Malformed Country Strings Cleaned:** 7 records with leading/trailing commas
- **Ratings Standardized (`UR` -> `NR`, blank -> `Not Rated`):** 7 records

### Duplicate Records Removed
| Removed ID | Retained ID | Title | Type | Release Year |
|---|---|---|---|---:|
| s6530 | s3372 | Consequences | Movie | 2014 |
| s6706 | s304 | Esperando La Carroza | Movie | 1985 |
| s7346 | s160 | Love In A Puff | Movie | 2010 |
| s8023 | s1271 | Sin Senos sí Hay Paraíso | TV Show | 2018 |

export type ContentTypeFilter = 'All' | 'Movie' | 'TV Show';

export type PageId =
  | 'overview'
  | 'content'
  | 'movies'
  | 'tvshows'
  | 'countries-genres'
  | 'insights'
  | 'explorer'
  | 'about';

export interface NetflixRecord {
  show_id: string;
  type: 'Movie' | 'TV Show';
  title: string;
  director: string;
  cast: string;
  country: string;
  primary_country: string;
  countries: string[];
  date_added: string;
  year_added: number | null;
  month_added: number | null;
  month_name: string;
  release_year: number;
  rating: string;
  rating_tier: string;
  duration: string;
  duration_minutes: number | null;
  seasons_count: number | null;
  listed_in: string;
  primary_genre: string;
  genres: string[];
  description: string;
}

export interface FilterState {
  type: ContentTypeFilter;
  country: string;
  genre: string;
  rating: string;
  yearMin: number;
  yearMax: number;
  search: string;
}

export interface DuplicateRemovedEntry {
  removed_show_id: string;
  retained_show_id: string;
  title: string;
  type: string;
  release_year: number;
}

export interface ShiftedDurationEntry {
  show_id: string;
  title: string;
  raw_rating: string;
  raw_duration: string;
}

export interface DataQualityReport {
  dataset_name: string;
  generated_by: string;
  raw_row_count: number;
  cleaned_row_count: number;
  duplicates_removed_count: number;
  duplicates_removed: DuplicateRemovedEntry[];
  column_count_raw: number;
  column_count_cleaned: number;
  raw_columns: string[];
  cleaned_columns: string[];
  raw_missing_values: Record<string, number>;
  anomalies_repaired: {
    shifted_duration_in_rating: ShiftedDurationEntry[];
    malformed_country_lists_count: number;
    malformed_country_examples: Array<{
      show_id: string;
      title: string;
      raw_country: string;
    }>;
    ratings_standardized_count: number;
    titles_whitespace_normalized: number;
  };
  post_cleaning_summary: {
    missing_duration_count: number;
    missing_rating_count: number;
    missing_date_added_count: number;
    unknown_country_count: number;
    unspecified_director_count: number;
    unspecified_cast_count: number;
  };
  cleaning_pipeline_steps: string[];
}

export interface BusinessInsight {
  id: string;
  number: string;
  category: string;
  title: string;
  metricLabel: string;
  metricValue: string;
  whatHappened: string;
  whatItIndicates: string;
  whyImportant: string;
  chartType: 'bar' | 'area' | 'horizontal-bar';
  chartSeriesKeys: Array<{ key: string; label: string; color: string }>;
  chartData: Array<Record<string, string | number>>;
}

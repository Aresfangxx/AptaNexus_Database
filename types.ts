
export type Language = 'en' | 'cn';

export interface ContentText {
  hero: {
    title: string;
    subtitle: string[];
    timeline: { year: string; event: string }[];
  };
  mission: {
    title: string;
    body: string;
  };
  search: {
    title: string;
    placeholder: string;
    buttons: string[];
    hints: string[];
  };
  stats: {
    items: { value: string; label: string }[];
    footer: string;
  };
  education: {
    title: string;
    body: string;
  };
  ai: {
    title: string;
    body: string;
  };
  history: {
    items: { year: string; title: string }[];
  };
}

// --- DATA STRUCTURES ---

// Represents a single line in APTAMERS.enriched.jsonl
export interface AptamerRecord {
  // Article Info
  article_title: string;
  year: number;
  journal: string;
  doi: string;

  // Target Info
  target_name: string;
  target_type: string;
  gene_symbol?: string;
  external_id?: string;
  external_name?: string;
  id_type?: string;

  // Aptamer Info
  sequence_id: string; // Author's name
  aptamer_sequence: string;

  // Affinity
  pKd?: number; // Can be null/undefined
  affinity?: string; // Original string (e.g. "50 nM")
  buffer_condition?: string;
  best?: boolean;

  // Quality
  level: 'P' | 'A' | 'B' | 'C';
}

// Represents the aggregated view for a single Target Card
export interface TargetGroup {
  target_name: string;
  target_type: string;
  gene_symbol?: string;
  
  // Stats
  total_aptamers: number;
  count_P: number;
  count_A: number;
  count_B: number;
  count_C: number;
  year_min: number;
  year_max: number;

  // The actual records (kept for "View All" or internal logic)
  records: AptamerRecord[];

  // The subset to display in the card preview
  preview_records: AptamerRecord[];
  preview_type: 'P' | 'A' | 'BC'; // Which level are we showing?
}

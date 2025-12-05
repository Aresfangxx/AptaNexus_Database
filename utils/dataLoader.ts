
import { AptamerRecord, TargetGroup } from '../types';

// Singleton cache for loaded data
let cachedRecords: AptamerRecord[] | null = null;

// Fallback data
const MOCK_DATA_SOURCE: any[] = [
  { "Target name": "VEGF165", "Target type": "Protein", "Gene_Symbol": "VEGFA", "Year": "2010", "Level": "P", "pKd": 9.2, "Affinity": "0.6 nM", "Sequence ID": "V7t1", "Aptamer sequence": "CCGGTGGGTGGGTGGGGGGGTGCGG", "Best": true, "Article title": "Mock Article 1", "Journal": "JACS" },
  { "Target name": "Thrombin", "Target type": "Protein", "Gene_Symbol": "F2", "Year": "1992", "Level": "P", "pKd": 9.0, "Affinity": "1 nM", "Sequence ID": "TBA", "Aptamer sequence": "GGTTGGTGTGGTTGG", "Best": true, "Article title": "Thrombin Binding Aptamer", "Journal": "Nature" },
  { "Target name": "ATP", "Target type": "Small Molecule", "Year": "1995", "Level": "P", "pKd": 6.0, "Affinity": "1 uM", "Sequence ID": "ATP-40", "Aptamer sequence": "ACCTGGGGGAGTAT", "Best": true, "Article title": "Classic ATP", "Journal": "Chemistry" },
];

/**
 * Loads and parses the raw data once. Returns the cached array.
 */
async function loadRawData(): Promise<AptamerRecord[]> {
  if (cachedRecords) return cachedRecords;

  let rawList: any[] = [];
  try {
    const response = await fetch('/APTAMERS.jsonl');
    if (!response.ok) throw new Error("File fetch failed");
    const text = await response.text();
    rawList = text.trim().split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    console.log(`Parsed ${rawList.length} lines from file.`);
  } catch (e) {
    console.warn("Using mock data due to load error:", e);
    rawList = MOCK_DATA_SOURCE;
  }

  // Process and Map
  cachedRecords = rawList.map((raw, index) => {
    // Generate a unique ID if one isn't present. Using index as simple fallback.
    const internal_id = `apt-${index}-${Date.now().toString(36)}`;

    const record: AptamerRecord = {
      internal_id,
      article_title: raw["Article title"] || "Unknown Title",
      year: parseInt(raw["Year"]) || 0,
      journal: raw["Journal"] || "",
      doi: raw["Doi"] || "",

      target_name: raw["Target name"] || "Unknown Target",
      target_type: raw["Target type"] || "Unknown Type",
      gene_symbol: raw["Gene_Symbol"] || "", // Original data key often has underscore
      external_id: raw["External_ID"],
      external_name: raw["External_Name"],
      id_type: raw["ID_Type"],

      sequence_id: raw["Sequence ID"] || "Unnamed",
      aptamer_sequence: raw["Aptamer sequence"] || "",
      secstr_image: raw["SecStr_image"],
      secstr_dotbracket: raw["SecStr_dotbracket"],
      mfe: raw["MFE"] !== undefined ? Number(raw["MFE"]) : undefined,

      pKd: raw["pKd"] ? parseFloat(raw["pKd"]) : undefined,
      affinity: raw["Affinity"] || "",
      buffer_condition: raw["Buffer condition"] || "",
      best: raw["Best"] === true,

      level: raw["Level"] || "C"
    };
    return record;
  });

  return cachedRecords!;
}

/**
 * Searches and Aggregates data for the Search Results Page
 */
export async function fetchAndProcessData(query: string): Promise<TargetGroup[]> {
  const records = await loadRawData();
  const lowerQuery = query.toLowerCase().trim();

  // 1. Filter
  const filtered = records.filter(r => {
    return (r.target_name || "").toLowerCase().includes(lowerQuery) || 
           (r.gene_symbol || "").toLowerCase().includes(lowerQuery) || 
           (r.aptamer_sequence || "").toLowerCase().includes(lowerQuery) ||
           (r.sequence_id || "").toLowerCase().includes(lowerQuery);
  });

  // 2. Aggregate
  const map = new Map<string, AptamerRecord[]>();
  filtered.forEach(r => {
    const key = r.target_name || "Unknown Target";
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(r);
  });

  // 3. Build Groups
  const groups: TargetGroup[] = [];
  map.forEach((recs, targetName) => {
    const pRecs = recs.filter(r => r.level === 'P');
    const aRecs = recs.filter(r => r.level === 'A');
    const bRecs = recs.filter(r => r.level === 'B');
    const cRecs = recs.filter(r => r.level === 'C');
    
    const years = recs.map(r => r.year).filter(y => y > 0);
    const yearMin = years.length > 0 ? Math.min(...years) : 0;
    const yearMax = years.length > 0 ? Math.max(...years) : 0;

    // Preview Logic
    let previewRecords: AptamerRecord[] = [];
    let previewType: 'P' | 'A' | 'BC' = 'BC';

    if (pRecs.length > 0) {
      previewType = 'P';
      previewRecords = pRecs.sort((a, b) => (b.pKd || 0) - (a.pKd || 0)).slice(0, 5);
    } else if (aRecs.length > 0) {
      previewType = 'A';
      previewRecords = aRecs.sort((a, b) => (b.pKd || 0) - (a.pKd || 0)).slice(0, 5);
    } else {
      previewType = 'BC';
      previewRecords = [...bRecs, ...cRecs].sort((a, b) => b.year - a.year).slice(0, 3);
    }

    groups.push({
      target_name: targetName,
      target_type: recs[0].target_type,
      gene_symbol: recs[0].gene_symbol,
      total_aptamers: recs.length,
      count_P: pRecs.length,
      count_A: aRecs.length,
      count_B: bRecs.length,
      count_C: cRecs.length,
      year_min: yearMin,
      year_max: yearMax,
      records: recs,
      preview_records: previewRecords,
      preview_type: previewType
    });
  });

  return groups.sort((a, b) => b.total_aptamers - a.total_aptamers);
}

/**
 * Fetches a specific target's full aggregated data
 */
export async function fetchTargetByName(name: string): Promise<TargetGroup | null> {
  const records = await loadRawData();
  const targetRecords = records.filter(r => r.target_name === name);

  if (targetRecords.length === 0) return null;

  // Reuse logic or simplify for single group
  const recs = targetRecords;
  const pRecs = recs.filter(r => r.level === 'P');
  const aRecs = recs.filter(r => r.level === 'A');
  const bRecs = recs.filter(r => r.level === 'B');
  const cRecs = recs.filter(r => r.level === 'C');
  const years = recs.map(r => r.year).filter(y => y > 0);

  // We don't strictly need preview logic here as we show all, but we populate it for consistency
  return {
    target_name: name,
    target_type: recs[0].target_type,
    gene_symbol: recs[0].gene_symbol,
    total_aptamers: recs.length,
    count_P: pRecs.length,
    count_A: aRecs.length,
    count_B: bRecs.length,
    count_C: cRecs.length,
    year_min: years.length ? Math.min(...years) : 0,
    year_max: years.length ? Math.max(...years) : 0,
    records: recs, // All records
    preview_records: [],
    preview_type: 'BC'
  };
}

/**
 * Fetches a single aptamer record by its internal unique ID
 */
export async function fetchAptamerById(id: string): Promise<AptamerRecord | null> {
  const records = await loadRawData();
  return records.find(r => r.internal_id === id) || null;
}

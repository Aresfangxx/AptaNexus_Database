
import { AptamerRecord, TargetGroup } from '../types';

// Fallback data in case the file fetch fails completely (network error)
const MOCK_DATA: AptamerRecord[] = [
  { target_name: "VEGF165", target_type: "Protein", gene_symbol: "VEGFA", year: 2010, level: 'P', pKd: 9.2, affinity: "0.6 nM", sequence_id: "V7t1", aptamer_sequence: "CCGGTGGGTGGGTGGGGGGGTGCGG", best: true, article_title: "Mock Article 1", journal: "JACS", doi: "" },
  { target_name: "Thrombin", target_type: "Protein", gene_symbol: "F2", year: 1992, level: 'P', pKd: 9.0, affinity: "1 nM", sequence_id: "TBA", aptamer_sequence: "GGTTGGTGTGGTTGG", best: true, article_title: "Thrombin Binding Aptamer", journal: "Nature", doi: "" },
  { target_name: "ATP", target_type: "Small Molecule", year: 1995, level: 'P', pKd: 6.0, affinity: "1 uM", sequence_id: "ATP-40", aptamer_sequence: "ACCTGGGGGAGTAT", best: true, article_title: "Classic ATP", journal: "Chemistry", doi: "" },
];

export async function fetchAndProcessData(query: string): Promise<TargetGroup[]> {
  let rawData: AptamerRecord[] = [];

  try {
    // UPDATED: Fetch from the user's uploaded file APTAMERS.jsonl
    const response = await fetch('/APTAMERS.jsonl');
    
    if (!response.ok) {
        console.warn(`File fetch failed: ${response.status} ${response.statusText}`);
        throw new Error("File not found");
    }
    
    const text = await response.text();
    
    // Parse JSONL line by line
    rawData = text.trim().split('\n').map(line => {
        try { 
            const record = JSON.parse(line);
            // Data Cleaning: Ensure pKd is a number if it exists
            if (record.pKd && typeof record.pKd === 'string') {
                record.pKd = parseFloat(record.pKd);
            }
            return record; 
        } catch(e) { 
            return null; 
        }
    }).filter(x => x !== null) as AptamerRecord[];

    console.log(`Loaded ${rawData.length} records.`);
    
  } catch (err) {
    console.error("Could not load APTAMERS.jsonl, falling back to mock data.", err);
    rawData = MOCK_DATA;
  }

  // 1. Filter by Query (Fuzzy on Target Name, Gene Symbol, or Sequence)
  const lowerQuery = query.toLowerCase().trim();
  
  const filtered = rawData.filter(r => {
    const tName = r.target_name ? r.target_name.toLowerCase() : "";
    const gene = r.gene_symbol ? r.gene_symbol.toLowerCase() : "";
    const seq = r.aptamer_sequence ? r.aptamer_sequence.toLowerCase() : "";
    const id = r.sequence_id ? r.sequence_id.toLowerCase() : "";
    
    return tName.includes(lowerQuery) || 
           gene.includes(lowerQuery) || 
           seq.includes(lowerQuery) ||
           id.includes(lowerQuery);
  });

  // 2. Aggregate by Target Name
  const map = new Map<string, AptamerRecord[]>();
  filtered.forEach(r => {
    // Normalize target name key
    const key = r.target_name || "Unknown Target";
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(r);
  });

  // 3. Process Groups into TargetGroup objects
  const groups: TargetGroup[] = [];

  map.forEach((records, targetName) => {
    // Basic stats
    const total = records.length;
    const pRecs = records.filter(r => r.level === 'P');
    const aRecs = records.filter(r => r.level === 'A');
    const bRecs = records.filter(r => r.level === 'B');
    const cRecs = records.filter(r => r.level === 'C');
    
    const years = records.map(r => r.year).filter(y => y);
    const yearMin = years.length > 0 ? Math.min(...years) : 0;
    const yearMax = years.length > 0 ? Math.max(...years) : 0;

    // Determine Preview Strategy
    let previewRecords: AptamerRecord[] = [];
    let previewType: 'P' | 'A' | 'BC' = 'BC';

    if (pRecs.length > 0) {
      previewType = 'P';
      // Sort P by pKd descending (higher affinity/pK_d first)
      // Safety check: ensure pKd is treated as number
      previewRecords = pRecs.sort((a, b) => (Number(b.pKd) || 0) - (Number(a.pKd) || 0)).slice(0, 5);
    } else if (aRecs.length > 0) {
      previewType = 'A';
      // Sort A by pKd descending
      previewRecords = aRecs.sort((a, b) => (Number(b.pKd) || 0) - (Number(a.pKd) || 0)).slice(0, 5);
    } else {
      previewType = 'BC';
      // Sort B/C by year descending (newest first) as proxy for relevance
      const combined = [...bRecs, ...cRecs];
      previewRecords = combined.sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 3);
    }

    groups.push({
      target_name: targetName,
      target_type: records[0].target_type || "Unknown",
      gene_symbol: records[0].gene_symbol,
      total_aptamers: total,
      count_P: pRecs.length,
      count_A: aRecs.length,
      count_B: bRecs.length,
      count_C: cRecs.length,
      year_min: yearMin,
      year_max: yearMax,
      records: records,
      preview_records: previewRecords,
      preview_type: previewType
    });
  });

  // Sort groups by total aptamers (popularity) descending
  groups.sort((a, b) => b.total_aptamers - a.total_aptamers);

  return groups;
}

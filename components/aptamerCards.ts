// Pure logic for turning a streamed assistant message into renderable segments.
// The /chat LLM is instructed to emit the records it presents inside a
// ```aptamers fenced JSON block; everything else is narrative prose. This module
// splits the accumulated content string into prose / card / pending segments so
// the chatbox can render cards while staying robust to partial streaming and
// malformed output.

export interface AptamerCard {
  sequence_id: string;
  target_name: string;
  sequence: string;
  affinity: string;
  pkd: number | null;
  doi: string;
  article_title: string;
  journal: string;
  year: string;
}

export type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'cards'; cards: AptamerCard[] }
  | { kind: 'pending' };

const FENCE = '```aptamers';

/** Split a (possibly still-streaming) assistant message into ordered segments. */
export function parseAssistantContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let rest = content;

  while (rest.length > 0) {
    const start = rest.indexOf(FENCE);
    if (start === -1) {
      pushText(segments, rest);
      break;
    }

    pushText(segments, rest.slice(0, start));

    const afterFence = rest.slice(start + FENCE.length);
    const end = afterFence.indexOf('```');
    if (end === -1) {
      // Opening fence seen but not yet closed — block is still streaming in.
      segments.push({ kind: 'pending' });
      return segments;
    }

    const body = afterFence.slice(0, end);
    const cards = tryParseCards(body);
    if (cards) {
      segments.push({ kind: 'cards', cards });
    } else {
      // Unparseable block: show the raw text rather than dropping content.
      pushText(segments, FENCE + body + '```');
    }
    rest = afterFence.slice(end + 3);
  }

  return segments;
}

function pushText(segments: ContentSegment[], text: string): void {
  const trimmed = text.replace(/^\n+|\n+$/g, '');
  if (trimmed.trim().length === 0) return;
  segments.push({ kind: 'text', text: trimmed });
}

function tryParseCards(body: string): AptamerCard[] | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as any).records)
      ? (parsed as any).records
      : null;
  if (!arr) return null;
  return (arr as unknown[]).map(normalizeCard);
}

function normalizeCard(raw: any): AptamerCard {
  const r = raw && typeof raw === 'object' ? raw : {};
  let pkd: number | null = null;
  if (typeof r.pkd === 'number' && !Number.isNaN(r.pkd)) pkd = r.pkd;
  else if (r.pkd != null && r.pkd !== '' && !Number.isNaN(Number(r.pkd))) pkd = Number(r.pkd);
  return {
    sequence_id: str(r.sequence_id),
    target_name: str(r.target_name),
    sequence: str(r.sequence),
    affinity: str(r.affinity),
    pkd,
    doi: str(r.doi),
    article_title: str(r.article_title),
    journal: str(r.journal),
    year: str(r.year),
  };
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

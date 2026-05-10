import type {
  MwEntry,
  MwDtItem,
  MwSenseContent,
  MwSseqItem,
  MwVis,
} from './merriam.dto';
import type { NormalizedMeaning, NormalizedWord } from '../provider.interface';
import { DictionaryProvider } from '../provider.interface';

/**
 * Strips Merriam-Webster proprietary inline markup from text fields.
 * Only handles the subset documented for the Learner's Dictionary; unrecognised
 * tags are removed by the catch-all at the end.
 */
export function stripMwMarkup(text: string): string {
  return text
    .replace(/\{bc\}/g, '')
    // Paired formatting tags – keep inner text
    .replace(/\{it\}([\s\S]*?)\{\/it\}/g, '$1')
    .replace(/\{wi\}([\s\S]*?)\{\/wi\}/g, '$1')
    .replace(/\{b\}([\s\S]*?)\{\/b\}/g, '$1')
    .replace(/\{phrase\}([\s\S]*?)\{\/phrase\}/g, '$1')
    .replace(/\{parahw\}([\s\S]*?)\{\/parahw\}/g, '$1')
    .replace(/\{gloss\}([\s\S]*?)\{\/gloss\}/g, '($1)')
    // Typographic
    .replace(/\{ldquo\}/g, '“')
    .replace(/\{rdquo\}/g, '”')
    .replace(/\{lquo\}/g, '‘')
    .replace(/\{rquo\}/g, '’')
    .replace(/\{amp\}/g, '&')
    .replace(/\{ndash\}/g, '–')
    .replace(/\{mdash\}/g, '—')
    // Cross-references – keep display text
    .replace(/\{sx\|([^|]+)\|[^}]*\}/g, '$1')
    .replace(/\{dxt\|([^|]+)\|[^}]*\}/g, '$1')
    .replace(/\{a_link\|([^}]+)\}/g, '$1')
    .replace(/\{d_link\|([^|]+)\|[^}]*\}/g, '$1')
    .replace(/\{i_link\|([^|]+)\|[^}]*\}/g, '$1')
    .replace(/\{et_link\|([^|]+)\|[^}]*\}/g, '$1')
    .replace(/\{mat\|([^|]+)\|[^}]*\}/g, '$1')
    // Catch-all: drop any remaining {…} tags
    .replace(/\{[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Recursively flattens an sseq item into a list of leaf sense contents. */
function flattenSseqItem(item: MwSseqItem): MwSenseContent[] {
  const [type, content] = item;
  if (type === 'sense') return [content as MwSenseContent];
  if (type === 'bs') return [(content as { sense: MwSenseContent }).sense];
  if (type === 'pseq') {
    return (content as MwSseqItem[]).flatMap(flattenSseqItem);
  }
  return [];
}

function extractDefinition(dt: MwDtItem[]): string {
  const parts: string[] = [];
  for (const [type, value] of dt) {
    if (type === 'text' && typeof value === 'string') {
      const cleaned = stripMwMarkup(value);
      if (cleaned) parts.push(cleaned);
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function extractExamples(dt: MwDtItem[]): string[] {
  const examples: string[] = [];
  for (const [type, value] of dt) {
    if (type === 'vis' && Array.isArray(value)) {
      for (const vis of value as MwVis[]) {
        if (vis.t) examples.push(stripMwMarkup(vis.t));
      }
    }
  }
  return examples;
}

/**
 * Normalises an MW sense number to the canonical "1a"/"1b" form.
 *   "1 a" → "1a"     "1 a"  (with NBSP)  → "1a"
 *   "  b " → "b"     "1"               → "1"
 */
function normalizeSenseNumber(sn: string | undefined | null): string | null {
  if (!sn) return null;
  const cleaned = sn.replace(/\s+/g, '').trim();
  return cleaned || null;
}

/**
 * Normalise the FIRST entry of a Merriam-Webster Learner's response into our
 * provider-independent shape. MW returns multiple entries per lookup (the word
 * itself plus related compound headwords); per design.md we consume only [0].
 *
 * Sense numbers are preserved exactly as MW emits them so the frontend can
 * group/indent them (e.g. "1", "a", "b", "2"). When a sense uses just a letter
 * ("a", "b"), MW intends it as a sub-sense of the most recent numbered sense;
 * we flatten that into the canonical "1a" / "1b" form here so consumers don't
 * need to track parent state.
 */
export function normalizeMerriamEntry(
  searchText: string,
  entry: MwEntry,
): NormalizedWord {
  const transcription = entry.hwi?.prs?.[0]?.ipa ?? entry.hwi?.prs?.[0]?.mw ?? null;
  const partOfSpeech = entry.fl ?? null;

  const meanings: NormalizedMeaning[] = [];
  let lastTopLevel: string | null = null;

  /**
   * Resolves an MW sense number against the most recent top-level number.
   *   "1"   → "1"   (and remembered as parent)
   *   "a"   → "1a"  (lifted into preceding "1")
   *   "1a"  → "1a"  (already canonical)
   *   null  → null
   */
  const resolveSenseNumber = (raw: string | undefined | null): string | null => {
    const sn = normalizeSenseNumber(raw);
    if (!sn) return null;
    if (/^\d/.test(sn)) {
      // Starts with a digit: could be "1", "1a", etc. Update parent prefix.
      const m = sn.match(/^(\d+)/);
      if (m) lastTopLevel = m[1];
      return sn;
    }
    // Starts with a letter — this is a subsense of the previous top-level number
    return lastTopLevel ? `${lastTopLevel}${sn}` : sn;
  };

  for (const defSection of entry.def ?? []) {
    for (const senseGroup of defSection.sseq ?? []) {
      for (const item of senseGroup) {
        for (const sense of flattenSseqItem(item)) {
          if (!sense.dt) continue;

          const senseNumber = resolveSenseNumber(sense.sn);
          const definition = extractDefinition(sense.dt);
          const examples = extractExamples(sense.dt);

          if (definition) {
            meanings.push({
              definition,
              partOfSpeech,
              synonyms: [],
              examples,
              senseNumber,
            });
          }

          // Inline sdsense ("especially: …") — inherits the parent's sense number
          const sds = sense.sdsense;
          if (sds?.dt) {
            const subDef = extractDefinition(sds.dt);
            if (subDef) {
              meanings.push({
                definition: sds.sd ? `${sds.sd}: ${subDef}` : subDef,
                partOfSpeech,
                synonyms: [],
                examples: extractExamples(sds.dt),
                senseNumber,
              });
            }
          }
        }
      }
    }
  }

  return {
    text: searchText,
    transcription,
    provider: DictionaryProvider.MERRIAM,
    meanings,
  };
}

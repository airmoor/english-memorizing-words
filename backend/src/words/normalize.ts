// ---------- text normalization ----------

export function normalizeSearchText(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// ---------- Free Dictionary API response types ----------

interface ApiPhonetic {
  text?: string;
  audio?: string;
}

interface ApiDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface ApiMeaning {
  partOfSpeech?: string;
  definitions: ApiDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface ApiEntry {
  word: string;
  phonetics?: ApiPhonetic[];
  meanings: ApiMeaning[];
}

// ---------- normalized form written to DB ----------

export interface NormalizedMeaning {
  definition: string;
  transcription: string | null;
  partOfSpeech: string | null;
  synonyms: string[];
  examples: string[];
}

// ---------- normalization logic ----------

export function normalizeApiResponse(entries: ApiEntry[]): NormalizedMeaning[] {
  // First non-empty phonetic text across all entries in order
  let transcription: string | null = null;
  outer: for (const entry of entries) {
    for (const phonetic of entry.phonetics ?? []) {
      const t = phonetic.text?.trim();
      if (t) {
        transcription = t;
        break outer;
      }
    }
  }

  const meanings: NormalizedMeaning[] = [];

  for (const entry of entries) {
    for (const apiMeaning of entry.meanings ?? []) {
      for (const def of apiMeaning.definitions ?? []) {
        meanings.push({
          definition: def.definition,
          transcription,
          partOfSpeech: apiMeaning.partOfSpeech ?? null,
          synonyms: def.synonyms ?? [],
          // design: wrap single example string as a 1-element array; [] if absent
          examples: def.example ? [def.example] : [],
        });
      }
    }
  }

  return meanings;
}

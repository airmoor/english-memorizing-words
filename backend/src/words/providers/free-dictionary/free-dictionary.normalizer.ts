import type { FdEntry } from './free-dictionary.dto';
import type { NormalizedMeaning, NormalizedWord } from '../provider.interface';
import { DictionaryProvider } from '../provider.interface';

/**
 * Free Dictionary returns multiple entries (one per pronunciation/etymology).
 * We collect transcription from the first entry that has one, and flatten all
 * meanings across all entries into a single list.
 */
export function normalizeFreeDictionary(
  searchText: string,
  entries: FdEntry[],
): NormalizedWord {
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
          partOfSpeech: apiMeaning.partOfSpeech ?? null,
          synonyms: def.synonyms ?? [],
          examples: def.example ? [def.example] : [],
          // Free Dictionary has no concept of dictionary sense numbers
          senseNumber: null,
        });
      }
    }
  }

  return {
    text: searchText,
    transcription,
    provider: DictionaryProvider.FREE,
    meanings,
  };
}

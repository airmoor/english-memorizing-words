/**
 * Vendor DTOs for the Free Dictionary API (api.dictionaryapi.dev).
 * MUST NOT leak outside this directory.
 */

export interface FdPhonetic {
  text?: string;
  audio?: string;
}

export interface FdDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface FdMeaning {
  partOfSpeech?: string;
  definitions: FdDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface FdEntry {
  word: string;
  phonetics?: FdPhonetic[];
  meanings: FdMeaning[];
}

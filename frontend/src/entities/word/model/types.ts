export type DictionaryProvider = 'merriam-webster' | 'free-dictionary'

export interface Meaning {
  id: string
  definition: string
  partOfSpeech: string | null
  synonyms: string[]
  examples: string[]
  /** Dictionary sense label like "1", "1a", "1b", "2". Null when provider has no senses. */
  senseNumber: string | null
}

export interface WordResult {
  id: string
  text: string
  transcription: string | null
  provider: DictionaryProvider
  meanings: Meaning[]
}

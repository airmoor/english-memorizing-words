export interface VocabularyEntry {
  userMeaningId: string
  meaningId: string
  wordId: string
  wordText: string
  definition: string
  transcription: string | null
  partOfSpeech: string | null
  synonyms: string[]
  examples: string[]
  savedAt: string
}

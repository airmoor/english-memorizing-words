export interface VocabularyEntry {
  userMeaningId: string
  meaningId: string
  wordId: string
  wordText: string
  transcription: string | null
  definition: string
  partOfSpeech: string | null
  synonyms: string[]
  examples: string[]
  senseNumber: string | null
  savedAt: string
}

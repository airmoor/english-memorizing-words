export interface VocabularyMeaning {
  id: string
  definition: string
  partOfSpeech: string | null
  senseNumber: string | null
}

/**
 * One entry per canonical English word in the user's vocabulary.
 * Meanings are nested — the word is the learning unit, not individual senses.
 */
export interface VocabularyWord {
  userWordId: string
  wordId: string
  wordText: string
  transcription: string | null
  savedAt: string
  meanings: VocabularyMeaning[]
}

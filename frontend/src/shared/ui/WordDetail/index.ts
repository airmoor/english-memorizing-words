/**
 * WordDetail system — barrel export.
 *
 * Phase 1 components are added here as they are implemented:
 *   T1  — types (now)
 *   T3  — WordDetailContent, DictionaryHeader, MeaningGroup
 *   T4  — useWordDetailState
 *   T5  — useWordDetailData
 *   T6  — BottomSheet
 *   T7  — SidePanel
 *   T8  — WordDetailContainer, WordDetailProvider, useWordDetail
 */

// ── Type contracts ─────────────────────────────────────────────────────────
export type {
  DictionaryProvider,
  MeaningPayload,
  WordPayload,
  LearningState,
  WordDetailContentProps,
} from './types'

// ── Components ─────────────────────────────────────────────────────────────
export { WordDetailContent } from './WordDetailContent'
export { DictionaryHeader } from './DictionaryHeader'
export { MeaningGroup } from './MeaningGroup'
export { BottomSheet } from './BottomSheet'
export { SidePanel } from './SidePanel'
export { WordDetailContainer } from './WordDetailContainer'
export { WordDetailProvider } from './WordDetailProvider'

// ── Hook (public facade) ───────────────────────────────────────────────────
export { useWordDetail } from './WordDetailContext'

// ── Utilities ──────────────────────────────────────────────────────────────
export { groupByPos, isSubSense } from './utils'
export { vocabWordToWordPayload, vocabWordToLearningState, wordResultToWordPayload } from './adapters'

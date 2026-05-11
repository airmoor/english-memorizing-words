import type { WordDetailContentProps } from './types'
import { DictionaryHeader } from './DictionaryHeader'
import { MeaningGroup } from './MeaningGroup'
import { groupByPos } from './utils'
import styles from './WordDetailContent.module.css'

/**
 * The canonical word detail view — section-composed, layout-agnostic.
 *
 * Architecture (§4, §15):
 * - Renders the dictionary layer (DictionaryHeader + MeaningGroup[])
 * - Renders the learning layer (LearningSection) only when learningState is non-null
 * - Never fetches data, never mutates — receives everything via props
 * - Identical output inside BottomSheet, SidePanel, or a standalone page
 *
 * Section structure:
 *   DictionaryHeader    — word, transcription, source, save/remove
 *   MeaningGroup[]      — one section per part of speech
 *   (separator)         — visual rule between dictionary and learning layers
 *   LearningSection     — TODO: added in Phase 2 when LearningState is surfaced in UI
 */
export function WordDetailContent({
  word,
  learningState,
  onSave,
  onRemove,
  isMutating = false,
  context = 'search',
}: WordDetailContentProps) {
  const groups = groupByPos(word.meanings)

  return (
    <div className={styles.content}>
      {/* ── Dictionary layer ──────────────────────────────────────────── */}
      <DictionaryHeader
        word={word}
        learningState={learningState}
        onSave={onSave}
        onRemove={onRemove}
        isMutating={isMutating}
        context={context}
      />

      <div className={styles.meanings}>
        {groups.map((group, i) => (
          <MeaningGroup
            key={`${group.pos ?? 'null'}-${i}`}
            pos={group.pos}
            meanings={group.meanings}
          />
        ))}
      </div>

      {/* ── Learning layer ────────────────────────────────────────────── */}
      {/* TODO(P2): LearningSection added once learning state is surfaced in UI. */}

      {/* ── Source attribution — subtle, at the very bottom ──────────── */}
      {/* <p className={styles.attribution}>
        {PROVIDER_LABELS[word.provider] ?? word.provider}
      </p> */}
    </div>
  )
}

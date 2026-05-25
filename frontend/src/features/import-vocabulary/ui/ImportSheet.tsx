import { useCallback, useState } from 'react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet'
import { useImportFlow } from '../model/useImportFlow'
import { useImportPreviewMutation } from '../model/useImportPreviewMutation'
import { useImportExecuteMutation } from '../model/useImportExecuteMutation'
import { ImportUploader } from './ImportUploader'
import { ImportPreview } from './ImportPreview'
import { ImportResult } from './ImportResult'
import { AnkiColumnMapper } from './AnkiColumnMapper'
import { Spinner } from '../../../shared/ui/Spinner'
import { selectParser } from '../../../shared/lib/import/parsers/parserRegistry'
import type { ParsedRow, ImportSettings } from '../../../entities/import-session/model/types'
import type { ColumnSuggestion } from '../../../shared/lib/import/parsers/types'
import styles from './ImportSheet.module.css'

interface ImportSheetProps {
  open: boolean
  onClose: () => void
}

const DEFAULT_SETTINGS: ImportSettings = {
  duplicateMode: 'skip',
}

export function ImportSheet({ open, onClose }: ImportSheetProps) {
  const flow = useImportFlow()
  const previewMutation = useImportPreviewMutation()
  const executeMutation = useImportExecuteMutation()
  const [settings, setSettings] = useState<ImportSettings>(DEFAULT_SETTINGS)
  // Held for Anki column-mapping re-parse
  const [rawParseInput, setRawParseInput] = useState<{ text: string; filename?: string } | null>(null)
  const [ankiSuggestions, setAnkiSuggestions] = useState<ColumnSuggestion[]>([])

  // On the complete step, backdrop dismissal is disabled (user must use explicit buttons)
  const handleClose = useCallback(() => {
    if (flow.step === 'complete') return
    flow.reset()
    previewMutation.reset()
    executeMutation.reset()
    onClose()
  }, [flow, previewMutation, executeMutation, onClose])

  // Called by ImportUploader when parsing is done
  const handleParsed = useCallback(
    (rows: ParsedRow[], meta?: { requiresColumnMapping?: boolean; columnSuggestions?: ColumnSuggestion[]; text?: string; filename?: string }) => {
      if (meta?.requiresColumnMapping) {
        // Route to Anki column mapper
        setRawParseInput({ text: meta.text ?? '', filename: meta.filename })
        setAnkiSuggestions(meta.columnSuggestions ?? [])
        flow.goTo('anki-map')
      } else {
        flow.setParsedRows(rows)
        flow.goTo('preview')
      }
    },
    [flow],
  )

  // Called by AnkiColumnMapper once user confirms column selection
  const handleAnkiConfirm = useCallback(
    (wordColumnIndex: number, tagsColumnIndex?: number) => {
      if (!rawParseInput) return
      const parser = selectParser(rawParseInput)
      const result = parser.parse(rawParseInput, { wordColumnIndex, tagsColumnIndex })
      flow.setParsedRows(result.rows)
      flow.goTo('preview')
    },
    [rawParseInput, flow],
  )

  // Called by ImportPreview "Import N words" button
  const handleExecute = useCallback(
    async (rows: ParsedRow[]) => {
      flow.goTo('importing')
      try {
        const result = await executeMutation.mutateAsync({ rows, settings })
        flow.setResult(result)
        flow.goTo('complete')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed. Please try again.'
        flow.setError(message)
        flow.goTo('error')
      }
    },
    [flow, executeMutation, settings],
  )

  // Called from ImportResult "Import more"
  const handleImportMore = useCallback(() => {
    flow.reset()
    previewMutation.reset()
    executeMutation.reset()
    setSettings(DEFAULT_SETTINGS)
  }, [flow, previewMutation, executeMutation])

  // Called from ImportResult "View vocabulary"
  const handleViewVocabulary = useCallback(() => {
    flow.reset()
    previewMutation.reset()
    executeMutation.reset()
    setSettings(DEFAULT_SETTINGS)
    onClose()
  }, [flow, previewMutation, executeMutation, onClose])

  const title =
    flow.step === 'complete'
      ? 'Import complete'
      : flow.step === 'error'
        ? 'Import failed'
        : 'Import vocabulary'

  return (
    <AdaptiveSheet
      open={open}
      onClose={handleClose}
      label={title}
    >
      <div className={styles.sheet}>
        {/* ── Upload step ─────────────────────────────────────────────── */}
        {flow.step === 'upload' && (
          <ImportUploader onParsed={handleParsed} />
        )}

        {/* ── Anki column mapping step ─────────────────────────────────── */}
        {flow.step === 'anki-map' && (
          <AnkiColumnMapper
            suggestions={ankiSuggestions}
            rawText={rawParseInput?.text ?? ''}
            onConfirm={handleAnkiConfirm}
            onBack={() => flow.goTo('upload')}
          />
        )}

        {/* ── Preview step ─────────────────────────────────────────────── */}
        {flow.step === 'preview' && (
          <ImportPreview
            parsedRows={flow.parsedRows}
            settings={settings}
            onSettingsChange={setSettings}
            onExecute={handleExecute}
            onBack={() => {
              flow.goTo('upload')
              previewMutation.reset()
            }}
          />
        )}

        {/* ── Importing (in-flight) step ───────────────────────────────── */}
        {flow.step === 'importing' && (
          <div className={styles.loadingStep}>
            <Spinner />
            <p className={styles.loadingText}>Importing words…</p>
          </div>
        )}

        {/* ── Complete step ────────────────────────────────────────────── */}
        {flow.step === 'complete' && flow.result && (
          <ImportResult
            result={flow.result}
            onViewVocabulary={handleViewVocabulary}
            onImportMore={handleImportMore}
          />
        )}

        {/* ── Error step ───────────────────────────────────────────────── */}
        {flow.step === 'error' && (
          <div className={styles.errorStep}>
            <p className={styles.errorMessage}>{flow.error ?? 'Something went wrong.'}</p>
            <div className={styles.errorActions}>
              <button
                type="button"
                className={styles.errorRetryBtn}
                onClick={() => {
                  flow.goTo('upload')
                  executeMutation.reset()
                  flow.setError('')
                }}
              >
                Try again
              </button>
              <button type="button" className={styles.errorCloseBtn} onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AdaptiveSheet>
  )
}

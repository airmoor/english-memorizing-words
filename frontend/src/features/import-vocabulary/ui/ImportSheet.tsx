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
import { ApiError } from '../../../shared/api/base'
import { buildValidationFlowError } from '../lib/formatValidationErrors'
import type { ParsedRow, ImportSettings, ImportFlowError } from '../../../entities/import-session/model/types'
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
    async (wordColumnIndex: number, tagsColumnIndex?: number) => {
      if (!rawParseInput) return
      const parser = selectParser(rawParseInput)
      try {
        const result = await parser.parse(rawParseInput, { wordColumnIndex, tagsColumnIndex })
        flow.setParsedRows(result.rows)
        flow.goTo('preview')
      } catch (err) {
        const flowError: ImportFlowError = {
          type: 'parse',
          message: err instanceof Error ? err.message : 'Failed to parse file after column mapping.',
        }
        flow.setError(flowError)
        flow.goTo('error')
      }
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
        let flowError: ImportFlowError

        if (err instanceof ApiError && err.status === 400 && err.validationErrors?.length) {
          // Structured validation failure — convert to user-friendly grouped message.
          // This is a last-resort path: preview should already have marked invalid
          // rows as 'error' before the user reaches execute.
          flowError = buildValidationFlowError(err.validationErrors)
        } else {
          flowError = {
            type: err instanceof Error && err.name === 'AbortError' ? 'network' : 'server',
            message: err instanceof Error ? err.message : 'Import failed. Please try again.',
          }
        }

        flow.setError(flowError)
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
          <div className={styles.stepContent}>
            <ImportUploader onParsed={handleParsed} />
          </div>
        )}

        {/* ── Anki column mapping step ─────────────────────────────────── */}
        {flow.step === 'anki-map' && (
          <div className={styles.stepContent}>
            <AnkiColumnMapper
              suggestions={ankiSuggestions}
              rawText={rawParseInput?.text ?? ''}
              onConfirm={(wordCol, tagsCol) => void handleAnkiConfirm(wordCol, tagsCol)}
              onBack={() => flow.goTo('upload')}
            />
          </div>
        )}

        {/* ── Preview step ─────────────────────────────────────────────── */}
        {flow.step === 'preview' && (
          <div className={styles.stepContent}>
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
          </div>
        )}

        {/* ── Importing (in-flight) step ───────────────────────────────── */}
        {flow.step === 'importing' && (
          <div className={styles.stepContent}>
            <div className={styles.loadingStep}>
              <Spinner />
              <p className={styles.loadingText}>Importing words…</p>
            </div>
          </div>
        )}

        {/* ── Complete step ────────────────────────────────────────────── */}
        {flow.step === 'complete' && flow.result && (
          <div className={styles.stepContent}>
            <ImportResult
              result={flow.result}
              onViewVocabulary={handleViewVocabulary}
              onImportMore={handleImportMore}
            />
          </div>
        )}

        {/* ── Error step ───────────────────────────────────────────────── */}
        {flow.step === 'error' && (
          <div className={styles.stepContent}>
            <div className={styles.errorStep}>
              <p className={styles.errorMessage}>{flow.error?.message ?? 'Something went wrong.'}</p>
              {/* For validation errors with multiple distinct groups, show a
                  compact hint to go back and fix the highlighted rows. */}
              {flow.error?.type === 'validation' && (
                <p className={styles.errorHint}>
                  Go back to preview — invalid rows are highlighted in red and can be removed before importing.
                </p>
              )}
              <div className={styles.errorActions}>
                <button
                  type="button"
                  className={styles.errorRetryBtn}
                  onClick={() => {
                    flow.goTo('upload')
                    executeMutation.reset()
                    flow.reset()
                  }}
                >
                  Try again
                </button>
                <button type="button" className={styles.errorCloseBtn} onClick={handleClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdaptiveSheet>
  )
}

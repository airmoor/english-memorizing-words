import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { ImportUploader } from '../../features/import-vocabulary/ui/ImportUploader'
import { ImportPreview } from '../../features/import-vocabulary/ui/ImportPreview'
import { ImportResult } from '../../features/import-vocabulary/ui/ImportResult'
import { ImportHistory } from '../../features/import-vocabulary/ui/ImportHistory'
import { Spinner } from '../../shared/ui/Spinner'
import { useImportFlow } from '../../features/import-vocabulary/model/useImportFlow'
import { useImportPreviewMutation } from '../../features/import-vocabulary/model/useImportPreviewMutation'
import { useImportExecuteMutation } from '../../features/import-vocabulary/model/useImportExecuteMutation'
import { selectParser } from '../../shared/lib/import/parsers/parserRegistry'
import { ApiError } from '../../shared/api/base'
import { buildValidationFlowError } from '../../features/import-vocabulary/lib/formatValidationErrors'
import type { ParsedRow, ImportSettings, ImportFlowError } from '../../entities/import-session/model/types'
import type { ColumnSuggestion } from '../../shared/lib/import/parsers/types'
import styles from './ImportPage.module.css'
import {Container} from "../../shared/ui/layout/Container.tsx";

type ImportTab = 'import' | 'history'

const DEFAULT_SETTINGS: ImportSettings = {
  duplicateMode: 'skip',
}

export function ImportPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ImportTab>('import')
  const [settings, setSettings] = useState<ImportSettings>(DEFAULT_SETTINGS)
  /**
   * Pre-fill content for the uploader — set from Import History "Retry failed words".
   * `uploaderKey` increments on every retry to force a re-mount of ImportUploader,
   * ensuring `initialWords` is picked up even if the same words are retried twice.
   */
  const [retryWords, setRetryWords] = useState<string | null>(null)
  const [uploaderKey, setUploaderKey] = useState(0)
  /**
   * Incremented every time `handleParsed` produces a new batch of rows to
   * preview.  Passed as `key` to <ImportPreview> so the component fully
   * remounts — resetting its internal `mergedRows` state and re-firing the
   * server-preview effect — even when the flow step is already 'preview'
   * (i.e. the user edited the textarea and clicked "Preview Import" again).
   */
  const [previewKey, setPreviewKey] = useState(0)

  const flow = useImportFlow()
  const previewMutation = useImportPreviewMutation()
  const executeMutation = useImportExecuteMutation()

  // Held for Anki column-mapping re-parse
  const [rawParseInput, setRawParseInput] = useState<{ text: string; filename?: string } | null>(null)
  const [, setAnkiSuggestions] = useState<ColumnSuggestion[]>([])

  // ── Reset the full flow ───────────────────────────────────────────────────

  const resetFlow = useCallback(() => {
    flow.reset()
    previewMutation.reset()
    executeMutation.reset()
    setSettings(DEFAULT_SETTINGS)
  }, [flow, previewMutation, executeMutation])

  // ── Parse handlers ────────────────────────────────────────────────────────

  const handleParsed = useCallback(
    (rows: ParsedRow[], meta?: { requiresColumnMapping?: boolean; columnSuggestions?: ColumnSuggestion[]; text?: string; filename?: string; sourceType?: 'paste' | 'csv' | 'anki' }) => {
      if (meta?.sourceType) flow.setSourceType(meta.sourceType)
      if (meta?.requiresColumnMapping) {
        setRawParseInput({ text: meta.text ?? '', filename: meta.filename })
        setAnkiSuggestions(meta.columnSuggestions ?? [])
        // For the page context, treat Anki mapping as a preview step with empty rows first.
        // The column mapper isn't embedded here for simplicity — we'll route back to upload.
        // TODO: embed AnkiColumnMapper in this page in a future pass.
        flow.setParsedRows(rows)
        flow.goTo('anki-map')
      } else {
        flow.setParsedRows(rows)
        flow.goTo('preview')
        // Increment key so <ImportPreview> fully remounts with fresh state.
        // Without this, clicking "Preview Import" a second time while already
        // on the preview step would leave the component frozen on the first
        // batch of rows (useState and mount-only useEffect don't re-run).
        setPreviewKey((k) => k + 1)
      }
    },
    [flow],
  )

  // Handle Anki re-parse after column selection (if needed by future mapper integration)
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
  // Suppress unused warning — will be used when AnkiColumnMapper is embedded
  void handleAnkiConfirm

  // ── Execute ───────────────────────────────────────────────────────────────

  const handleExecute = useCallback(
    async (rows: ParsedRow[]) => {
      flow.goTo('importing')
      try {
        const result = await executeMutation.mutateAsync({ rows, settings, sourceType: flow.sourceType })
        flow.setResult(result)
        flow.goTo('complete')
      } catch (err) {
        let flowError: ImportFlowError

        if (err instanceof ApiError && err.status === 400 && err.validationErrors?.length) {
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

  // ── Result actions ────────────────────────────────────────────────────────

  const handleImportMore = useCallback(() => {
    resetFlow()
    setRetryWords(null)
    setUploaderKey((k) => k + 1)
  }, [resetFlow])

  const handleViewVocabulary = useCallback(() => {
    navigate('/vocabulary')
  }, [navigate])

  // ── Retry failed rows from history ────────────────────────────────────────

  const handleRetryWords = useCallback((words: string[]) => {
    resetFlow()
    setRetryWords(words.join('\n'))
    setUploaderKey((k) => k + 1)  // force ImportUploader re-mount to pick up new initialWords
    setActiveTab('import')
  }, [resetFlow])

  // ── Derived display state ─────────────────────────────────────────────────

  // On mobile, show only left OR right panel depending on step.
  // On desktop (≥1024px), always show both columns.
  const isUploadStep = flow.step === 'upload'
  const hasRightContent = flow.step !== 'upload'

  return (
    <PageLayout>
      <Container as="main" width="wide">
      <div className={styles.page}>
        {/* ── Page header + tab bar ─────────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Import Vocabulary</h1>
          <div className={styles.tabBar} role="tablist" aria-label="Import sections">
            <button
              role="tab"
              aria-selected={activeTab === 'import'}
              className={[styles.tab, activeTab === 'import' ? styles.tabActive : ''].join(' ')}
              onClick={() => setActiveTab('import')}
            >
              Import
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'history'}
              className={[styles.tab, activeTab === 'history' ? styles.tabActive : ''].join(' ')}
              onClick={() => {
                setActiveTab('history')
              }}
            >
              History
            </button>
          </div>
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        <div className={styles.content}>

          {/* ── Import tab ───────────────────────────────────────────── */}
          {activeTab === 'import' && (
            <>
            {/* ── Step indicator ──────────────────────────────────── */}
            <div className={styles.stepIndicator} aria-label="Import progress">
              <div className={[styles.step, isUploadStep ? styles.stepActive : styles.stepDone].join(' ')}>
                <span className={styles.stepBadge} aria-hidden="true">1</span>
                <span className={styles.stepLabel}>Add words</span>
              </div>
              <span className={styles.stepArrow} aria-hidden="true">→</span>
              <div className={[styles.step, !isUploadStep ? styles.stepActive : styles.stepPending].join(' ')}>
                <span className={styles.stepBadge} aria-hidden="true">2</span>
                <span className={styles.stepLabel}>Preview &amp; import</span>
              </div>
            </div>
            <div className={styles.importLayout}>
              {/* Left panel: uploader — always visible on desktop,
                  hidden on mobile when right panel has content */}
              <div
                className={styles.leftPanel}
                data-hidden={(!isUploadStep && hasRightContent).toString()}
                data-complete={(flow.step === 'complete').toString()}
              >
                <ImportUploader
                  key={uploaderKey}
                  onParsed={handleParsed}
                  initialWords={retryWords ?? undefined}
                />
              </div>

              {/* Right panel: contextual */}
              <div
                className={styles.rightPanel}
                data-hidden={(!hasRightContent).toString()}
              >
                {/* Empty state — no preview yet */}
                {flow.step === 'upload' && (
                  <div className={styles.rightEmpty}>
                    <span className={styles.rightEmptyIcon} aria-hidden="true">📋</span>
                    <p className={styles.rightEmptyTitle}>Preview will appear here</p>
                    <p className={styles.rightEmptyBody}>
                      Paste words or upload a file on the left, then click "Preview Import".
                    </p>
                  </div>
                )}

                {/* Preview step */}
                {flow.step === 'preview' && (
                  <ImportPreview
                    key={previewKey}
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

                {/* Importing in-flight */}
                {flow.step === 'importing' && (
                  <div className={styles.rightCentered}>
                    <Spinner />
                    <p className={styles.loadingText}>Importing words…</p>
                  </div>
                )}

                {/* Complete */}
                {flow.step === 'complete' && flow.result && (
                  <ImportResult
                    result={flow.result}
                    onViewVocabulary={handleViewVocabulary}
                    onImportMore={handleImportMore}
                  />
                )}

                {/* Error */}
                {flow.step === 'error' && (
                  <div className={styles.rightCentered}>
                    <p className={styles.errorMessage}>{flow.error?.message ?? 'Something went wrong.'}</p>
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
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {/* Anki map — fallback until mapper is embedded in page */}
                {flow.step === 'anki-map' && (
                  <div className={styles.rightCentered}>
                    <p className={styles.loadingText}>
                      Column mapping for Anki files is available in the import sheet (accessible from the Vocabulary page).
                    </p>
                    <button
                      type="button"
                      className={styles.errorRetryBtn}
                      onClick={() => flow.goTo('upload')}
                    >
                      Go back
                    </button>
                  </div>
                )}
              </div>
            </div>
            </>
          )}

          {/* ── History tab ──────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className={styles.historyPane}>
              <ImportHistory onRetry={handleRetryWords} />
            </div>
          )}
        </div>
      </div>
      </Container>
    </PageLayout>
  )
}

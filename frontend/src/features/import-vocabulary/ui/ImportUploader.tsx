import { useCallback, useRef, useState } from 'react'
import { selectParser } from '../../../shared/lib/import/parsers/parserRegistry'
import type { ParsedRow } from '../../../entities/import-session/model/types'
import type { ColumnSuggestion } from '../../../shared/lib/import/parsers/types'
import styles from './ImportUploader.module.css'

// Strip UTF-8 BOM if present
function stripBom(text: string): string {
  return text.startsWith('﻿') ? text.slice(1) : text
}

const ACCEPTED_EXTENSIONS = ['.txt', '.csv']

interface ParseMeta {
  requiresColumnMapping?: boolean
  columnSuggestions?: ColumnSuggestion[]
  text?: string
  filename?: string
  sourceType?: 'paste' | 'csv' | 'anki'
}

interface ImportUploaderProps {
  onParsed: (rows: ParsedRow[], meta?: ParseMeta) => void
  onError?: (message: string) => void
  /**
   * Pre-fill the textarea with this content on mount.
   * Used by the retry flow — ImportPage passes failed words as a newline-joined string.
   * Ignored after initial mount; use the component `key` prop to re-mount with new words.
   */
  initialWords?: string
}

export function ImportUploader({ onParsed, onError, initialWords }: ImportUploaderProps) {
  const [pasteValue, setPasteValue] = useState(initialWords ?? '')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInlineError = useCallback(
    (message: string) => {
      setInlineError(message)
      onError?.(message)
    },
    [onError],
  )

  const parseAndEmit = useCallback(
    async (text: string, filename?: string) => {
      setInlineError(null)
      const input = { text, filename }
      const parser = selectParser(input)

      // Infer source type: .csv files → 'csv', everything else pasted/txt → 'paste'
      // Anki is detected via requiresColumnMapping below
      const ext = filename ? '.' + (filename.split('.').pop()?.toLowerCase() ?? '') : ''
      const inferredSourceType: 'paste' | 'csv' = ext === '.csv' ? 'csv' : 'paste'

      let result
      try {
        result = await parser.parse(input)
      } catch (err) {
        handleInlineError('Failed to parse file. Please check the format and try again.')
        return
      }

      // If the parser requires column mapping (Anki), delegate to the parent
      if (result.requiresColumnMapping) {
        onParsed([], { requiresColumnMapping: true, columnSuggestions: result.columnSuggestions, text, filename, sourceType: 'anki' })
        return
      }

      const nonEmpty = result.rows.filter((r) => r.word.length > 0)
      if (nonEmpty.length === 0) {
        handleInlineError('No words found. Paste one word per line, or upload a .txt or .csv file.')
        return
      }
      onParsed(nonEmpty, { sourceType: inferredSourceType })
    },
    [onParsed, handleInlineError],
  )

  // ── Paste textarea — update state only, no auto-parse ────────────────────
  // Parsing happens only when the user explicitly clicks "Preview Import"
  // or presses Cmd/Ctrl+Enter. File upload still auto-proceeds (intentional action).

  const handlePasteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPasteValue(e.target.value)
      setInlineError(null)
    },
    [],
  )

  // Cmd/Ctrl+Enter triggers preview from anywhere in the textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (pasteValue.trim()) {
          void parseAndEmit(pasteValue)
        }
      }
    },
    [pasteValue, parseAndEmit],
  )

  const handlePreviewImport = useCallback(() => {
    if (pasteValue.trim()) {
      void parseAndEmit(pasteValue)
    }
  }, [pasteValue, parseAndEmit])

  // ── File reading — auto-proceeds on select/drop ───────────────────────────

  const processFile = useCallback(
    (file: File) => {
      // Validate extension
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        if (file.name.toLowerCase().endsWith('.apkg')) {
          handleInlineError(
            'Anki .apkg files are not supported. Export from Anki as Notes in Plain Text instead.',
          )
        } else {
          handleInlineError(`Unsupported file type "${ext}". Please upload a .txt or .csv file.`)
        }
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const raw = e.target?.result
        if (typeof raw !== 'string') {
          handleInlineError('Could not read file. Please try again.')
          return
        }
        const text = stripBom(raw)
        void parseAndEmit(text, file.name)
      }
      reader.onerror = () => {
        handleInlineError('Could not read file. Please try again.')
      }
      reader.readAsText(file, 'UTF-8')
    },
    [parseAndEmit, handleInlineError],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset so the same file can be re-selected
      e.target.value = ''
    },
    [processFile],
  )

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the drop zone entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const canPreview = pasteValue.trim().length > 0

  return (
    <div className={styles.uploader}>
      <div className={styles.header}>
        <h2 className={styles.title}>Import vocabulary</h2>
        <p className={styles.subtitle}>
          Paste a word list or upload a file — one word per line.
        </p>
      </div>

      {/* ── Paste textarea ────────────────────────────────────────────── */}
      <textarea
        className={styles.textarea}
        placeholder={'apple\nbanana\nephemeral\n…'}
        value={pasteValue}
        onChange={handlePasteChange}
        onKeyDown={handleKeyDown}
        rows={8}
        aria-label="Paste words to import"
        spellCheck={false}
        autoComplete="off"
      />

      {/* ── Or upload a file ──────────────────────────────────────────── */}
      <div
        className={[styles.dropZone, isDragOver ? styles.dropZoneActive : ''].join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="Drop zone for file upload"
      >
        <span className={styles.dropZoneText}>
          {isDragOver ? 'Drop to import' : 'Or upload a file'}
        </span>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          Choose .txt or .csv
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          className={styles.hiddenInput}
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* ── Inline error ─────────────────────────────────────────────── */}
      {inlineError && (
        <p className={styles.inlineError} role="alert">
          {inlineError}
        </p>
      )}

      {/* ── Primary CTA ──────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.previewBtn}
          onClick={handlePreviewImport}
          disabled={!canPreview}
          aria-label="Parse and preview the pasted word list"
        >
          Preview Import
        </button>
        {canPreview && (
          <p className={styles.shortcutHint} aria-hidden="true">
            ⌘↩ to preview
          </p>
        )}
      </div>
    </div>
  )
}

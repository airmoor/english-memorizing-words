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
}

interface ImportUploaderProps {
  onParsed: (rows: ParsedRow[], meta?: ParseMeta) => void
  onError?: (message: string) => void
}

export function ImportUploader({ onParsed, onError }: ImportUploaderProps) {
  const [pasteValue, setPasteValue] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      let result
      try {
        result = await parser.parse(input)
      } catch (err) {
        handleInlineError('Failed to parse file. Please check the format and try again.')
        return
      }

      // If the parser requires column mapping (Anki), delegate to the parent
      if (result.requiresColumnMapping) {
        onParsed([], { requiresColumnMapping: true, columnSuggestions: result.columnSuggestions, text, filename })
        return
      }

      const nonEmpty = result.rows.filter((r) => r.word.length > 0)
      if (nonEmpty.length === 0) {
        handleInlineError('No words found. Paste one word per line, or upload a .txt or .csv file.')
        return
      }
      onParsed(nonEmpty)
    },
    [onParsed, handleInlineError],
  )

  // ── Paste textarea with 200ms debounce ────────────────────────────────────

  const handlePasteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setPasteValue(value)
      setInlineError(null)

      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        if (value.trim()) {
          void parseAndEmit(value)
        }
      }, 200)
    },
    [parseAndEmit],
  )

  // ── File reading ──────────────────────────────────────────────────────────

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
    </div>
  )
}

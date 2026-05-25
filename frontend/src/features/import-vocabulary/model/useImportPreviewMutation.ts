import { useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { postImportPreview } from '../api/importApi'
import type { ParsedRow, ImportSettings, ImportPreviewResult } from '../../../entities/import-session/model/types'

interface PreviewPayload {
  rows: ParsedRow[]
  settings: ImportSettings
}

export function useImportPreviewMutation() {
  // Track the in-flight AbortController so we can cancel stale preview requests
  // when settings change mid-flight (debounced re-fire from ImportPreview).
  const controllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation<ImportPreviewResult, Error, PreviewPayload>({
    mutationFn: ({ rows, settings }) => {
      // Cancel any previous in-flight preview request
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      return postImportPreview(rows, settings, controller.signal)
    },
  })

  /** Cancel the current in-flight preview request, if any. */
  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  return { ...mutation, cancel }
}

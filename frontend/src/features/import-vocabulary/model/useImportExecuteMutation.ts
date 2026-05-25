import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postImportExecute } from '../api/importApi'
import type { ParsedRow, ImportSettings, ImportExecuteResult } from '../../../entities/import-session/model/types'

interface ExecutePayload {
  rows: ParsedRow[]
  settings: ImportSettings
}

export function useImportExecuteMutation() {
  const queryClient = useQueryClient()
  const controllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation<ImportExecuteResult, Error, ExecutePayload>({
    mutationFn: ({ rows, settings }) => {
      // Each execute call gets a fresh AbortController
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      return postImportExecute(rows, settings, controller.signal)
    },
    onSuccess: () => {
      controllerRef.current = null
      // Invalidate vocabulary and boards so the lists reflect the new cards
      void queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
  })

  /** Cancel the current in-flight execute request, if any. */
  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  return { ...mutation, cancel }
}

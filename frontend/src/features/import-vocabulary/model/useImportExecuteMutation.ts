import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postImportExecute } from '../api/importApi'
import type { ParsedRow, ImportSettings, ImportExecuteResult } from '../../../entities/import-session/model/types'

interface ExecutePayload {
  rows: ParsedRow[]
  settings: ImportSettings
}

export function useImportExecuteMutation() {
  const queryClient = useQueryClient()

  return useMutation<ImportExecuteResult, Error, ExecutePayload>({
    mutationFn: ({ rows, settings }) => postImportExecute(rows, settings),
    onSuccess: () => {
      // Invalidate vocabulary and boards so the lists reflect the new cards
      void queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
  })
}

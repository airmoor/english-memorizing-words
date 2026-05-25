import { useMutation } from '@tanstack/react-query'
import { postImportPreview } from '../api/importApi'
import type { ParsedRow, ImportSettings, ImportPreviewResult } from '../../../entities/import-session/model/types'

interface PreviewPayload {
  rows: ParsedRow[]
  settings: ImportSettings
}

export function useImportPreviewMutation() {
  return useMutation<ImportPreviewResult, Error, PreviewPayload>({
    mutationFn: ({ rows, settings }) => postImportPreview(rows, settings),
  })
}

import { useCallback } from 'react'
import { useBoardsQuery } from '../../boards/model/useBoardsQuery'
import type { ImportSettings as ImportSettingsType } from '../../../entities/import-session/model/types'
import styles from './ImportSettings.module.css'

interface ImportSettingsProps {
  settings: ImportSettingsType
  onChange: (settings: ImportSettingsType) => void
}

export function ImportSettings({ settings, onChange }: ImportSettingsProps) {
  const { data: boards = [] } = useBoardsQuery(false)
  const activeBoards = boards.filter((b) => !b.isArchived)

  const handleBoardChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...settings, boardId: e.target.value || undefined })
    },
    [settings, onChange],
  )

  const handleDuplicateModeChange = useCallback(
    (mode: 'skip' | 'import-anyway') => {
      onChange({ ...settings, duplicateMode: mode })
    },
    [settings, onChange],
  )

  return (
    <div className={styles.settings}>
      {/* ── Board assignment ─────────────────────────────────────────── */}
      <div className={styles.field}>
        <label htmlFor="import-board" className={styles.label}>
          Add to board
        </label>
        <select
          id="import-board"
          className={styles.select}
          value={settings.boardId ?? ''}
          onChange={handleBoardChange}
        >
          <option value="">None</option>
          {activeBoards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
        {/* Always rendered (not conditional) so the field height stays stable.
            Background + color transition when the selection changes. */}
        <p className={settings.boardId ? styles.hintWarning : styles.hint}>
          {settings.boardId
            ? 'Board column in file will be ignored — all words go to the selected board.'
            : 'Board column used per row (CSV only). Select a board above to override.'}
        </p>
      </div>

      {/* ── Duplicate mode ───────────────────────────────────────────── */}
      <div className={styles.field}>
        <span className={styles.label}>If a word is already in your vocabulary</span>
        <div className={styles.radioGroup}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="duplicateMode"
              value="skip"
              checked={settings.duplicateMode === 'skip'}
              onChange={() => handleDuplicateModeChange('skip')}
            />
            <span>
              <strong>Skip</strong>
              <span className={styles.radioHint}> — don't import again</span>
            </span>
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="duplicateMode"
              value="import-anyway"
              checked={settings.duplicateMode === 'import-anyway'}
              onChange={() => handleDuplicateModeChange('import-anyway')}
            />
            <span>
              <strong>Import anyway</strong>
              <span className={styles.radioHint}> — create another card</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

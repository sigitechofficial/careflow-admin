import * as React from 'react'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  InitialAssessmentPaperScoreRow,
  InitialAssessmentPaperScoreSection,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperScoreRow'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { cn } from '@/shared/lib/utils'
import { IA_FORM_TEXTAREA_COMPACT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { section12PanelTitle } from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import {
  normalizeTransferMatrix,
  TRANSFER_MATRIX_ROWS,
  type TransferMatrixMetadata,
  type TransferMatrixRow,
} from '@/features/service-users/initial-assessment/utils/mobility-metadata'

type Props = {
  value: TransferMatrixMetadata
  disabled?: boolean
  onChange: (next: TransferMatrixMetadata) => void
}

export function InitialAssessmentTransferMatrixPanel({ value, disabled, onChange }: Props) {
  const rows = React.useMemo(() => normalizeTransferMatrix(value), [value])

  const updateRow = (id: string, level: number | null) => {
    const nextRows = rows.map((r) => (r.id === id ? { ...r, level } : r))
    onChange({ ...value, rows: nextRows })
  }

  const scoredTotal = rows.reduce(
    (s, r) => s + (r.level != null && !Number.isNaN(r.level) ? r.level : 0),
    0,
  )
  const highSupport = rows.filter((r) => r.level != null && r.level >= 2).length

  return (
    <InitialAssessmentSection12PanelShell
      title={section12PanelTitle('12.5c')}
      hint="Tick one score (0–4) per transfer, or N/A. Score 2+ suggests a moving & handling plan; 3+ suggests double-up care."
      testId="ia-transfer-matrix"
      bodyVariant="content"
    >
      <InitialAssessmentPaperScoreSection meta={`Subtotal: ${scoredTotal}`}>
        <div className="min-w-0">
          {TRANSFER_MATRIX_ROWS.map((def) => {
            const row = rows.find((r) => r.id === def.id)
            if (!row) return null
            return (
              <TransferPaperRow
                key={def.id}
                row={row}
                disabled={disabled}
                onLevel={(level) => updateRow(def.id, level)}
              />
            )
          })}
        </div>
      </InitialAssessmentPaperScoreSection>

      {highSupport > 0 ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          {highSupport} transfer{highSupport === 1 ? '' : 's'} scored 2+ — review moving &amp; handling
          plan and equipment (§12.8).
        </p>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="transfer-comments" className="text-sm font-medium">
          Transfer comments
        </Label>
        <Textarea
          id="transfer-comments"
          disabled={disabled}
          rows={2}
          className={cn(IA_FORM_TEXTAREA_COMPACT_CLASS)}
          placeholder="Optional"
          value={value.comments ?? ''}
          onChange={(e) => onChange({ ...value, comments: e.target.value })}
        />
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}

function TransferPaperRow({
  row,
  disabled,
  onLevel,
}: {
  row: TransferMatrixRow
  disabled?: boolean
  onLevel: (level: number | null) => void
}) {
  return (
    <InitialAssessmentPaperScoreRow
      label={row.label}
      value={row.level}
      name={`transfer-${row.id}`}
      disabled={disabled}
      allowNotApplicable
      onChange={onLevel}
    />
  )
}

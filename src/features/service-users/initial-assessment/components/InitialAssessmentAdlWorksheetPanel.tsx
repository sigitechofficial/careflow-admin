import * as React from 'react'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'
import {
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CALLOUT_TITLE_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  SECTION_12_ADL_WORKSHEET_PANEL_TITLE,
  section12PanelTitle,
} from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import { specRefLabel } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  InitialAssessmentPaperScoreRow,
  InitialAssessmentPaperScoreSection,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperScoreRow'
import {
  ADL_SCORE_LEGEND,
  ADL_WORKSHEET_GROUPS,
  adlDependencyBand,
  adlWorksheetTotal,
  normalizeAdlWorksheetRows,
  type AdlWorksheetGroup,
  type AdlWorksheetMetadata,
  type AdlWorksheetRow,
} from '@/features/service-users/initial-assessment/utils/adl-scoring'

type Props = {
  value: AdlWorksheetMetadata
  disabled?: boolean
  /** `scores` = §12.1 legend + §12.2–12.5 grid; `total` = §12.6 total only */
  section: 'scores' | 'total'
  onChange: (next: AdlWorksheetMetadata) => void
}

type GroupBlockProps = {
  group: AdlWorksheetGroup
  rows: AdlWorksheetRow[]
  disabled?: boolean
  onScore: (id: string, score: number) => void
}

function AdlPaperGroupBlock({ group, rows, disabled, onScore }: GroupBlockProps) {
  const groupTotal = group.activities.reduce((s, a) => {
    const row = rows.find((r) => r.id === a.id)
    return s + (row?.score ?? 0)
  }, 0)

  return (
    <InitialAssessmentPaperScoreSection
      title={specRefLabel(group.specRef)}
      meta={`Subtotal: ${groupTotal}`}
    >
      <div className="min-w-0">
        {group.activities.map((act) => {
          const row = rows.find((r) => r.id === act.id)
          if (!row) return null
          return (
            <InitialAssessmentPaperScoreRow
              key={act.id}
              label={row.activity}
              value={row.score}
              name={`adl-${group.id}-${act.id}`}
              disabled={disabled}
              onChange={(score) => onScore(act.id, score ?? 0)}
            />
          )
        })}
      </div>
    </InitialAssessmentPaperScoreSection>
  )
}

export function InitialAssessmentAdlWorksheetPanel({
  value,
  disabled,
  section,
  onChange,
}: Props) {
  const rows = React.useMemo(() => normalizeAdlWorksheetRows(value.rows), [value.rows])
  const total = adlWorksheetTotal(rows)
  const band = adlDependencyBand(total)

  const updateRow = (id: string, rowPatch: Partial<AdlWorksheetRow>) => {
    const nextRows = rows.map((r) => (r.id === id ? { ...r, ...rowPatch } : r))
    onChange({ ...value, rows: nextRows })
  }

  if (section === 'total') {
    return (
      <InitialAssessmentSection12PanelShell
        title={section12PanelTitle('12.6')}
        testId="ia-adl-total"
        bodyVariant="content"
      >
        <InitialAssessmentPaperScoreSection meta={`${total} — ${band}`}>
          <p className="px-1 py-2 text-sm font-semibold text-foreground">
            Total score: <span className="text-teal-800 dark:text-teal-300">{total}</span>
            <span className="ml-2 font-normal text-muted-foreground">({band})</span>
          </p>
        </InitialAssessmentPaperScoreSection>
        <div className="space-y-1">
          <Label htmlFor="ia-adl-additional-comments" className={IA_QUESTION_LABEL_CLASS}>
            ADL worksheet comments
          </Label>
          <Textarea
            id="ia-adl-additional-comments"
            disabled={disabled}
            rows={3}
            className={IA_FORM_TEXTAREA_COMPACT_CLASS}
            placeholder="Optional"
            value={value.additionalComments ?? ''}
            onChange={(e) => onChange({ ...value, rows, additionalComments: e.target.value })}
          />
        </div>
      </InitialAssessmentSection12PanelShell>
    )
  }

  return (
    <InitialAssessmentSection12PanelShell
      title={SECTION_12_ADL_WORKSHEET_PANEL_TITLE}
      hint="Tick one score (0–4) per activity."
      testId="ia-adl-worksheet"
      bodyVariant="content"
    >
      <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'space-y-1 text-sm leading-snug')}>
        <p className={IA_CALLOUT_TITLE_CLASS}>{section12PanelTitle('12.1')}</p>
        {ADL_SCORE_LEGEND.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="space-y-3">
        {ADL_WORKSHEET_GROUPS.map((group) => (
          <AdlPaperGroupBlock
            key={group.id}
            group={group}
            rows={rows}
            disabled={disabled}
            onScore={(id, score) => updateRow(id, { score })}
          />
        ))}
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}

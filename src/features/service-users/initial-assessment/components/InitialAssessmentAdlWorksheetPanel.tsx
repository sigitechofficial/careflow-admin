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
  /** Omit outer §12 panel shell (paper Section 7 composite block). */
  embedded?: boolean
  /** Use paper subsection letters (d. Self care, …) instead of spec labels. */
  paperLabels?: boolean
  /** When `section` is `total`, include the comments textarea. */
  includeComments?: boolean
  commentsLabel?: string
  onChange: (next: AdlWorksheetMetadata) => void
}

type GroupBlockProps = {
  group: AdlWorksheetGroup
  rows: AdlWorksheetRow[]
  disabled?: boolean
  paperLabels?: boolean
  onScore: (id: string, score: number) => void
}

function AdlPaperGroupBlock({ group, rows, disabled, paperLabels, onScore }: GroupBlockProps) {
  const groupTotal = group.activities.reduce((s, a) => {
    const row = rows.find((r) => r.id === a.id)
    return s + (row?.score ?? 0)
  }, 0)

  return (
    <InitialAssessmentPaperScoreSection
      title={paperLabels ? group.paperLabel : specRefLabel(group.specRef)}
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
  embedded = false,
  paperLabels = false,
  includeComments = true,
  commentsLabel = 'ADL worksheet comments',
  onChange,
}: Props) {
  const rows = React.useMemo(() => normalizeAdlWorksheetRows(value.rows), [value.rows])
  const total = adlWorksheetTotal(rows)
  const band = adlDependencyBand(total)

  const updateRow = (id: string, rowPatch: Partial<AdlWorksheetRow>) => {
    const nextRows = rows.map((r) => (r.id === id ? { ...r, ...rowPatch } : r))
    onChange({ ...value, rows: nextRows })
  }

  const totalBody = (
    <>
      <InitialAssessmentPaperScoreSection meta={`${total} — ${band}`}>
        <p className="px-1 py-2 text-sm font-semibold text-foreground">
          Total score: <span className="text-teal-800 dark:text-teal-300">{total}</span>
          <span className="ml-2 font-normal text-muted-foreground">({band})</span>
        </p>
      </InitialAssessmentPaperScoreSection>
      {includeComments ? (
        <div className="space-y-1">
          <Label htmlFor="ia-adl-additional-comments" className={IA_QUESTION_LABEL_CLASS}>
            {commentsLabel}
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
      ) : null}
    </>
  )

  if (section === 'total') {
    if (embedded) {
      return (
        <div data-testid="ia-adl-total" className="space-y-3">
          {totalBody}
        </div>
      )
    }
    return (
      <InitialAssessmentSection12PanelShell
        title={section12PanelTitle('12.6')}
        testId="ia-adl-total"
        bodyVariant="content"
      >
        {totalBody}
      </InitialAssessmentSection12PanelShell>
    )
  }

  const scoresBody = (
    <>
      <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'space-y-1 text-sm leading-snug')}>
        {!paperLabels ? (
          <p className={IA_CALLOUT_TITLE_CLASS}>{section12PanelTitle('12.1')}</p>
        ) : null}
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
            paperLabels={paperLabels}
            onScore={(id, score) => updateRow(id, { score })}
          />
        ))}
      </div>
    </>
  )

  if (embedded) {
    return (
      <div data-testid="ia-adl-worksheet" className="space-y-4">
        {scoresBody}
      </div>
    )
  }

  return (
    <InitialAssessmentSection12PanelShell
      title={SECTION_12_ADL_WORKSHEET_PANEL_TITLE}
      hint="Tick one score (0–4) per activity."
      testId="ia-adl-worksheet"
      bodyVariant="content"
    >
      {scoresBody}
    </InitialAssessmentSection12PanelShell>
  )
}

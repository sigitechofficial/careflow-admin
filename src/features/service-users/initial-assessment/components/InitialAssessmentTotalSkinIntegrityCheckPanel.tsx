import { ExternalLink } from 'lucide-react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import {
  SKIN_INTEGRITY_CHECK_COMPLETION_NOTES,
  type SkinIntegrityCheckMetadata,
  type SkinIntegrityCheckRow,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { IA_FORM_TEXTAREA_COMPACT_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'

const BODY_DIAGRAM_URL = '/assets/body-map-diagram.png'

type Props = {
  value: SkinIntegrityCheckMetadata
  disabled?: boolean
  showBodyMapCta?: boolean
  onOpenBodyMap?: () => void
  onOpenWaterlowTab?: () => void
  onChange: (next: SkinIntegrityCheckMetadata) => void
}

function updateRow(
  rows: SkinIntegrityCheckRow[],
  id: string,
  side: 'right' | 'left',
  text: string,
): SkinIntegrityCheckRow[] {
  return rows.map((row) => (row.id === id ? { ...row, [side]: text } : row))
}

export function InitialAssessmentTotalSkinIntegrityCheckPanel({
  value,
  disabled,
  showBodyMapCta,
  onOpenBodyMap,
  onOpenWaterlowTab,
  onChange,
}: Props) {
  const rows = value.rows

  return (
    <div className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-total-skin-integrity-check">
      <HolisticSectionHeader title="Total skin integrity check" />

      <div className="border border-slate-300 bg-white p-4 dark:border-slate-600">
        <div className="mb-4 flex flex-wrap items-start justify-center gap-6">
          <figure className="text-center">
            <img
              src={BODY_DIAGRAM_URL}
              alt="Front view body diagram for skin integrity check"
              className="mx-auto h-auto max-h-56 w-auto max-w-[180px] object-contain"
            />
            <figcaption className="mt-1 flex justify-between px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Right</span>
              <span>Left</span>
            </figcaption>
          </figure>
          <figure className="text-center">
            <img
              src={BODY_DIAGRAM_URL}
              alt="Back view body diagram for skin integrity check"
              className="mx-auto h-auto max-h-56 w-auto max-w-[180px] scale-x-[-1] object-contain"
            />
            <figcaption className="mt-1 flex justify-between px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Left</span>
              <span>Right</span>
            </figcaption>
          </figure>
        </div>

        {(onOpenWaterlowTab || (showBodyMapCta && onOpenBodyMap)) ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {onOpenWaterlowTab ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenWaterlowTab}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Open Waterlow tab
              </Button>
            ) : null}
            {showBodyMapCta && onOpenBodyMap ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenBodyMap}>
                Open body map
              </Button>
            ) : null}
          </div>
        ) : null}

        <HolisticAssessmentTable
          columns={[
            { key: 'part', header: 'Body part', className: 'w-[32%]' },
            { key: 'right', header: 'Right', className: 'w-[34%]' },
            { key: 'left', header: 'Left', className: 'w-[34%]' },
          ]}
        >
          {rows.map((row) => (
            <HolisticAssessmentTableRow key={row.id}>
              <HolisticAssessmentTableCell className="align-top font-medium text-sm">
                {row.label}
              </HolisticAssessmentTableCell>
              <HolisticAssessmentTableCell className="align-top">
                <Textarea
                  disabled={disabled}
                  rows={2}
                  aria-label={`${row.label} — right`}
                  className={cn('min-h-[2.5rem]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  value={row.right}
                  onChange={(e) =>
                    onChange({ rows: updateRow(rows, row.id, 'right', e.target.value) })
                  }
                />
              </HolisticAssessmentTableCell>
              <HolisticAssessmentTableCell className="align-top">
                <Textarea
                  disabled={disabled}
                  rows={2}
                  aria-label={`${row.label} — left`}
                  className={cn('min-h-[2.5rem]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  value={row.left}
                  onChange={(e) =>
                    onChange({ rows: updateRow(rows, row.id, 'left', e.target.value) })
                  }
                />
              </HolisticAssessmentTableCell>
            </HolisticAssessmentTableRow>
          ))}
        </HolisticAssessmentTable>

        <p className={cn('mt-4 border-t border-slate-200 pt-3 text-xs italic', IA_HINT_CLASS)}>
          <span className="font-medium not-italic">Notes for completion:</span>{' '}
          {SKIN_INTEGRITY_CHECK_COMPLETION_NOTES}
        </p>
      </div>
    </div>
  )
}

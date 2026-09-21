import { Link } from '@tanstack/react-router'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { initialAssessmentBodyMapSearch } from '@/features/service-users/initial-assessment/utils/body-map-navigation'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import {
  SKIN_INTEGRITY_CHECK_COMPLETION_NOTES,
  type SkinIntegrityCheckMetadata,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { IA_FORM_TEXTAREA_COMPACT_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { plainTextFromHtml } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'

const BODY_DIAGRAM_URL = '/assets/body-map-diagram.png'

type Props = {
  value: SkinIntegrityCheckMetadata
  disabled?: boolean
  serviceUserId?: string
  submissionId?: string | null
  onSyncBodyMap?: () => void
  syncBodyMapLoading?: boolean
  onOpenWaterlowTab?: () => void
  onRowSideChange: (rowId: string, side: 'right' | 'left', text: string) => void
}

export function InitialAssessmentTotalSkinIntegrityCheckPanel({
  value,
  disabled,
  serviceUserId,
  submissionId,
  onSyncBodyMap,
  syncBodyMapLoading = false,
  onOpenWaterlowTab,
  onRowSideChange,
}: Props) {
  const rows = value.rows

  return (
    <div className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-total-skin-integrity-check">
      <HolisticSectionHeader title="Total skin integrity check" />

      <div className="border border-slate-300 bg-white p-4 dark:bg-card dark:border-slate-600">
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

        {onOpenWaterlowTab || serviceUserId || onSyncBodyMap ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {onOpenWaterlowTab ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenWaterlowTab}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Open Waterlow tab
              </Button>
            ) : null}
            {serviceUserId ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link
                  to="/service-users/$serviceUserId/body-map"
                  params={{ serviceUserId }}
                  search={initialAssessmentBodyMapSearch(submissionId)}
                >
                  Open body map
                </Link>
              </Button>
            ) : null}
            {onSyncBodyMap ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || syncBodyMapLoading}
                onClick={onSyncBodyMap}
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', syncBodyMapLoading && 'animate-spin')}
                  aria-hidden
                />
                Sync from body map
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
                  key={`${row.id}-right`}
                  id={`skin-integrity-${row.id}-right`}
                  disabled={disabled}
                  rows={2}
                  aria-label={`${row.label} — right`}
                  className={cn('min-h-[2.5rem]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  value={plainTextFromHtml(row.right ?? '')}
                  onChange={(e) => onRowSideChange(row.id, 'right', e.target.value)}
                />
              </HolisticAssessmentTableCell>
              <HolisticAssessmentTableCell className="align-top">
                <Textarea
                  key={`${row.id}-left`}
                  id={`skin-integrity-${row.id}-left`}
                  disabled={disabled}
                  rows={2}
                  aria-label={`${row.label} — left`}
                  className={cn('min-h-[2.5rem]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  value={plainTextFromHtml(row.left ?? '')}
                  onChange={(e) => onRowSideChange(row.id, 'left', e.target.value)}
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

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { HOLISTIC_FOOTER_GRID_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import type { ServiceUserDetail } from '@/features/service-users/api'

type Props = {
  /** Kept for existing callers; the name is no longer shown. */
  clientName?: string
  dateCompleted?: string
  assessorNameDesignation?: string
  disabled?: boolean
  onDateChange?: (iso: string) => void
  onAssessorChange?: (value: string) => void
  /** Kept for existing callers; the name is no longer shown. */
  serviceUserDetail?: ServiceUserDetail | null
}

/** "Completed on / by" for a specialist tool. The client's name is already in the page header. */
export function HolisticFooterFields({
  dateCompleted,
  assessorNameDesignation,
  disabled,
  onDateChange,
  onAssessorChange,
}: Props) {
  return (
    <footer className={HOLISTIC_FOOTER_GRID_CLASS} data-testid="ia-holistic-footer">
      <div className="space-y-1">
        <Label htmlFor="ia-holistic-footer-date" className="text-xs font-medium text-muted-foreground">
          Date completed
        </Label>
        <Input
          id="ia-holistic-footer-date"
          type="date"
          className="h-9 bg-background"
          disabled={disabled}
          value={dateCompleted?.slice(0, 10) ?? ''}
          onChange={(e) =>
            onDateChange?.(e.target.value ? `${e.target.value}T00:00:00.000Z` : '')
          }
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="ia-holistic-footer-assessor" className="text-xs font-medium text-muted-foreground">
          Assessor name and designation
        </Label>
        <Input
          id="ia-holistic-footer-assessor"
          className="h-9 bg-background"
          disabled={disabled}
          placeholder="Name and role"
          value={assessorNameDesignation ?? ''}
          onChange={(e) => onAssessorChange?.(e.target.value)}
        />
      </div>
    </footer>
  )
}

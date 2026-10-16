import * as React from 'react'

import { useUpsertEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import type { EmployeePayrollProfile } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type DirectorChoice = 'UNCLASSIFIED' | 'NOT_DIRECTOR' | 'DIRECTOR'

type DirectorFields = Pick<EmployeePayrollProfile, 'isDirector' | 'directorAppointedOn' | 'directorNicMethod'>

const choiceFrom = (isDirector: boolean | null | undefined): DirectorChoice =>
  isDirector == null ? 'UNCLASSIFIED' : isDirector ? 'DIRECTOR' : 'NOT_DIRECTOR'

/** The saved director classification, in words (Gate C8). */
export function directorStatusLabel(profile: DirectorFields | null | undefined): string {
  if (profile?.isDirector == null) return 'Not yet classified'
  if (!profile.isDirector) return 'Not a director'
  return profile.directorAppointedOn ? `Director since ${profile.directorAppointedOn}` : 'Director (no appointment date)'
}

/**
 * Gate C8: classify an employee as a company director or not, for National Insurance. Saves only
 * the director fields through the existing profile save, so the other profile fields are left as
 * they are. Nothing is classified for the person: an unclassified profile stays unclassified (tax
 * and NI are then not calculated) until someone chooses.
 */
export function DirectorStatusSection({
  employeeId,
  profile,
  canEdit,
}: {
  employeeId: string
  profile: DirectorFields | null | undefined
  canEdit: boolean
}) {
  const save = useUpsertEmployeePayrollProfile(employeeId)
  const saved = choiceFrom(profile?.isDirector)
  const [choice, setChoice] = React.useState<DirectorChoice>(saved)
  const [appointedOn, setAppointedOn] = React.useState(profile?.directorAppointedOn ?? '')

  React.useEffect(() => {
    setChoice(choiceFrom(profile?.isDirector))
    setAppointedOn(profile?.directorAppointedOn ?? '')
  }, [profile?.isDirector, profile?.directorAppointedOn])

  const needsDate = choice === 'DIRECTOR' && !appointedOn
  const error = save.error instanceof Error ? save.error.message : null

  const onSave = () => {
    if (choice === 'NOT_DIRECTOR') void save.mutateAsync({ isDirector: false }).catch(() => undefined)
    if (choice === 'DIRECTOR' && appointedOn) {
      void save
        .mutateAsync({ isDirector: true, directorAppointedOn: appointedOn, directorNicMethod: 'AN' })
        .catch(() => undefined)
    }
  }

  const option = (value: DirectorChoice, label: string, disabled = false) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name={`director-status-${employeeId}`}
        value={value}
        checked={choice === value}
        disabled={!canEdit || disabled}
        onChange={() => setChoice(value)}
      />
      <span>{label}</span>
    </label>
  )

  return (
    <section className="space-y-2 rounded-md border border-border p-3" data-testid="director-status">
      <h3 className="text-sm font-medium">Director / National Insurance status</h3>
      <p className="text-xs text-muted-foreground" data-testid="director-status-saved">
        Saved: <span className="font-medium text-foreground">{directorStatusLabel(profile)}</span>
      </p>
      {saved === 'UNCLASSIFIED' ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Tax and NI are not calculated for this person until you record whether they are a company director.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Director status">
        {option('UNCLASSIFIED', 'Not yet classified', saved !== 'UNCLASSIFIED')}
        {option('NOT_DIRECTOR', 'Not a director')}
        {option('DIRECTOR', 'Director')}
      </div>
      {choice === 'DIRECTOR' ? (
        <div className="space-y-1">
          <label className="block space-y-1 text-sm">
            <span>Date appointed director</span>
            <Input
              type="date"
              value={appointedOn}
              onChange={(e) => setAppointedOn(e.target.value)}
              aria-label="Date appointed director"
              disabled={!canEdit}
              className="sm:max-w-xs"
            />
          </label>
          {needsDate ? <p className="text-xs text-destructive">Enter the date the person was appointed a director.</p> : null}
          <p className="text-xs text-muted-foreground">
            NI method: AN (the standard annual earnings period). The alternative method (AL) is not supported yet.
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {canEdit ? (
        <Button
          size="sm"
          variant="outline"
          disabled={save.isPending || choice === 'UNCLASSIFIED' || needsDate}
          onClick={onSave}
        >
          Save director status
        </Button>
      ) : null}
    </section>
  )
}

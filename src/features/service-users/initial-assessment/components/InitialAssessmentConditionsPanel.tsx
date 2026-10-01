import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import {
  useMedicalConditionCatalog,
  useServiceUserMedicalConditions,
} from '@/features/alerts/hooks/useMedicalClinical'
import {
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  newConditionProposal,
  type ConditionProposal,
} from '@/features/service-users/initial-assessment/utils/condition-proposals'

type Props = {
  serviceUserId: string
  proposals: ConditionProposal[]
  disabled?: boolean
  onChange: (next: ConditionProposal[]) => void
}

/**
 * Current conditions (Personal Details → health). The service user's conditions record is shown
 * read-only; conditions found at the assessment are staged here and added to the record on submit
 * (existing entries are never overwritten — differences go to the office).
 */
export function InitialAssessmentConditionsPanel({ serviceUserId, proposals, disabled, onChange }: Props) {
  const registerQuery = useServiceUserMedicalConditions(serviceUserId)
  const [search, setSearch] = React.useState('')
  const catalogQuery = useMedicalConditionCatalog(search, !disabled && search.trim().length >= 2)
  const register = (registerQuery.data ?? []).filter((r) => r.isActive && r.status === 'ACTIVE')
  const onRegister = new Set(register.map((r) => r.conditionId))
  const staged = new Set(proposals.map((p) => p.conditionId))

  const add = (conditionId: string, conditionName: string) => {
    if (staged.has(conditionId)) return
    onChange([...proposals, newConditionProposal(conditionId, conditionName)])
    setSearch('')
  }
  const update = (id: string, patch: Partial<ConditionProposal>) =>
    onChange(proposals.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const remove = (id: string) => onChange(proposals.filter((p) => p.id !== id))

  const text = (p: ConditionProposal, key: 'impactOnCare' | 'carerGuidance', label: string) => (
    <div className="space-y-1">
      <Label className={IA_QUESTION_LABEL_CLASS}>{label}</Label>
      <Textarea
        rows={2}
        className="min-h-[56px]"
        value={p[key] ?? ''}
        disabled={disabled}
        aria-label={`${p.conditionName ?? 'Condition'} — ${label}`}
        onChange={(e) => update(p.id, { [key]: e.target.value })}
      />
    </div>
  )

  return (
    <div className="space-y-3" data-testid="ia-conditions-panel">
      <div>
        <p className="text-sm font-semibold">Current conditions</p>
        <p className={IA_HINT_CLASS}>
          Diagnosed conditions and how they affect care. New conditions are added to the service user&apos;s record
          when the assessment is submitted; the record itself is never overwritten.
        </p>
      </div>

      <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')} data-testid="ia-conditions-register">
        <p className="font-medium">On the service user&apos;s record</p>
        {registerQuery.isLoading ? (
          <p className={IA_HINT_CLASS}>Loading…</p>
        ) : register.length ? (
          <ul className="mt-1 space-y-1">
            {register.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{r.condition?.name ?? 'Condition'}</span>
                {r.impactOnCare ? <span className={IA_HINT_CLASS}> — {r.impactOnCare}</span> : null}
                {r.confirmationSource ? null : <span className={IA_HINT_CLASS}> (reported, not confirmed)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={IA_HINT_CLASS}>No current conditions recorded.</p>
        )}
      </div>

      {proposals.map((p) => (
        <div key={p.id} className="space-y-2 rounded-md border border-border p-3" data-testid="ia-condition-proposal">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {p.conditionName ?? 'Condition'}
              <span className={cn(IA_HINT_CLASS, 'ml-2 font-normal')}>
                {onRegister.has(p.conditionId) ? 'Already on the record — adds missing details only' : 'New — added on submit'}
              </span>
            </p>
            {!disabled ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(p.id)}>
                Remove
              </Button>
            ) : null}
          </div>
          {text(p, 'impactOnCare', 'How it affects daily life and care')}
          {text(p, 'carerGuidance', 'Warning signs and what carers should do')}
          <div className="space-y-1">
            <Label className={IA_QUESTION_LABEL_CLASS}>Confirmed from (leave blank if reported only)</Label>
            <Input
              value={p.confirmationSource ?? ''}
              disabled={disabled}
              placeholder="e.g. GP summary, hospital discharge letter"
              aria-label={`${p.conditionName ?? 'Condition'} — confirmed from`}
              onChange={(e) => update(p.id, { confirmationSource: e.target.value })}
            />
          </div>
        </div>
      ))}

      {!disabled ? (
        <div className="space-y-1">
          <Label className={IA_QUESTION_LABEL_CLASS}>Add a condition</Label>
          <Input
            value={search}
            placeholder="Type at least 2 letters, e.g. diabetes"
            aria-label="Search conditions"
            onChange={(e) => setSearch(e.target.value)}
            data-testid="ia-conditions-search"
          />
          {search.trim().length >= 2 ? (
            <div className="flex flex-wrap gap-2" data-testid="ia-conditions-results">
              {(catalogQuery.data ?? [])
                .filter((c) => c.isActive && !staged.has(c.id))
                .slice(0, 12)
                .map((c) => (
                  <Button key={c.id} type="button" size="sm" variant="outline" onClick={() => add(c.id, c.name)}>
                    {c.name}
                    {onRegister.has(c.id) ? ' (on record)' : ''}
                  </Button>
                ))}
              {catalogQuery.data && !catalogQuery.data.length ? (
                <p className={IA_HINT_CLASS}>No matching condition in the catalogue.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

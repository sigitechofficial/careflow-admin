import * as React from 'react'
import { AlertTriangle, Phone, UserRound } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ServiceUserAddContactDialog } from '@/features/service-users/components/ServiceUserAddContactDialog'
import { cn } from '@/shared/lib/utils'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { findQuestionBySpecRef, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { parseQuestionOptions } from '@/features/service-users/initial-assessment/utils/question-options'
import { groupQuestionsBySpecRef } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import {
  IA_CALLOUT_TITLE_CLASS,
  IA_CHECKBOX_CLASS,
  IA_OPTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { ReactNode } from 'react'

type Props = {
  serviceUserId: string
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  serviceUserDetail: ServiceUserDetail | null | undefined
  disabled: boolean
  onSyncEmergencyContact: () => void
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
  visibleQuestions: InitialAssessmentQuestion[]
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}

export function InitialAssessmentSafeguardingSection({
  serviceUserId,
  sections,
  draftAnswers,
  serviceUserDetail,
  disabled,
  onSyncEmergencyContact,
  renderField,
  renderMultiSelect,
  visibleQuestions,
  onChange,
}: Props) {
  const safeguardingQ = findQuestionBySpecRef(sections, '13.1')
  const emergencyRecordedQ = findQuestionBySpecRef(sections, '13.3')
  const concernActive = safeguardingQ && isYesAnswer(draftAnswers[safeguardingQ.id])

  const emergencyContacts =
    serviceUserDetail?.contacts?.filter((c) => c.isEmergencyContact) ??
    serviceUserDetail?.contacts?.filter((c) => c.isPrimary) ??
    []
  const hasProfileEmergency = emergencyContacts.length > 0
  const emergencyRecorded = emergencyRecordedQ && isYesAnswer(draftAnswers[emergencyRecordedQ.id])

  const abuseTypesQ = visibleQuestions.find((q) =>
    q.questionText.toLowerCase().includes('safeguarding concern types'),
  )
  const immediateQs = visibleQuestions.filter((q) => {
    const t = q.questionText.toLowerCase()
    return (
      t.includes('immediate action') ||
      t.includes('manager informed') ||
      t.includes('safeguarding referral required') ||
      t.includes('safeguarding referral made') ||
      t.includes('safeguarding reference') ||
      t.includes('risk matrix entry')
    )
  })
  const detailQs = visibleQuestions.filter((q) => q.questionText.toLowerCase().includes('safeguarding concern details'))

  const panelQuestionIds = new Set(
    [
      safeguardingQ,
      abuseTypesQ,
      emergencyRecordedQ,
      ...immediateQs,
      ...detailQs,
    ]
      .filter(Boolean)
      .map((q) => q!.id),
  )

  const otherQs = visibleQuestions.filter((q) => !panelQuestionIds.has(q.id))
  const otherGroups = groupQuestionsBySpecRef(otherQs, 13).filter((g) => g.specRef !== '13.1' && g.specRef !== '13.2')

  return (
    <div className="space-y-6" data-testid="ia-safeguarding-section">
      {concernActive ? (
        <div
          className="flex flex-wrap items-start gap-3 rounded-md border border-border/80 border-l-4 border-l-destructive bg-muted/30 px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className={cn(IA_CALLOUT_TITLE_CLASS, 'text-foreground')}>Safeguarding concern flagged</p>
            <p className="mt-1 text-muted-foreground">
              Record concern types, immediate actions, and notify your manager. Manager review will be required
              on submit.
            </p>
          </div>
        </div>
      ) : null}

      <InitialAssessmentSection12PanelShell title="13.1 Safeguarding concern" bodyVariant="content">
        {safeguardingQ ? (
          <InitialAssessmentSection12FieldRow>{renderField(safeguardingQ)}</InitialAssessmentSection12FieldRow>
        ) : null}
      </InitialAssessmentSection12PanelShell>

      {concernActive && abuseTypesQ ? (
        <SafeguardingAbuseTypeGrid
          question={abuseTypesQ}
          draftAnswers={draftAnswers}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}

      {concernActive && detailQs.length > 0 ? (
        <InitialAssessmentSection12PanelShell title="Concern details" bodyVariant="content">
          <InitialAssessmentPanelFieldList questions={detailQs} renderField={renderField} renderMultiSelect={renderMultiSelect} />
        </InitialAssessmentSection12PanelShell>
      ) : null}

      {concernActive && immediateQs.length > 0 ? (
        <InitialAssessmentSection12PanelShell
          title="13.7 Immediate action & referrals"
          hint="Document what was done at the time of identification — do not delay manager notification."
          bodyVariant="content"
        >
          <InitialAssessmentPanelFieldList questions={immediateQs} renderField={renderField} renderMultiSelect={renderMultiSelect} />
        </InitialAssessmentSection12PanelShell>
      ) : null}

      <InitialAssessmentEmergencyContactsPanel
        serviceUserId={serviceUserId}
        contacts={serviceUserDetail?.contacts ?? []}
        emergencyRecorded={Boolean(emergencyRecorded)}
        hasProfileEmergency={hasProfileEmergency}
        disabled={disabled}
        onSync={onSyncEmergencyContact}
      />

      {emergencyRecordedQ ? (
        <InitialAssessmentSection12PanelShell title="13.3 Emergency contacts" bodyVariant="content">
          <InitialAssessmentSection12FieldRow>{renderField(emergencyRecordedQ)}</InitialAssessmentSection12FieldRow>
        </InitialAssessmentSection12PanelShell>
      ) : null}

      {otherGroups.map((group) => (
        <InitialAssessmentSection12PanelShell
          key={group.specRef}
          title={group.label}
          testId={`ia-spec-group-${group.specRef}`}
          bodyVariant="content"
        >
          <InitialAssessmentPanelFieldList
            questions={group.questions}
            renderField={renderField}
            renderMultiSelect={renderMultiSelect}
          />
        </InitialAssessmentSection12PanelShell>
      ))}
    </div>
  )
}

function SafeguardingAbuseTypeGrid({
  question,
  draftAnswers,
  disabled,
  onChange,
}: {
  question: InitialAssessmentQuestion
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  disabled: boolean
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}) {
  const options = parseQuestionOptions(question.options)
  const selected = new Set(
    (() => {
      const raw = draftAnswers[question.id]?.selectedOptions
      if (Array.isArray(raw)) return raw.map(String)
      if (typeof raw === 'string' && raw) return [raw]
      return []
    })(),
  )

  const toggle = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(question.id, { questionId: question.id, selectedOptions: [...next] })
  }

  return (
    <InitialAssessmentSection12PanelShell title="13.2 Concern types" bodyVariant="content">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((opt) => {
          const active = selected.has(opt.value)
          return (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                IA_OPTION_LABEL_CLASS,
                active
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
                  : 'border-border bg-muted/20 hover:bg-muted/40',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="checkbox"
                className={cn('mt-0.5', IA_CHECKBOX_CLASS)}
                checked={active}
                disabled={disabled}
                onChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}

type EmergencyProps = {
  serviceUserId: string
  contacts: ServiceUserDetail['contacts']
  emergencyRecorded: boolean
  hasProfileEmergency: boolean
  disabled: boolean
  onSync: () => void
}

export function InitialAssessmentEmergencyContactsPanel({
  serviceUserId,
  contacts,
  emergencyRecorded,
  hasProfileEmergency,
  disabled,
  onSync,
}: EmergencyProps) {
  const [addContactOpen, setAddContactOpen] = React.useState(false)
  const emergency = contacts?.filter((c) => c.isEmergencyContact) ?? []
  const display = emergency.length > 0 ? emergency : contacts?.slice(0, 3) ?? []

  return (
    <InitialAssessmentSection12PanelShell
      title="Emergency contacts (from profile)"
      hint='Add or sync contacts from the service user profile — mark "Emergency contact 1 recorded" when verified.'
      bodyVariant="content"
    >
      <div className="flex flex-wrap justify-end">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setAddContactOpen(true)}>
            Add contact
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled || !hasProfileEmergency} onClick={onSync}>
            Sync from contacts
          </Button>
        </div>
      </div>

      <ServiceUserAddContactDialog
        serviceUserId={serviceUserId}
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        defaultIsEmergencyContact
        title="Add emergency contact"
        onSuccess={onSync}
      />

      {display.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No emergency contacts on file. Add contacts on the Service User profile first.
        </p>
      ) : (
        <ul className="space-y-2">
          {display.map((c) => {
            const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
            const phone = c.mobile || c.phone
            return (
              <li
                key={c.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2',
                  IA_OPTION_LABEL_CLASS,
                )}
              >
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{name || 'Unnamed contact'}</p>
                  {c.relationshipType?.name ? (
                    <p className="text-sm text-muted-foreground">{c.relationshipType.name}</p>
                  ) : null}
                  {phone ? (
                    <p className="mt-0.5 flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" aria-hidden />
                      {phone}
                    </p>
                  ) : null}
                  {c.isEmergencyContact ? (
                    <span className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-900 dark:bg-red-950 dark:text-red-200">
                      Emergency
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {emergencyRecorded && hasProfileEmergency ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Emergency contact 1 recorded — matches profile.
        </p>
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}

export function isSafeguardingSection(sectionNumber: number): boolean {
  return sectionNumber === 13
}

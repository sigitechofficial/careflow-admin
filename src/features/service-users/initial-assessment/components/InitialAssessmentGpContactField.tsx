import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { toastApiError } from '@/shared/lib/toast'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import {
  useCreateServiceUserContact,
  useUpdateServiceUserContact,
} from '@/features/service-users/hooks/useServiceUserMutations'
import type { ServiceUserDetail, ServiceUserDetailContact } from '@/features/service-users/api'
import {
  InitialAssessmentTextarea as Textarea,
  plainTextFromHtml,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { holisticQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  IA_HINT_CLASS,
  IA_LABEL_SECONDARY_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SIMPLE_FIELD_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  serviceUserId: string
  serviceUserDetail?: ServiceUserDetail | null
  errorMessage?: string | null
  disabled?: boolean
  variant?: 'default' | 'simple'
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

type GpContactDraft = {
  name: string
  phone: string
  otherDetails: string
}

function findGpContact(detail: ServiceUserDetail | null | undefined): ServiceUserDetailContact | undefined {
  return detail?.contacts?.find((c) => c.relationshipType?.code === 'GP')
}

function gpContactName(contact: ServiceUserDetailContact | undefined): string {
  if (!contact) return ''
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
}

function gpContactPhone(contact: ServiceUserDetailContact | undefined): string {
  if (!contact) return ''
  return (contact.mobile || contact.phone || '').trim()
}

function gpContactOther(contact: ServiceUserDetailContact | undefined): string {
  if (!contact) return ''
  return [contact.address, contact.notes].filter((x) => x?.trim()).join('\n').trim()
}

export function formatGpContactAssessmentText(draft: GpContactDraft): string {
  return [
    draft.name.trim() ? `Name: ${draft.name.trim()}` : '',
    draft.phone.trim() ? `Tel: ${draft.phone.trim()}` : '',
    draft.otherDetails.trim(),
  ]
    .filter(Boolean)
    .join('\n')
}

export function parseGpContactAssessmentText(text: string | undefined | null): GpContactDraft {
  const raw = text?.trim() ?? ''
  if (!raw) return { name: '', phone: '', otherDetails: '' }

  let name = ''
  let phone = ''
  let rest = raw

  const nameMatch = rest.match(/^Name:\s*(.+)(?:\r?\n|$)/i)
  if (nameMatch?.[1]) {
    name = nameMatch[1].trim()
    rest = rest.slice(nameMatch[0].length).replace(/^\r?\n/, '')
  }

  const telMatch = rest.match(/^(?:Tel|Phone):\s*(.+)(?:\r?\n|$)/i)
  if (telMatch?.[1]) {
    phone = telMatch[1].trim()
    rest = rest.slice(telMatch[0].length).replace(/^\r?\n/, '')
  }

  const otherDetails = rest.trim()
  if (!name && !phone && !nameMatch && !telMatch) {
    return { name: '', phone: '', otherDetails: raw }
  }

  return { name, phone, otherDetails }
}

function draftFromProfile(contact: ServiceUserDetailContact | undefined): GpContactDraft {
  return {
    name: gpContactName(contact),
    phone: gpContactPhone(contact),
    otherDetails: gpContactOther(contact),
  }
}

function draftFromSources(
  detail: ServiceUserDetail | null | undefined,
  textValue: string | undefined,
): GpContactDraft {
  const parsed = parseGpContactAssessmentText(textValue)
  if (parsed.name || parsed.phone || parsed.otherDetails) return parsed
  return draftFromProfile(findGpContact(detail))
}

/** Widget source after Fill Demo Data: prefer structured IA text, else the GP contact record. */
export function gpContactWidgetDraft(
  detail: ServiceUserDetail | null | undefined,
  textValue: string | undefined,
): GpContactDraft {
  return draftFromSources(detail, textValue)
}

function splitContactName(name: string): { firstName: string; lastName?: string } {
  const trimmed = name.trim()
  if (!trimmed) return { firstName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0] ?? '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function valueOrNull(v: string): string | null {
  const t = v.trim()
  return t.length ? t : null
}

function relationshipIdByCode(
  rows: { id: string; code: string }[] | undefined,
  code: string,
): string | undefined {
  return rows?.find((r) => r.code === code)?.id
}

export function InitialAssessmentGpContactField({
  question,
  value,
  serviceUserId,
  serviceUserDetail,
  errorMessage,
  disabled,
  variant = 'default',
  onChange,
}: Props) {
  const simple = variant === 'simple'
  const lookupsQuery = useServiceUserLookups()
  const createContact = useCreateServiceUserContact(serviceUserId)
  const updateContact = useUpdateServiceUserContact(serviceUserId)
  const gpContact = findGpContact(serviceUserDetail)
  const [draft, setDraft] = React.useState<GpContactDraft>(() =>
    draftFromSources(serviceUserDetail, value?.textValue),
  )
  const [isDirty, setIsDirty] = React.useState(false)
  const savingRef = React.useRef(false)

  const profileStamp = React.useMemo(
    () =>
      JSON.stringify({
        contactId: gpContact?.id ?? '',
        name: gpContactName(gpContact),
        phone: gpContactPhone(gpContact),
        other: gpContactOther(gpContact),
      }),
    [gpContact],
  )

  React.useEffect(() => {
    if (savingRef.current || isDirty) return
    setDraft(draftFromSources(serviceUserDetail, value?.textValue))
  }, [profileStamp, serviceUserDetail, value?.textValue, isDirty])

  const persistProfile = React.useCallback(async () => {
    if (disabled || savingRef.current) return

    const original = draftFromProfile(gpContact)
    // Never overwrite the GP contact on the profile — only fill what is empty there.
    const fill = (key: keyof GpContactDraft) => !original[key].trim() && Boolean(draft[key].trim())
    const nameChanged = fill('name')
    const phoneChanged = fill('phone')
    const otherChanged = fill('otherDetails')
    if (!nameChanged && !phoneChanged && !otherChanged) return
    if (!draft.name.trim() && !draft.phone.trim() && !draft.otherDetails.trim()) return

    const { firstName, lastName } = splitContactName(draft.name)
    if (!firstName.trim() && !draft.phone.trim()) return

    savingRef.current = true
    try {
      const payload = {
        firstName: firstName.trim() || 'GP',
        lastName: lastName?.trim() || undefined,
        phone: valueOrNull(draft.phone) ?? undefined,
        notes: valueOrNull(plainTextFromHtml(draft.otherDetails)) ?? undefined,
      }

      if (gpContact?.id) {
        await updateContact.mutateAsync({
          contactId: gpContact.id,
          body: {
            ...(nameChanged ? { firstName: payload.firstName, lastName: payload.lastName } : {}),
            ...(phoneChanged ? { phone: payload.phone } : {}),
            ...(otherChanged ? { notes: payload.notes } : {}),
          },
        })
      } else if (firstName.trim()) {
        const relationshipTypeId = relationshipIdByCode(lookupsQuery.data?.relationshipTypes, 'GP')
        await createContact.mutateAsync({
          ...payload,
          relationshipTypeId,
        })
      }
      setIsDirty(false)
    } catch (e) {
      toastApiError(e, 'Could not update GP contact on service user profile')
    } finally {
      savingRef.current = false
    }
  }, [createContact, disabled, draft, gpContact, lookupsQuery.data?.relationshipTypes, updateContact])

  const setField = (key: keyof GpContactDraft, nextValue: string) => {
    const next = { ...draft, [key]: nextValue }
    setIsDirty(true)
    setDraft(next)
    onChange({
      ...(value ?? { questionId: question.id }),
      questionId: question.id,
      textValue: formatGpContactAssessmentText(next),
    })
  }

  const label = holisticQuestionLabel(question.questionText)
  const gpProfile = draftFromProfile(gpContact)
  const gpLocked = (key: keyof GpContactDraft) => Boolean(gpContact?.id && gpProfile[key].trim())

  return (
    <div className={simple ? IA_SIMPLE_FIELD_CLASS : 'space-y-3 p-1'}>
      {simple ? (
        <div>
          <p className={IA_QUESTION_LABEL_CLASS}>{label}</p>
          <p className={cn('mt-0.5 text-xs', IA_HINT_CLASS)}>
            Details already on the GP contact are read-only — change them on the Contacts tab.
          </p>
        </div>
      ) : (
        <>
          <Label className={IA_QUESTION_LABEL_CLASS}>
            {label}
            {question.isRequired ? (
              <span className="text-teal-700 dark:text-teal-400" aria-hidden>
                {' '}
                *
              </span>
            ) : null}
          </Label>
          <p className={IA_HINT_CLASS}>
            Details already on the GP contact are read-only here — change them on the Contacts tab. Empty details you
            add are saved there.
          </p>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          {simple ? (
            <Label htmlFor={`${question.id}-gpName`} className={IA_LABEL_SECONDARY_CLASS}>
              GP name
            </Label>
          ) : (
            <Label htmlFor={`${question.id}-gpName`} className={IA_LABEL_SECONDARY_CLASS}>
              Name
            </Label>
          )}
          <Input
            id={`${question.id}-gpName`}
            value={draft.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => void persistProfile()}
            disabled={disabled || gpLocked('name')}
            placeholder="GP name"
            className={cn('h-10 text-base', simple && 'w-full')}
          />
        </div>
        <div className="space-y-1">
          {simple ? (
            <Label htmlFor={`${question.id}-gpPhone`} className={IA_LABEL_SECONDARY_CLASS}>
              GP phone
            </Label>
          ) : (
            <Label htmlFor={`${question.id}-gpPhone`} className={IA_LABEL_SECONDARY_CLASS}>
              Phone
            </Label>
          )}
          <Input
            id={`${question.id}-gpPhone`}
            value={draft.phone}
            onChange={(e) => setField('phone', e.target.value)}
            onBlur={() => void persistProfile()}
            disabled={disabled || gpLocked('phone')}
            placeholder="Phone number"
            className={cn('h-10 text-base', simple && 'w-full')}
          />
        </div>
        <div className={cn('space-y-1.5', !simple && 'sm:col-span-2')}>
          <Label htmlFor={`${question.id}-gpOther`} className={IA_LABEL_SECONDARY_CLASS}>
            Surgery / other details
          </Label>
          <div className="block w-full">
            <Textarea
              id={`${question.id}-gpOther`}
              value={draft.otherDetails}
              onChange={(e) => setField('otherDetails', e.target.value)}
              onBlur={() => void persistProfile()}
              disabled={disabled || gpLocked('otherDetails')}
              rows={simple ? 2 : 3}
              compact={simple}
              placeholder={
                simple ? 'Enter details…' : 'Surgery name, address, or other GP contact notes'
              }
              className={cn(disabled && 'opacity-70', simple && 'min-h-[72px]')}
            />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

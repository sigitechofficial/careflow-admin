import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { toastApiError } from '@/shared/lib/toast'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  serviceUserId: string
  serviceUserDetail?: ServiceUserDetail | null
  errorMessage?: string | null
  disabled?: boolean
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

type AddressContactDraft = {
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  postcode: string
  phone: string
  mobile: string
  email: string
}

function draftFromDetail(detail: ServiceUserDetail | null | undefined): AddressContactDraft {
  return {
    addressLine1: detail?.address?.addressLine1 ?? '',
    addressLine2: detail?.address?.addressLine2 ?? '',
    town: detail?.address?.town ?? '',
    county: detail?.address?.county ?? '',
    postcode: detail?.address?.postcode ?? '',
    phone: detail?.phone ?? '',
    mobile: detail?.mobile ?? '',
    email: detail?.email ?? '',
  }
}

function formatAsAssessmentText(v: AddressContactDraft): string {
  const address = [v.addressLine1, v.addressLine2, v.town, v.county, v.postcode].filter((x) => x.trim()).join(', ')
  return [address, v.phone ? `Tel: ${v.phone}` : '', v.mobile ? `Mobile: ${v.mobile}` : '', v.email ? `Email: ${v.email}` : '']
    .filter(Boolean)
    .join('\n')
}

function valueOrNull(v: string): string | null {
  const t = v.trim()
  return t.length ? t : null
}

export function InitialAssessmentAddressContactField({
  question,
  value,
  serviceUserId,
  serviceUserDetail,
  errorMessage,
  disabled,
  onChange,
}: Props) {
  const updateServiceUser = useUpdateServiceUser(serviceUserId)
  const [draft, setDraft] = React.useState<AddressContactDraft>(() => draftFromDetail(serviceUserDetail))
  const [isDirty, setIsDirty] = React.useState(false)
  const savingRef = React.useRef(false)
  const detailStamp = React.useMemo(
    () =>
      JSON.stringify({
        addressLine1: serviceUserDetail?.address?.addressLine1 ?? '',
        addressLine2: serviceUserDetail?.address?.addressLine2 ?? '',
        town: serviceUserDetail?.address?.town ?? '',
        county: serviceUserDetail?.address?.county ?? '',
        postcode: serviceUserDetail?.address?.postcode ?? '',
        phone: serviceUserDetail?.phone ?? '',
        mobile: serviceUserDetail?.mobile ?? '',
        email: serviceUserDetail?.email ?? '',
      }),
    [serviceUserDetail],
  )

  React.useEffect(() => {
    if (savingRef.current || isDirty) return
    setDraft(draftFromDetail(serviceUserDetail))
  }, [detailStamp, serviceUserDetail, isDirty])

  const persistProfile = React.useCallback(async () => {
    if (disabled || savingRef.current) return
    const original = draftFromDetail(serviceUserDetail)
    const profileChanged =
      original.phone !== draft.phone || original.mobile !== draft.mobile || original.email !== draft.email
    const addressChanged =
      original.addressLine1 !== draft.addressLine1 ||
      original.addressLine2 !== draft.addressLine2 ||
      original.town !== draft.town ||
      original.county !== draft.county ||
      original.postcode !== draft.postcode

    if (!profileChanged && !addressChanged) return
    savingRef.current = true
    try {
      await updateServiceUser.mutateAsync({
        body: profileChanged
          ? {
              phone: valueOrNull(draft.phone),
              mobile: valueOrNull(draft.mobile),
              email: valueOrNull(draft.email),
            }
          : {},
        address: addressChanged
          ? {
              addressLine1: valueOrNull(draft.addressLine1) ?? undefined,
              addressLine2: valueOrNull(draft.addressLine2) ?? undefined,
              town: valueOrNull(draft.town) ?? undefined,
              county: valueOrNull(draft.county) ?? undefined,
              postcode: valueOrNull(draft.postcode) ?? undefined,
            }
          : undefined,
      })
      setIsDirty(false)
    } catch (e) {
      toastApiError(e, 'Could not update service user profile from assessment')
    } finally {
      savingRef.current = false
    }
  }, [disabled, draft, serviceUserDetail, updateServiceUser])

  const setField = (key: keyof AddressContactDraft, nextValue: string) => {
    const next = { ...draft, [key]: nextValue }
    setIsDirty(true)
    setDraft(next)
    onChange({
      ...(value ?? { questionId: question.id }),
      questionId: question.id,
      textValue: formatAsAssessmentText(next),
    })
  }

  return (
    <div className="space-y-3 p-1">
      <Label className={IA_QUESTION_LABEL_CLASS}>
        {question.questionText}
        {question.isRequired ? (
          <span className="text-teal-700 dark:text-teal-400" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </Label>
      <p className={IA_HINT_CLASS}>Updates here will also update the Service User profile.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={draft.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Address line 1" />
        <Input value={draft.addressLine2} onChange={(e) => setField('addressLine2', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Address line 2" />
        <Input value={draft.town} onChange={(e) => setField('town', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Town" />
        <Input value={draft.county} onChange={(e) => setField('county', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="County" />
        <Input value={draft.postcode} onChange={(e) => setField('postcode', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Postcode" />
        <Input value={draft.phone} onChange={(e) => setField('phone', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Phone" />
        <Input value={draft.mobile} onChange={(e) => setField('mobile', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Mobile" />
        <Input value={draft.email} onChange={(e) => setField('email', e.target.value)} onBlur={() => void persistProfile()} disabled={disabled} placeholder="Email" />
      </div>
      {errorMessage ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

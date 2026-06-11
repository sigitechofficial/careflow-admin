import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { toastApiError } from '@/shared/lib/toast'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { holisticQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import {
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SIMPLE_FIELD_CLASS,
  IA_SIMPLE_INPUT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type PoNumberBinding = {
  questionId: string
  value: InitialAssessmentAnswerInput | undefined
  errorMessage?: string | null
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  serviceUserId: string
  serviceUserDetail?: ServiceUserDetail | null
  poNumber?: PoNumberBinding
  errorMessage?: string | null
  disabled?: boolean
  variant?: 'default' | 'simple'
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
  poNumber,
  errorMessage,
  disabled,
  variant = 'default',
  onChange,
}: Props) {
  const simple = variant === 'simple'
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

  const fields: { key: keyof AddressContactDraft; label: string }[] = [
    { key: 'addressLine1', label: 'Address line 1' },
    { key: 'addressLine2', label: 'Address line 2' },
    { key: 'town', label: 'Town' },
    { key: 'county', label: 'County' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'phone', label: 'Phone' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
  ]

  if (simple) {
    return (
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {poNumber ? (
            <div className={IA_SIMPLE_FIELD_CLASS}>
              <Label htmlFor={`${question.id}-poNumber`} className={IA_QUESTION_LABEL_CLASS}>
                PO Number
              </Label>
              <Input
                id={`${question.id}-poNumber`}
                value={poNumber.value?.textValue ?? ''}
                onChange={(e) =>
                  poNumber.onChange({
                    ...(poNumber.value ?? { questionId: poNumber.questionId }),
                    questionId: poNumber.questionId,
                    textValue: e.target.value,
                  })
                }
                disabled={disabled}
                placeholder="Enter details"
                className={IA_SIMPLE_INPUT_CLASS}
              />
              {poNumber.errorMessage ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {poNumber.errorMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          {fields.map(({ key, label }) => (
            <div key={key} className={IA_SIMPLE_FIELD_CLASS}>
              <Label htmlFor={`${question.id}-${key}`} className={IA_QUESTION_LABEL_CLASS}>
                {label}
              </Label>
              <Input
                id={`${question.id}-${key}`}
                value={draft[key]}
                onChange={(e) => setField(key, e.target.value)}
                onBlur={() => void persistProfile()}
                disabled={disabled}
                placeholder="Enter details"
                className={IA_SIMPLE_INPUT_CLASS}
              />
            </div>
          ))}
        </div>
        <p className={cn('text-xs', IA_HINT_CLASS)}>
          Saves to the service user profile when you leave a field.
        </p>
        {errorMessage ? (
          <p className="text-xs font-medium text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    )
  }

  const fieldsWithPlaceholder: { key: keyof AddressContactDraft; label: string; placeholder: string }[] = [
    { key: 'addressLine1', label: 'Address line 1', placeholder: 'Address line 1' },
    { key: 'addressLine2', label: 'Address line 2', placeholder: 'Address line 2' },
    { key: 'town', label: 'Town', placeholder: 'Town' },
    { key: 'county', label: 'County', placeholder: 'County' },
    { key: 'postcode', label: 'Postcode', placeholder: 'Postcode' },
    { key: 'phone', label: 'Phone', placeholder: 'Phone' },
    { key: 'mobile', label: 'Mobile', placeholder: 'Mobile' },
    { key: 'email', label: 'Email', placeholder: 'Email' },
  ]

  return (
    <div className="space-y-3 p-1">
      <Label className={IA_QUESTION_LABEL_CLASS}>
        {holisticQuestionLabel(question.questionText)}
        {question.isRequired ? (
          <span className="text-teal-700 dark:text-teal-400" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </Label>
      <p className={IA_HINT_CLASS}>Updates here will also update the Service User profile.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {poNumber ? (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${question.id}-poNumber`} className={IA_QUESTION_LABEL_CLASS}>
              PO Number
            </Label>
            <Input
              id={`${question.id}-poNumber`}
              value={poNumber.value?.textValue ?? ''}
              onChange={(e) =>
                poNumber.onChange({
                  ...(poNumber.value ?? { questionId: poNumber.questionId }),
                  questionId: poNumber.questionId,
                  textValue: e.target.value,
                })
              }
              disabled={disabled}
              placeholder="PO Number"
              className="h-10 max-w-md text-base"
            />
            {poNumber.errorMessage ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                {poNumber.errorMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        {fieldsWithPlaceholder.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <Input
              value={draft[key]}
              onChange={(e) => setField(key, e.target.value)}
              onBlur={() => void persistProfile()}
              disabled={disabled}
              placeholder={placeholder}
              className="h-10 text-base"
              aria-label={label}
            />
          </div>
        ))}
      </div>
      {errorMessage ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

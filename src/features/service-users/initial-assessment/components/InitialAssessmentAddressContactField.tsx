import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { toastApiError } from '@/shared/lib/toast'
import { AddressPlacesField } from '@/shared/ui/address-places-field'
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
  country: string
  /** Main postcode (area / monitoring). */
  postcode: string
  /** Secondary postcode from street address search. */
  secondaryPostcode: string
  latitude: string
  longitude: string
  phone: string
  mobile: string
  email: string
}

export function addressContactDraftFromDetail(detail: ServiceUserDetail | null | undefined): AddressContactDraft {
  return {
    addressLine1: detail?.address?.addressLine1 ?? '',
    addressLine2: detail?.address?.addressLine2 ?? '',
    town: detail?.address?.town ?? '',
    county: detail?.address?.county ?? '',
    country: detail?.address?.country ?? '',
    postcode: detail?.address?.postcode ?? '',
    secondaryPostcode: detail?.address?.secondaryPostcode ?? '',
    latitude: detail?.address?.latitude != null ? String(detail.address.latitude) : '',
    longitude: detail?.address?.longitude != null ? String(detail.address.longitude) : '',
    phone: detail?.phone ?? '',
    mobile: detail?.mobile ?? '',
    email: detail?.email ?? '',
  }
}

function draftFromDetail(detail: ServiceUserDetail | null | undefined): AddressContactDraft {
  return addressContactDraftFromDetail(detail)
}

function formatAsAssessmentText(v: AddressContactDraft): string {
  const address = [
    v.addressLine1,
    v.addressLine2,
    v.town,
    v.county,
    v.secondaryPostcode || v.postcode,
  ]
    .filter((x) => x.trim())
    .join(', ')
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
        country: serviceUserDetail?.address?.country ?? '',
        postcode: serviceUserDetail?.address?.postcode ?? '',
        secondaryPostcode: serviceUserDetail?.address?.secondaryPostcode ?? '',
        latitude: serviceUserDetail?.address?.latitude != null ? String(serviceUserDetail.address.latitude) : '',
        longitude: serviceUserDetail?.address?.longitude != null ? String(serviceUserDetail.address.longitude) : '',
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

  // Master data is never overwritten from the IA: details already on the profile are read-only here
  // (change them on the profile); empty ones typed here fill the profile.
  const profile = draftFromDetail(serviceUserDetail)
  const addressLocked = Boolean(profile.addressLine1.trim() || profile.postcode.trim())
  const contactLocked = (key: 'phone' | 'mobile' | 'email') => Boolean(profile[key].trim())

  const persistProfile = React.useCallback(async (override?: AddressContactDraft) => {
    if (disabled || savingRef.current) return
    const current = override ?? draft
    const original = draftFromDetail(serviceUserDetail)
    const fillable = (key: 'phone' | 'mobile' | 'email') => !original[key].trim() && Boolean(current[key].trim())
    const profileChanged = fillable('phone') || fillable('mobile') || fillable('email')
    const originalHasAddress = Boolean(original.addressLine1.trim() || original.postcode.trim())
    const addressChanged =
      !originalHasAddress &&
      (original.addressLine1 !== current.addressLine1 ||
      original.addressLine2 !== current.addressLine2 ||
      original.town !== current.town ||
      original.county !== current.county ||
      original.country !== current.country ||
      original.postcode !== current.postcode ||
      original.secondaryPostcode !== current.secondaryPostcode ||
      original.latitude !== current.latitude ||
      original.longitude !== current.longitude)

    if (!profileChanged && !addressChanged) return
    savingRef.current = true
    try {
      const lat = current.latitude.trim() ? Number(current.latitude) : undefined
      const lng = current.longitude.trim() ? Number(current.longitude) : undefined
      await updateServiceUser.mutateAsync({
        body: profileChanged
          ? {
              ...(fillable('phone') ? { phone: valueOrNull(current.phone) } : {}),
              ...(fillable('mobile') ? { mobile: valueOrNull(current.mobile) } : {}),
              ...(fillable('email') ? { email: valueOrNull(current.email) } : {}),
            }
          : {},
        address: addressChanged
          ? {
              addressLine1: valueOrNull(current.addressLine1) ?? undefined,
              addressLine2: valueOrNull(current.addressLine2) ?? undefined,
              town: valueOrNull(current.town) ?? undefined,
              county: valueOrNull(current.county) ?? undefined,
              country: valueOrNull(current.country) ?? undefined,
              postcode: valueOrNull(current.postcode) ?? undefined,
              secondaryPostcode: valueOrNull(current.secondaryPostcode) ?? undefined,
              latitude: lat != null && Number.isFinite(lat) ? lat : undefined,
              longitude: lng != null && Number.isFinite(lng) ? lng : undefined,
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

  const applyDraft = (next: AddressContactDraft) => {
    setIsDirty(true)
    setDraft(next)
    onChange({
      ...(value ?? { questionId: question.id }),
      questionId: question.id,
      textValue: formatAsAssessmentText(next),
    })
  }

  const setContactField = (key: 'phone' | 'mobile' | 'email', nextValue: string) => {
    applyDraft({ ...draft, [key]: nextValue })
  }

  const contactFields: { key: 'phone' | 'mobile' | 'email'; label: string; placeholder: string }[] = [
    { key: 'phone', label: 'Phone', placeholder: 'Phone' },
    { key: 'mobile', label: 'Mobile', placeholder: 'Mobile' },
    { key: 'email', label: 'Email', placeholder: 'Email' },
  ]

  return (
    <div className={cn('space-y-3', simple ? 'min-w-0 space-y-5 p-0' : 'p-1')}>
      {!simple ? (
        <>
          <Label className={IA_QUESTION_LABEL_CLASS}>
            {holisticQuestionLabel(question.questionText)}
            {question.isRequired ? (
              <span className="text-teal-700 dark:text-teal-400" aria-hidden>
                {' '}
                *
              </span>
            ) : null}
          </Label>
          <p className={IA_HINT_CLASS}>
            Details already on the profile are read-only here — change them on the profile. Empty details you add are
            saved to the profile.
          </p>
        </>
      ) : null}

      {poNumber ? (
        <div className={simple ? IA_SIMPLE_FIELD_CLASS : 'space-y-1'}>
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
            className={simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 max-w-md text-base'}
          />
          {poNumber.errorMessage ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {poNumber.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <AddressPlacesField
        postcodeLabel="Postcode"
        disabled={disabled || addressLocked}
        value={{
          addressLine1: draft.addressLine1,
          addressLine2: draft.addressLine2,
          town: draft.town,
          county: draft.county,
          country: draft.country,
          postcode: draft.secondaryPostcode,
          latitude: draft.latitude,
          longitude: draft.longitude,
        }}
        onChange={(patch) => {
          const { postcode, ...rest } = patch
          const next = {
            ...draft,
            ...rest,
            ...(postcode !== undefined ? { secondaryPostcode: postcode } : {}),
          }
          applyDraft(next)
          void persistProfile(next)
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={simple ? IA_SIMPLE_FIELD_CLASS : 'space-y-1'}>
          <Label className={IA_QUESTION_LABEL_CLASS}>Main postcode</Label>
          <Input
            value={draft.postcode}
            onChange={(e) => applyDraft({ ...draft, postcode: e.target.value })}
            onBlur={() => void persistProfile()}
            disabled={disabled || addressLocked}
            placeholder="Main postcode"
            className={simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 text-base'}
          />
        </div>
        {contactFields.map(({ key, label, placeholder }) => (
          <div key={key} className={simple ? IA_SIMPLE_FIELD_CLASS : 'space-y-1'}>
            {simple ? (
              <Label htmlFor={`${question.id}-${key}`} className={IA_QUESTION_LABEL_CLASS}>
                {label}
              </Label>
            ) : null}
            <Input
              id={simple ? `${question.id}-${key}` : undefined}
              value={draft[key]}
              onChange={(e) => setContactField(key, e.target.value)}
              onBlur={() => void persistProfile()}
              disabled={disabled || contactLocked(key)}
              title={contactLocked(key) ? 'From the profile — change it on the profile' : undefined}
              placeholder={placeholder}
              className={simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 text-base'}
              aria-label={label}
            />
          </div>
        ))}
      </div>

      <p className={cn('text-xs', IA_HINT_CLASS)}>
        {addressLocked
          ? 'Address, phone and email already on the profile are shown read-only — change them on the profile.'
          : simple
            ? 'Empty details you add are saved to the service user profile when you leave a field. Address search uses Google Places.'
            : 'Leave a field to save. Address search uses Google Places and fills the postcode.'}
      </p>
      {errorMessage ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

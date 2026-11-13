import * as React from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { DictationProvider } from '@/shared/ui/dictation'
import { revealInitialAssessmentSecureField } from '@/features/service-users/initial-assessment/api'
import { SECURE_MASK_PLACEHOLDER } from '@/features/service-users/initial-assessment/utils/secure-field'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'
import { toastApiError } from '@/shared/lib/toast'

type Props = {
  id: string
  serviceUserId: string
  submissionId: string
  questionId: string
  value: InitialAssessmentAnswerInput | undefined
  disabled?: boolean
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

export function InitialAssessmentSecureTextField({
  id,
  serviceUserId,
  submissionId,
  questionId,
  value,
  disabled,
  onChange,
}: Props) {
  const [revealed, setRevealed] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)

  const hasStored = value?.hasSecureValue === true
  const showMasked = hasStored && value?.secureMasked && !revealed && value.textValue === undefined

  const displayValue = showMasked ? SECURE_MASK_PLACEHOLDER : (value?.textValue ?? '')

  const reveal = async () => {
    setRevealing(true)
    try {
      const res = await revealInitialAssessmentSecureField(serviceUserId, submissionId, questionId)
      onChange({
        questionId,
        ...value,
        textValue: res.textValue ?? '',
        secureMasked: false,
        hasSecureValue: Boolean(res.textValue?.trim()),
      })
      setRevealed(true)
    } catch (e) {
      toastApiError(e, 'Could not reveal secure value')
    } finally {
      setRevealing(false)
    }
  }

  return (
    <div className="flex max-w-md items-center gap-2">
      {/* No mic: browser speech-to-text sends audio to an outside service, not for secure codes. */}
      <DictationProvider enabled={false}>
        <Input
          id={id}
          type={revealed || !hasStored ? 'text' : 'password'}
          // Not a login: "off" is ignored on password fields, and the browser then fills the saved
          // login email into the header search box.
          autoComplete="new-password"
          disabled={disabled || (showMasked && !revealed)}
          className="font-mono"
          placeholder={hasStored ? SECURE_MASK_PLACEHOLDER : 'Enter code…'}
          value={displayValue}
          onChange={(e) =>
            onChange({
              questionId,
              ...value,
              textValue: e.target.value,
              secureMasked: false,
              hasSecureValue: Boolean(e.target.value.trim()) || hasStored,
            })
          }
        />
      </DictationProvider>
      {hasStored && !revealed ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={disabled || revealing}
          title="Reveal (audited)"
          onClick={() => void reveal()}
        >
          {revealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        </Button>
      ) : revealed ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          title="Hide"
          onClick={() => {
            setRevealed(false)
            onChange({
              questionId,
              ...value,
              textValue: undefined,
              secureMasked: true,
              hasSecureValue: true,
            })
          }}
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}

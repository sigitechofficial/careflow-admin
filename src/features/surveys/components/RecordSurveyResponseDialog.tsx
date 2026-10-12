import * as React from 'react'
import { Loader2, Phone } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  isoToOrgDatetimeLocal,
  nowOrgDatetimeLocal,
  orgDatetimeLocalToIso,
} from '@/shared/lib/operational-day.util'
import {
  useRecordSurveyResponse,
  useSurveyRecordCandidates,
  useUpdateRecordedSurveyResponse,
} from '@/features/surveys/hooks/useSurveys'
import { QuestionField, hasValue } from '@/features/surveys/components/SurveyQuestionField'
import {
  SURVEY_RESPONSE_CHANNEL_LABELS,
  type StaffRecordedChannel,
  type SurveyAnswerInput,
  type SurveyQuestion,
  type SurveyRespondentRelation,
  type SurveyResponseItem,
  type SurveyTargetKind,
} from '@/features/surveys/types'

const CHANNELS: { value: StaffRecordedChannel; label: string; hint: string }[] = [
  { value: 'TELEPHONE', label: 'Telephone', hint: 'Answers taken over a phone call' },
  { value: 'PAPER', label: 'Paper form', hint: 'Typing up a completed paper survey' },
  { value: 'IN_PERSON', label: 'In person', hint: 'Answers taken face to face' },
]

const FIELD_CLASS =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function relationOptions(targetKind: SurveyTargetKind): { value: SurveyRespondentRelation; label: string }[] {
  return [
    { value: 'SELF', label: targetKind === 'SERVICE_USER' ? 'The service user themselves' : 'The employee themselves' },
    ...(targetKind === 'SERVICE_USER'
      ? ([
          { value: 'FAMILY_MEMBER', label: 'A family member' },
          { value: 'REPRESENTATIVE', label: 'A representative (e.g. advocate, attorney)' },
        ] as const)
      : []),
    { value: 'STAFF', label: 'Staff on their behalf' },
  ]
}

function answersFromResponse(response: SurveyResponseItem): Record<string, SurveyAnswerInput> {
  const out: Record<string, SurveyAnswerInput> = {}
  for (const a of response.answers) {
    out[a.questionId] = {
      questionId: a.questionId,
      ...(a.booleanValue != null ? { booleanValue: a.booleanValue } : {}),
      ...(a.textValue != null ? { textValue: a.textValue } : {}),
      ...(a.numberValue != null ? { numberValue: a.numberValue } : {}),
      ...(a.selectedOptions != null ? { selectedOptions: a.selectedOptions } : {}),
    }
  }
  return out
}

type Props = {
  surveyId: string
  targetKind: SurveyTargetKind
  questions: SurveyQuestion[]
  open: boolean
  /** Omit to record a new response; pass a staff-recorded response to correct it. */
  editing?: SurveyResponseItem | null
  onClose: () => void
}

/** Office staff record survey answers collected by telephone, paper or in person. */
export function RecordSurveyResponseDialog({ surveyId, targetKind, questions, open, editing, onClose }: Props) {
  const isEdit = Boolean(editing)
  const forServiceUsers = targetKind === 'SERVICE_USER'
  const recordMutation = useRecordSurveyResponse(surveyId)
  const updateMutation = useUpdateRecordedSurveyResponse(surveyId)
  const saving = recordMutation.isPending || updateMutation.isPending

  const [channel, setChannel] = React.useState<StaffRecordedChannel>('TELEPHONE')
  const [anonymous, setAnonymous] = React.useState(false)
  const [personId, setPersonId] = React.useState('')
  const [personSearch, setPersonSearch] = React.useState('')
  const [relation, setRelation] = React.useState<SurveyRespondentRelation>('SELF')
  const [respondentName, setRespondentName] = React.useState('')
  const [contactedAt, setContactedAt] = React.useState('')
  const [contactNumber, setContactNumber] = React.useState('')
  const [contactNotes, setContactNotes] = React.useState('')
  const [consent, setConsent] = React.useState(false)
  const [answers, setAnswers] = React.useState<Record<string, SurveyAnswerInput>>({})
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setChannel((editing.channel as StaffRecordedChannel) ?? 'TELEPHONE')
      setAnonymous(Boolean(editing.isAnonymous))
      setRelation(editing.respondentRelation ?? 'SELF')
      setRespondentName(editing.respondentName ?? '')
      setContactedAt(isoToOrgDatetimeLocal(editing.contactedAt))
      setContactNumber(editing.contactNumber ?? '')
      setContactNotes(editing.contactNotes ?? '')
      setAnswers(answersFromResponse(editing))
    } else {
      setChannel('TELEPHONE')
      setAnonymous(false)
      setPersonId('')
      setPersonSearch('')
      setRelation('SELF')
      setRespondentName('')
      setContactedAt(nowOrgDatetimeLocal())
      setContactNumber('')
      setContactNotes('')
      setConsent(false)
      setAnswers({})
    }
    setReason('')
  }, [open, editing])

  const candidatesQuery = useSurveyRecordCandidates(surveyId, personSearch, open && !isEdit && !anonymous)
  const candidateOptions = (candidatesQuery.data ?? []).map(c => ({
    value: c.id,
    label: c.name,
    description: c.hasResponse
      ? 'Already answered'
      : c.recipientStatus
        ? 'Survey sent — not answered yet'
        : 'Not sent yet',
    disabled: c.hasResponse,
  }))

  const isTelephone = channel === 'TELEPHONE'
  const showName = !anonymous && relation !== 'SELF'
  const missingRequired = questions.filter(q => q.isRequired && !hasValue(q.questionType, answers[q.id]))
  const answeredCount = questions.filter(q => hasValue(q.questionType, answers[q.id])).length

  const blocker = (() => {
    if (!isEdit && !anonymous && !personId) {
      return `Choose the ${forServiceUsers ? 'service user' : 'employee'} or tick Anonymous.`
    }
    if (!isEdit && isTelephone && !consent) return 'Confirm the person agreed to answer over the phone.'
    if (answeredCount === 0) return 'Enter at least one answer.'
    if (missingRequired[0]) return `Answer the required question: ${missingRequired[0].questionText}`
    if (isEdit && !reason.trim()) return 'Give a reason for the correction.'
    return null
  })()

  const submit = async () => {
    if (blocker) return
    const payloadAnswers = questions
      .map(q => answers[q.id])
      .filter((a): a is SurveyAnswerInput => Boolean(a))
      .filter(a => {
        const q = questions.find(x => x.id === a.questionId)
        return q ? hasValue(q.questionType, a) : false
      })
    const details = {
      answers: payloadAnswers,
      respondentRelation: relation,
      respondentName: showName ? respondentName.trim() || undefined : undefined,
      contactedAt: orgDatetimeLocalToIso(contactedAt) || undefined,
      contactNumber: !anonymous && isTelephone ? contactNumber.trim() || undefined : undefined,
      contactNotes: contactNotes.trim() || undefined,
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ responseId: editing.id, input: { ...details, reason: reason.trim() } })
        toastSuccess('Response updated', 'The correction and reason are saved on the audit log.')
      } else {
        await recordMutation.mutateAsync({
          ...details,
          channel,
          isAnonymous: anonymous,
          personId: anonymous ? undefined : personId,
          consentGiven: isTelephone ? consent : undefined,
        })
        toastSuccess('Response recorded')
      }
      onClose()
    } catch (err) {
      toastApiError(err, isEdit ? 'Could not update the response.' : 'Could not record the response.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => (!next && !saving ? onClose() : undefined)}>
      <DialogContent size="lg" className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit recorded response' : 'Record response'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `${editing?.respondentLabel ?? ''} · ${
                  editing?.channel ? SURVEY_RESPONSE_CHANNEL_LABELS[editing.channel] : ''
                }`
              : 'Enter answers collected by telephone, from a paper form or in person.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto">
          {!isEdit ? (
            <section className="space-y-2">
              <p className="text-xs font-medium text-foreground">How were the answers collected?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {CHANNELS.map(c => (
                  <label
                    key={c.value}
                    className={`flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm ${
                      channel === c.value ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="record-channel"
                        checked={channel === c.value}
                        onChange={() => setChannel(c.value)}
                        data-testid={`record-channel-${c.value.toLowerCase()}`}
                      />
                      {c.label}
                    </span>
                    <span className="mt-0.5 text-xs text-muted-foreground">{c.hint}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            {!isEdit ? (
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">
                    Whose response is this? {anonymous ? null : <span className="text-destructive">*</span>}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={e => setAnonymous(e.target.checked)}
                      data-testid="record-anonymous"
                    />
                    Anonymous
                  </label>
                </div>
                {anonymous ? (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    The response is not linked to anyone and nobody&apos;s survey is marked as completed.
                  </p>
                ) : (
                  <Combobox
                    options={candidateOptions}
                    value={personId}
                    onChange={setPersonId}
                    onSearchChange={setPersonSearch}
                    loading={candidatesQuery.isFetching}
                    placeholder={forServiceUsers ? 'Search service user…' : 'Search employee…'}
                    searchPlaceholder="Search by name…"
                    emptyText="No matching people."
                    data-testid="record-person"
                  />
                )}
              </div>
            ) : null}

            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-foreground">Who gave the answers?</span>
              <select
                value={relation}
                onChange={e => setRelation(e.target.value as SurveyRespondentRelation)}
                className={`${FIELD_CLASS} h-9`}
                data-testid="record-relation"
              >
                {relationOptions(targetKind).map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {showName ? (
              <label className="block space-y-1.5 text-sm">
                <span className="text-xs font-medium text-foreground">
                  {relation === 'STAFF' ? 'Staff member name' : 'Their name'}
                </span>
                <Input
                  value={respondentName}
                  onChange={e => setRespondentName(e.target.value.slice(0, 200))}
                  placeholder="Name"
                />
              </label>
            ) : null}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-foreground">
                {isTelephone ? 'Call date and time' : 'Date collected'}
              </span>
              <Input type="datetime-local" value={contactedAt} onChange={e => setContactedAt(e.target.value)} />
            </label>
            {isTelephone && !anonymous ? (
              <label className="block space-y-1.5 text-sm">
                <span className="text-xs font-medium text-foreground">Number called</span>
                <Input
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value.slice(0, 50))}
                  placeholder="e.g. 07700 900123"
                />
              </label>
            ) : null}
            <label className="block space-y-1.5 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-foreground">Notes (optional)</span>
              <textarea
                value={contactNotes}
                onChange={e => setContactNotes(e.target.value.slice(0, 2000))}
                rows={2}
                className={FIELD_CLASS}
                placeholder={isTelephone ? 'Anything about the call…' : 'Anything about how the answers were collected…'}
              />
            </label>
            {isTelephone && !isEdit ? (
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  data-testid="record-consent"
                />
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  The person agreed to answer this survey over the phone <span className="text-destructive">*</span>
                </span>
              </label>
            ) : null}
          </section>

          <section className="space-y-3">
            <p className="text-xs font-medium text-foreground">
              Answers ({answeredCount}/{questions.length})
            </p>
            {questions.map((q, index) => (
              <QuestionField
                key={q.id}
                q={q}
                index={index}
                value={answers[q.id]}
                disabled={saving}
                onChange={next => setAnswers(prev => ({ ...prev, [q.id]: next }))}
              />
            ))}
          </section>

          {isEdit ? (
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-foreground">
                Reason for the correction <span className="text-destructive">*</span>
              </span>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value.slice(0, 1000))}
                rows={3}
                className={FIELD_CLASS}
                placeholder="e.g. Answer to question 3 was entered wrongly during the call"
                data-testid="record-edit-reason"
              />
              <span className="text-xs text-muted-foreground">Saved on the audit log with the before and after answers.</span>
            </label>
          ) : null}
        </DialogBody>

        <DialogFooter className="flex-wrap gap-2">
          {blocker ? <p className="mr-auto text-xs text-muted-foreground">{blocker}</p> : null}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={saving || Boolean(blocker)}
            leftIcon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
            data-testid="record-submit"
          >
            {isEdit ? 'Save correction' : 'Save response'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

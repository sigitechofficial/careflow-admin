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
import { QuestionField, RequiredMark, hasValue } from '@/features/surveys/components/SurveyQuestionField'
import {
  SURVEY_RESPONSE_CHANNEL_LABELS,
  type StaffRecordedChannel,
  type SurveyAnswerInput,
  type SurveyQuestion,
  type SurveyRecordCandidate,
  type SurveyRespondentRelation,
  type SurveyResponseItem,
  type SurveyTargetKind,
} from '@/features/surveys/types'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import { SurveyDateTimeField } from '@/features/surveys/components/SurveyDateTimeField'
import { answerProblems, answersToSend, questionsAsked, visibleQuestions } from '@/features/surveys/survey-logic'

const CHANNELS: { value: StaffRecordedChannel; label: string; hint: string }[] = [
  { value: 'TELEPHONE', label: 'Telephone', hint: 'Answers taken over a phone call' },
  { value: 'PAPER', label: 'Paper form', hint: 'Typing up a completed paper survey' },
  { value: 'IN_PERSON', label: 'In person', hint: 'Answers taken face to face' },
]

const FIELD_CLASS =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

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

export function answersFromResponse(response: SurveyResponseItem): Record<string, SurveyAnswerInput> {
  const out: Record<string, SurveyAnswerInput> = {}
  for (const a of response.answers) {
    // An equality answer linked to no one came as its group (or "Not shown") only: never put back in
    // the form as if it were the answer. It is kept as recorded unless staff choose a new one.
    if (a.lookupGroupOnly) continue
    out[a.questionId] = {
      questionId: a.questionId,
      ...(a.booleanValue != null ? { booleanValue: a.booleanValue } : {}),
      ...(a.textValue != null ? { textValue: a.textValue } : {}),
      ...(a.numberValue != null ? { numberValue: a.numberValue } : {}),
      ...(a.selectedOptions != null ? { selectedOptions: a.selectedOptions } : {}),
      ...(a.otherText ? { otherText: a.otherText } : {}),
      ...(a.comment ? { comment: a.comment } : {}),
    }
  }
  return out
}

type Props = {
  /** The survey the response is recorded on (for an edit: the survey it belongs to, e.g. its period). */
  surveyId: string
  /** Editing from another survey's list (a repeating survey's "All periods"): refreshed after saving too. */
  listedOnSurveyId?: string
  targetKind: SurveyTargetKind
  questions: SurveyQuestion[]
  open: boolean
  /** Omit to record a new response; pass a staff-recorded response to correct it. */
  editing?: SurveyResponseItem | null
  /** Shown above the form when editing (e.g. why held-back answers differ from the list it was opened from). */
  editingNote?: string | null
  /** Anonymous survey: text boxes remind staff not to write names. */
  isAnonymous?: boolean
  /** Section introductions, read out with each heading. */
  sectionIntros?: Record<string, string>
  /** Recording for someone chosen already (the call list): the person (employee / service user id) and the number called. */
  initialPerson?: { id: string; name: string; phone?: string | null } | null
  /** An independent reviewer (SUR-CQC-001): their sample only, recorded through /survey-reviews. */
  asReviewer?: boolean
  onClose: () => void
}

/** What the person picker says about someone: answered, sent (and how to reach them), or not sent. */
export function recordCandidateDescription(c: SurveyRecordCandidate): string {
  const ended = c.careEnded ? 'Care ended · ' : ''
  if (c.statusHidden) return `${ended}Anonymous survey — whether they have answered is not shown`
  if (c.hasResponse) return `${ended}Already answered`
  if (!c.recipientStatus) return `${ended}Not sent yet`
  return c.hasPortal === false
    ? `${ended}Sent: no portal account — phone, visit or post`
    : `${ended}Survey sent — not answered yet`
}

/** Office staff record survey answers collected by telephone, paper or in person. */
export function RecordSurveyResponseDialog({
  surveyId,
  listedOnSurveyId,
  targetKind,
  questions,
  open,
  editing,
  editingNote,
  isAnonymous,
  sectionIntros,
  initialPerson,
  asReviewer = false,
  onClose,
}: Props) {
  const isEdit = Boolean(editing)
  const forServiceUsers = targetKind === 'SERVICE_USER'
  const recordMutation = useRecordSurveyResponse(surveyId, asReviewer)
  const updateMutation = useUpdateRecordedSurveyResponse(surveyId, listedOnSurveyId)
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
      setPersonId(initialPerson?.id ?? '')
      setPersonSearch(initialPerson?.name ?? '')
      setRelation('SELF')
      setRespondentName('')
      setContactedAt(nowOrgDatetimeLocal())
      setContactNumber(initialPerson?.phone ?? '')
      setContactNotes('')
      setConsent(false)
      setAnswers({})
    }
    setReason('')
    // initialPerson is read when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const candidatesQuery = useSurveyRecordCandidates(surveyId, personSearch, open && !isEdit && !anonymous, asReviewer)
  const candidateOptions = (candidatesQuery.data ?? []).map(c => ({
    value: c.id,
    label: c.name,
    description: recordCandidateDescription(c),
    disabled: c.hasResponse,
  }))

  const isTelephone = channel === 'TELEPHONE'
  const showName = !anonymous && relation !== 'SELF'
  // Linked to no one (recorded as anonymous, or on an anonymous survey): nobody could reply, so the
  // contact-me question is not asked — same rule as the server, which discards any answer to it.
  const unlinked = Boolean(isAnonymous) || (isEdit ? Boolean(editing?.isAnonymous) : anonymous)
  const asked = React.useMemo(() => questionsAsked(questions, unlinked), [questions, unlinked])
  // An anonymous recording (anonymous survey, or recorded as Anonymous): the notes are not linked to
  // anyone either, so staff are reminded not to name the person in them.
  const noNames = Boolean(isAnonymous) || anonymous
  // Anonymous survey still collecting answers: written answers are held back from staff too. They are
  // kept as they are (the server keeps them) unless staff type a replacement.
  const withheld = React.useMemo(
    () => new Map((editing?.answers ?? []).filter(a => a.withheldFields?.length).map(a => [a.questionId, a.withheldFields!])),
    [editing],
  )
  // Equality answers linked to no one (shown as their group only): kept as recorded unless replaced.
  const keptLookup = React.useMemo(
    () => new Set((editing?.answers ?? []).filter(a => a.lookupGroupOnly && a.selectedOptions?.length).map(a => a.questionId)),
    [editing],
  )
  const keepsText = (questionId: string) =>
    Boolean(withheld.get(questionId)?.includes('textValue')) ||
    (keptLookup.has(questionId) && !answers[questionId]?.selectedOptions?.length)
  // Questions with "Show only if" appear as the person's answers are entered.
  const shown = visibleQuestions(asked, answers)
  const problems = answerProblems(asked, answers)
  const missingRequired = problems.missingRequired.filter(q => !keepsText(q.id))
  const missingOtherText = problems.missingOtherText.filter(q => !withheld.get(q.id)?.includes('otherText'))
  const answeredCount = shown.filter(q => hasValue(q.questionType, answers[q.id]) || keepsText(q.id)).length

  const blocker = (() => {
    if (!isEdit && !anonymous && !personId) {
      return `Choose the ${forServiceUsers ? 'service user' : 'employee'} or tick Anonymous.`
    }
    if (!isEdit && isTelephone && !consent) return 'Confirm the person agreed to answer over the phone.'
    if (answeredCount === 0) return 'Enter at least one answer.'
    if (missingRequired[0]) return `Answer the required question: ${missingRequired[0].questionText}`
    if (missingOtherText[0]) return `Type their “Other” answer for: ${missingOtherText[0].questionText}`
    if (isEdit && !reason.trim()) return 'Give a reason for the correction.'
    return null
  })()

  const submit = async () => {
    if (blocker) return
    const sent = answersToSend(asked, answers)
    // A held-back text answer left empty is sent as a bare answer, so the server keeps the saved text;
    // so is an equality answer shown as its group only and not replaced (its group is never sent).
    const kept = shown
      .filter(q => keepsText(q.id) && !sent.some(a => a.questionId === q.id))
      .map(q => ({ questionId: q.id }))
    const payloadAnswers = [...sent, ...kept]
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
          {isEdit && editingNote ? (
            <p
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              data-testid="record-editing-note"
            >
              {editingNote}
            </p>
          ) : null}
          {!isEdit ? (
            <fieldset className="min-w-0 space-y-2">
              <legend className="text-xs font-medium text-foreground">How were the answers collected?</legend>
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
            </fieldset>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            {!isEdit ? (
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p id="record-whose-response" className="text-xs font-medium text-foreground">
                    Whose response is this?{anonymous ? null : <RequiredMark />}
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
                    aria-label={`Whose response is this? Choose the ${forServiceUsers ? 'service user' : 'employee'}`}
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
            <div className="space-y-1.5 text-sm">
              <span className="block text-xs font-medium text-foreground">
                {isTelephone ? 'Call date and time' : 'Date collected'}
              </span>
              <SurveyDateTimeField
                label={isTelephone ? 'Call date and time' : 'Date collected'}
                value={contactedAt}
                onChange={setContactedAt}
              />
            </div>
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
                data-testid="record-notes"
              />
              {noNames ? (
                <span className="block text-xs text-muted-foreground" data-testid="record-notes-no-names">
                  Please do not include names.
                </span>
              ) : null}
              {editing?.contactNotesWithheld ? (
                <span className="block text-xs text-muted-foreground" data-testid="record-notes-withheld">
                  The notes are held back until the survey has closed with enough answers, so they cannot be
                  traced to anyone. They are kept as they are unless you type a replacement.
                </span>
              ) : null}
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
                  The person agreed to answer this survey over the phone
                  <RequiredMark />
                </span>
              </label>
            ) : null}
          </section>

          <section className="space-y-3" aria-labelledby="record-answers-title">
            <h3 id="record-answers-title" className="text-xs font-medium text-foreground">
              Answers ({answeredCount}/{shown.length})
            </h3>
            {withSectionHeadings(shown).map(({ item: q, index, heading }) => (
              <React.Fragment key={q.id}>
                {heading ? <SurveySectionHeading title={heading} introduction={sectionIntros?.[heading]} level={4} /> : null}
                <QuestionField
                  q={q}
                  index={index}
                  value={answers[q.id]}
                  disabled={saving}
                  headingLevel={shown.some(s => s.sectionTitle?.trim()) ? 5 : 4}
                  anonymous={isAnonymous || anonymous}
                  onChange={next => setAnswers(prev => ({ ...prev, [q.id]: next }))}
                />
                {withheld.has(q.id) ? (
                  <p className="-mt-1 text-xs text-muted-foreground" data-testid="record-written-withheld">
                    Their written answer is held back until the survey has closed with enough answers, so it
                    cannot be traced to anyone. It is kept as it is unless you type a replacement.
                  </p>
                ) : null}
                {keptLookup.has(q.id) ? (
                  <p className="-mt-1 text-xs text-muted-foreground" data-testid="record-lookup-kept">
                    The recorded answer is not shown, so it cannot point to anyone. It is kept as it is unless
                    you choose a new answer.
                  </p>
                ) : null}

              </React.Fragment>
            ))}
          </section>

          {isEdit ? (
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-foreground">
                Reason for the correction
                <RequiredMark />
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
          {blocker ? (
            <p id="record-blocker" className="mr-auto text-xs text-muted-foreground">
              {blocker}
            </p>
          ) : null}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={saving || Boolean(blocker)}
            aria-describedby={blocker ? 'record-blocker' : undefined}
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

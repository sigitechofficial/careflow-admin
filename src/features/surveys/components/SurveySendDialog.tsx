import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useSendSurvey } from '@/features/surveys/hooks/useSurveys'
import { SendContactRuleCheck, type ContactRuleOverride } from '@/features/surveys/contact-rule/SendContactRuleCheck'
import {
  MIN_ANONYMOUS_RECIPIENTS,
  SURVEY_RECURRENCE_LABELS,
  SURVEY_TARGET_KIND_LABELS,
  type SendSurveyInput,
  type SendSurveyResult,
  type SurveyDetail,
  type SurveyRecurrence,
} from '@/features/surveys/types'
import {
  SurveyAudienceFields,
  type SurveyAudienceValue,
} from '@/features/surveys/components/SurveyAudienceFields'
import { SurveyFormerStaffField } from '@/features/surveys/components/SurveyFormerStaffField'
import { formatSurveyDateTime, isoToSurveyLocal, surveyLocalToIso } from '@/features/surveys/survey-datetime'
import { SurveyDateTimeField } from '@/features/surveys/components/SurveyDateTimeField'
import { SurveyChosenPeopleField } from '@/features/surveys/components/SurveyChosenPeopleField'

type Props = {
  survey: SurveyDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** People we support without a portal account, named after a send (never on anonymous surveys). */
function NoPortalResult({ result }: { result: SendSurveyResult }) {
  const people = result.noPortal ?? []
  const count = people.length
  const intro = result.scheduled
    ? `When it goes out, ${count} ${count === 1 ? 'person has' : 'people have'} no portal account.`
    : `${count} ${count === 1 ? 'person has' : 'people have'} no portal account.`
  return (
    <div className="space-y-2 text-sm" data-testid="no-portal-result">
      <p className="font-medium">
        {result.scheduled
          ? 'Scheduled.'
          : `Sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`}{' '}
        {intro}
      </p>
      <p className="text-muted-foreground">
        Phone, visit or post it to {count === 1 ? 'them' : 'these people'}, then use Record response. They are in the
        survey’s recording list{result.scheduled ? ' once it is sent' : ''}.
      </p>
      <ul className="list-disc space-y-0.5 pl-5" aria-label="People without a portal account">
        {people.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Send now, schedule, or repeat. The audience chosen here (branches, job titles, people) is
 * saved with the survey, so a scheduled or repeating send reaches exactly these people.
 */
export function SurveySendDialog({ survey, open, onOpenChange }: Props) {
  const sendMut = useSendSurvey(survey.id)
  const forServiceUsers = survey.targetKind === 'SERVICE_USER'
  const isPeriod = Boolean(survey.clonedFromId)
  const isSeries = !isPeriod && (Boolean(survey.recurrence) || survey.periodCount > 0)
  const audienceLower = SURVEY_TARGET_KIND_LABELS[survey.targetKind].toLowerCase()

  const [audience, setAudience] = React.useState<SurveyAudienceValue>({
    locationIds: [],
    roleIds: [],
    employeeIds: [],
  })
  const [when, setWhen] = React.useState('')
  const [recurrence, setRecurrence] = React.useState<SurveyRecurrence | ''>('')
  const [openDays, setOpenDays] = React.useState('')
  const [repeatReason, setRepeatReason] = React.useState('')
  // People we support: everyone in the branches, or chosen people.
  const [peopleMode, setPeopleMode] = React.useState<'branches' | 'people'>('branches')
  const [chosenIds, setChosenIds] = React.useState<string[]>([])
  const [result, setResult] = React.useState<SendSurveyResult | null>(null)
  const [override, setOverride] = React.useState<ContactRuleOverride>({ sendAnyway: false, reason: '' })

  // Start from what is saved on the survey each time the dialog opens.
  React.useEffect(() => {
    if (!open) return
    setAudience({
      locationIds: survey.locationIds ?? [],
      roleIds: survey.roleIds ?? [],
      employeeIds: survey.audienceEmployeeIds ?? [],
    })
    setWhen(survey.distributeAt && !survey.distributedAt ? isoToSurveyLocal(survey.distributeAt) : '')
    setRecurrence(survey.recurrence ?? '')
    setOpenDays(survey.periodOpenDays ? String(survey.periodOpenDays) : '')
    const saved = survey.audienceServiceUserIds ?? []
    setChosenIds(saved)
    setPeopleMode(saved.length ? 'people' : 'branches')
  }, [open, survey])
  // The result stays until the dialog is closed: the survey refetches after a send, and the office
  // still needs the names of the people without a portal.
  React.useEffect(() => {
    if (open) {
      setResult(null)
      setOverride({ sendAnyway: false, reason: '' })
      setRepeatReason('')
    }
  }, [open])

  const whenIso = isPeriod ? undefined : surveyLocalToIso(when)
  const isFuture = Boolean(whenIso && new Date(whenIso).getTime() > Date.now() + 15_000)
  const repeating = Boolean(recurrence)
  const openDaysNumber = openDays.trim() ? Number(openDays) : null
  const openDaysInvalid =
    repeating && openDaysNumber !== null && (!Number.isInteger(openDaysNumber) || openDaysNumber < 1 || openDaysNumber > 366)
  const whenInPast = Boolean(when && whenIso && !isFuture)
  // Weekly asks the same people more often than the 4-week rule allows: a reason, unless the ready-made
  // survey gives one (the API then uses it).
  const shortRepeat = repeating && recurrence === 'WEEKLY' && !isPeriod
  const repeatReasonShort = shortRepeat && repeatReason.trim().length > 0 && repeatReason.trim().length < 5
  // A repeating survey (one with periods) is only ever restarted or rescheduled with a repeat —
  // sending it once is done from one of its periods.
  const needsRepeat = isSeries && !repeating
  const choosingPeople = forServiceUsers && peopleMode === 'people'
  const noneChosen = choosingPeople && chosenIds.length === 0

  const primaryLabel = repeating
    ? isFuture
      ? 'Schedule repeating survey'
      : 'Start now'
    : isFuture
      ? 'Schedule'
      : 'Send now'

  const baseInput: SendSurveyInput = {
      locationIds: choosingPeople ? [] : audience.locationIds,
      ...(forServiceUsers
        ? choosingPeople
          ? { serviceUserIds: chosenIds }
          : survey.audienceServiceUserIds?.length
            ? { serviceUserIds: [] } // back to branches: clear the saved choice
            : {}
        : { roleIds: audience.roleIds, employeeIds: audience.employeeIds }),
      ...(isFuture && whenIso ? { distributeAt: whenIso } : {}),
      recurrence: recurrence || null,
      ...(repeating ? { periodOpenDays: openDaysNumber } : {}),
      ...(shortRepeat && repeatReason.trim() ? { repeatReason: repeatReason.trim() } : {}),
  }
  // The 4-week rule: checked before Send now (scheduled and repeating sends apply it when they go out).
  const sendingNow = !isFuture && !repeating && !needsRepeat && !noneChosen
  const overrideReasonShort = override.sendAnyway && override.reason.trim().length < 5

  const submit = async () => {
    const input: SendSurveyInput = {
      ...baseInput,
      ...(sendingNow && override.sendAnyway ? { contactRuleOverride: { reason: override.reason.trim() } } : {}),
    }
    try {
      const res = await sendMut.mutateAsync(input)
      if (res.noPortal?.length) {
        // Keep the dialog open: the office needs these names to phone, visit or post.
        setResult(res)
        return
      }
      if (res.recurrence) {
        toastSuccess(
          res.sent > 0
            ? `First period sent to ${res.sent} ${audienceLower}. Next period ${formatSurveyDateTime(res.distributeAt)}.`
            : `${SURVEY_RECURRENCE_LABELS[res.recurrence]} survey scheduled — first period ${formatSurveyDateTime(res.distributeAt)}.`,
        )
      } else if (res.scheduled) {
        toastSuccess(`Scheduled for ${formatSurveyDateTime(res.distributeAt)}.`)
      } else {
        const notes = [
          res.heldBack ? `${res.heldBack} had another survey in the last 4 weeks and will get it later` : '',
          res.notSampled ? `${res.notSampled} not in this sample` : '',
          res.skippedExisting ? `${res.skippedExisting} already had it` : '',
          res.skippedNoPortal ? `${res.skippedNoPortal} without a portal account skipped` : '',
        ].filter(Boolean)
        toastSuccess(`Sent to ${res.sent} ${audienceLower}${notes.length ? ` — ${notes.join(', ')}` : ''}.`)
      }
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, isFuture || repeating ? 'Could not schedule survey' : 'Could not send survey')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {isSeries ? 'Change repeating schedule' : `Send this survey to ${audienceLower}`}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {result ? <NoPortalResult result={result} /> : null}
          {result ? null : (
          <>
          <p className="text-sm text-muted-foreground">
            {forServiceUsers
              ? choosingPeople
                ? 'Choose the people to send it to.'
                : 'Service users with a portal account get it in their portal plus an email. Anyone without a portal account is skipped — choose people by name to add them to the recording list, or use Open for responses to record their answers by phone or on a visit.'
              : 'Each employee gets a personal link by push notification and email.'}
          </p>
          {survey.isAnonymous ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground" data-testid="anonymous-minimum">
              Anonymous surveys go to at least {MIN_ANONYMOUS_RECIPIENTS} people, so nobody can be identified from the
              answers.
            </p>
          ) : null}

          {forServiceUsers ? (
            <RadioGroup
              value={peopleMode}
              onValueChange={v => setPeopleMode(v as 'branches' | 'people')}
              aria-label="Who to send it to"
              className="gap-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="branches" aria-label="Everyone in these branches" />
                Everyone in these branches
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="people" aria-label="Chosen people" />
                Chosen people
              </label>
            </RadioGroup>
          ) : null}

          {choosingPeople ? (
            <SurveyChosenPeopleField
              surveyId={survey.id}
              anonymous={survey.isAnonymous}
              value={chosenIds}
              onChange={setChosenIds}
              enabled={open}
            />
          ) : (
            <>
              <SurveyAudienceFields
                targetKind={survey.targetKind}
                value={audience}
                onChange={setAudience}
                showPeople={!forServiceUsers}
                enabled={open}
              />
              {open && survey.targetKind === 'EMPLOYEE' && !isPeriod ? (
                <SurveyFormerStaffField
                  surveyId={survey.id}
                  anonymous={survey.isAnonymous}
                  value={audience.employeeIds}
                  onChange={ids => setAudience(a => ({ ...a, employeeIds: ids }))}
                />
              ) : null}
            </>
          )}

          {isPeriod ? null : (
          <div className="space-y-1 text-sm">
            <span className="block font-medium">{repeating ? 'First period starts' : 'Send at'}</span>
            <SurveyDateTimeField
              label={repeating ? 'First period starts' : 'Send at'}
              value={when}
              onChange={setWhen}
            />
            <span className="text-xs text-muted-foreground">
              {repeating ? 'Leave empty to send the first period now.' : 'Leave empty to send now.'} Times are UK
              (organisation) time.
            </span>
            {whenInPast ? <span className="block text-xs text-destructive">That time has passed — it will send now.</span> : null}
          </div>
          )}

          <SendContactRuleCheck
            surveyId={survey.id}
            input={baseInput}
            enabled={open && sendingNow}
            value={override}
            onChange={setOverride}
          />

          {isPeriod ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              This is one period of a repeating survey — it can be sent to more people now, but its schedule
              belongs to the repeating survey.
            </p>
          ) : (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Repeat</span>
              <Select
                value={recurrence || 'none'}
                onValueChange={v => setRecurrence(v === 'none' ? '' : (v as SurveyRecurrence))}
              >
                <SelectTrigger aria-label="Repeat">
                  <SelectValue placeholder="Does not repeat" />
                </SelectTrigger>
                <SelectContent>
                  {survey.periodCount > 0 ? null : <SelectItem value="none">Does not repeat</SelectItem>}
                  {(Object.keys(SURVEY_RECURRENCE_LABELS) as SurveyRecurrence[]).map(key => (
                    <SelectItem key={key} value={key}>
                      {SURVEY_RECURRENCE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsRepeat ? (
                <span className="block text-xs text-destructive">
                  Choose how often it repeats. To send one period to more people, open that period.
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                A repeating survey sends a fresh copy of this survey each period (e.g. “{survey.title} — Nov 2026”)
                to the people above. Results are kept per period.
              </span>
            </label>
          )}

          {shortRepeat ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Why every week?</span>
              <Input
                value={repeatReason}
                maxLength={300}
                onChange={e => setRepeatReason(e.target.value)}
                placeholder="For example: a short check-in while the new rota settles in"
                aria-describedby="weekly-reason-help"
              />
              <span id="weekly-reason-help" className="block text-xs text-muted-foreground">
                A weekly survey asks the same people more often than once in 4 weeks. Say why; it is kept in the audit
                trail. Not needed if the ready-made survey already says why.
              </span>
              {repeatReasonShort ? <span className="block text-xs text-destructive">Use at least 5 characters.</span> : null}
            </label>
          ) : null}

          {repeating && !isPeriod ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Keep each period open for (days)</span>
              <Input
                type="number"
                min={1}
                max={366}
                value={openDays}
                onChange={e => setOpenDays(e.target.value)}
                placeholder="Until the next period starts"
                aria-label="Keep each period open for (days)"
              />
              <span className="text-xs text-muted-foreground">
                The previous period always closes when the next one starts.
              </span>
              {openDaysInvalid ? (
                <span className="block text-xs text-destructive">Enter a whole number of days from 1 to 366.</span>
              ) : null}
            </label>
          ) : null}
          </>
          )}
        </DialogBody>
        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={sendMut.isPending || openDaysInvalid || repeatReasonShort || needsRepeat || noneChosen || (sendingNow && overrideReasonShort)}
                onClick={() => void submit()}
              >
                {sendMut.isPending ? 'Working…' : primaryLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

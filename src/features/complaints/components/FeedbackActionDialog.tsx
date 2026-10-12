import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { nowOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { useTransitionFeedback } from '@/features/complaints/hooks/useComplaints'
import type { ComplaintOutcome, FeedbackAction, FeedbackDetail } from '@/features/complaints/types'
import { COMPLAINT_OUTCOME_LABEL } from '@/features/complaints/feedback-labels'
import {
  FeedbackField,
  feedbackSelectClass,
  feedbackTextareaClass,
} from '@/features/complaints/components/FeedbackFormDialog'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

export const FEEDBACK_ACTION_LABEL: Record<FeedbackAction, string> = {
  ACKNOWLEDGE: 'Acknowledge',
  START_INVESTIGATION: 'Start investigation',
  RESPOND: 'Record response',
  CLOSE: 'Close',
  REOPEN: 'Reopen',
  SHARE: 'Shared with staff',
}

const NOTE_HINT: Record<FeedbackAction, string> = {
  ACKNOWLEDGE: 'e.g. Called the daughter and sent an acknowledgement letter',
  START_INVESTIGATION: 'e.g. Reviewing call logs and speaking to the carers involved',
  RESPOND: 'Anything else about the response',
  CLOSE: 'Anything else before closing',
  REOPEN: 'Why it is being reopened',
  SHARE: 'e.g. Read out at the team meeting and passed to Sarah',
}

/** Actions that record when they happened. */
const DATED: FeedbackAction[] = ['ACKNOWLEDGE', 'RESPOND', 'CLOSE', 'SHARE']

export function FeedbackActionDialog({
  record,
  action,
  onOpenChange,
}: {
  record: FeedbackDetail
  action: FeedbackAction | null
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useTransitionFeedback(record.id)
  const [at, setAt] = React.useState('')
  const [note, setNote] = React.useState('')
  const [outcome, setOutcome] = React.useState<ComplaintOutcome | ''>('')
  const [responseSummary, setResponseSummary] = React.useState('')
  const [lessonsLearned, setLessonsLearned] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!action) return
    setAt(nowOrgDatetimeLocal())
    setNote('')
    setOutcome(record.outcome ?? '')
    setResponseSummary(record.responseSummary ?? '')
    setLessonsLearned(record.lessonsLearned ?? '')
    setError(null)
  }, [action, record])

  if (!action) return null
  const isComplaint = record.type === 'COMPLAINT'
  const needsOutcome = isComplaint && (action === 'RESPOND' || action === 'CLOSE')

  const onSave = async () => {
    if (action === 'RESPOND' && !responseSummary.trim()) return setError('Summarise the response sent.')
    if (needsOutcome && !outcome) return setError('Select the outcome.')
    if (action === 'REOPEN' && !note.trim()) return setError('Give a reason for reopening.')
    setError(null)
    try {
      await mutation.mutateAsync({
        action,
        at: DATED.includes(action) && at ? orgDatetimeLocalToIso(at) : undefined,
        note: note.trim() || undefined,
        ...(needsOutcome && outcome ? { outcome } : {}),
        ...(action === 'RESPOND' ? { responseSummary: responseSummary.trim() } : {}),
        ...(action === 'CLOSE' && isComplaint ? { lessonsLearned: lessonsLearned.trim() } : {}),
      })
      toastSuccess(FEEDBACK_ACTION_LABEL[action], `${record.referenceNumber} updated.`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed.')
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {FEEDBACK_ACTION_LABEL[action]} — {record.referenceNumber}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3" data-testid="feedback-action-form">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {DATED.includes(action) ? (
            <FeedbackField label="Date & time">
              <Input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} />
            </FeedbackField>
          ) : null}
          {needsOutcome ? (
            <FeedbackField label="Outcome *">
              <select
                className={feedbackSelectClass}
                value={outcome}
                onChange={e => setOutcome(e.target.value as ComplaintOutcome | '')}
                data-testid="feedback-outcome"
              >
                <option value="">— Select —</option>
                {Object.entries(COMPLAINT_OUTCOME_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </FeedbackField>
          ) : null}
          {action === 'RESPOND' ? (
            <FeedbackField label="Response sent *">
              <textarea
                rows={4}
                className={feedbackTextareaClass}
                value={responseSummary}
                onChange={e => setResponseSummary(e.target.value)}
                placeholder="What was found and what you told them"
                data-testid="feedback-response-summary"
              />
            </FeedbackField>
          ) : null}
          {action === 'CLOSE' && isComplaint ? (
            <FeedbackField label="Lessons learned / actions taken">
              <textarea
                rows={3}
                className={feedbackTextareaClass}
                value={lessonsLearned}
                onChange={e => setLessonsLearned(e.target.value)}
                placeholder="e.g. Rota changed so Mrs B has the same morning carer"
                data-testid="feedback-lessons"
              />
            </FeedbackField>
          ) : null}
          <FeedbackField label={action === 'REOPEN' ? 'Reason *' : 'Note'}>
            <textarea
              rows={2}
              className={feedbackTextareaClass}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={NOTE_HINT[action]}
              data-testid="feedback-action-note"
            />
          </FeedbackField>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => void onSave()} data-testid="feedback-action-save">
            {mutation.isPending ? 'Saving…' : FEEDBACK_ACTION_LABEL[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

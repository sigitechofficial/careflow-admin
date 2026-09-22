import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useAddQuestion,
  useRemoveQuestion,
  useSendSurvey,
  useSurvey,
  useSurveyResults,
  useUpdateQuestion,
} from '@/features/surveys/hooks/useSurveys'
import {
  CHOICE_QUESTION_TYPES,
  SURVEY_QUESTION_TYPE_LABELS,
  type CreateQuestionInput,
  type SurveyQuestion,
  type SurveyQuestionType,
} from '@/features/surveys/types'

const QUESTION_TYPE_ORDER: SurveyQuestionType[] = [
  'YES_NO',
  'RATING',
  'LIKERT',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'TEXT',
  'TEXTAREA',
  'NUMBER',
]

type QuestionDraft = {
  questionText: string
  questionType: SurveyQuestionType
  helpText: string
  isRequired: boolean
  optionsText: string
}

function emptyDraft(): QuestionDraft {
  return { questionText: '', questionType: 'YES_NO', helpText: '', isRequired: false, optionsText: '' }
}

function draftToInput(draft: QuestionDraft): CreateQuestionInput {
  const isChoice = CHOICE_QUESTION_TYPES.includes(draft.questionType)
  const options = isChoice
    ? draft.optionsText
        .split('\n')
        .map(o => o.trim())
        .filter(Boolean)
    : undefined
  return {
    questionText: draft.questionText.trim(),
    questionType: draft.questionType,
    helpText: draft.helpText.trim() || undefined,
    isRequired: draft.isRequired,
    options,
  }
}

function QuestionFields({
  draft,
  onChange,
}: {
  draft: QuestionDraft
  onChange: (next: QuestionDraft) => void
}) {
  const isChoice = CHOICE_QUESTION_TYPES.includes(draft.questionType)
  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Question *</span>
        <Input
          value={draft.questionText}
          onChange={e => onChange({ ...draft, questionText: e.target.value })}
          placeholder="e.g. How supported do you feel by your manager?"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            value={draft.questionType}
            onChange={e => onChange({ ...draft, questionType: e.target.value as SurveyQuestionType })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {QUESTION_TYPE_ORDER.map(t => (
              <option key={t} value={t}>
                {SURVEY_QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={draft.isRequired}
            onChange={e => onChange({ ...draft, isRequired: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Required
        </label>
      </div>
      {isChoice ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Options (one per line)</span>
          <textarea
            value={draft.optionsText}
            onChange={e => onChange({ ...draft, optionsText: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={'Strongly agree\nAgree\nNeutral\nDisagree'}
          />
        </label>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Help text</span>
        <Input
          value={draft.helpText}
          onChange={e => onChange({ ...draft, helpText: e.target.value })}
          placeholder="Optional guidance shown under the question"
        />
      </label>
    </div>
  )
}

export default function SurveyBuilderPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const { data: survey, isLoading, isError } = useSurvey(surveyId)
  const addMut = useAddQuestion(surveyId)
  const updateMut = useUpdateQuestion(surveyId)
  const removeMut = useRemoveQuestion(surveyId)
  const sendMut = useSendSurvey(surveyId)
  const alreadySent = (survey?.recipientCount ?? 0) > 0
  const { data: results } = useSurveyResults(surveyId, alreadySent)

  const [addDraft, setAddDraft] = React.useState<QuestionDraft>(emptyDraft())
  const [editing, setEditing] = React.useState<SurveyQuestion | null>(null)
  const [editDraft, setEditDraft] = React.useState<QuestionDraft>(emptyDraft())
  const [removeTarget, setRemoveTarget] = React.useState<SurveyQuestion | null>(null)
  const [sendOpen, setSendOpen] = React.useState(false)

  const openEdit = (q: SurveyQuestion) => {
    setEditing(q)
    setEditDraft({
      questionText: q.questionText,
      questionType: q.questionType,
      helpText: q.helpText ?? '',
      isRequired: q.isRequired,
      optionsText: (q.options ?? []).join('\n'),
    })
  }

  const handleAdd = async () => {
    if (!addDraft.questionText.trim()) return
    try {
      await addMut.mutateAsync({ ...draftToInput(addDraft), sortOrder: survey?.questions.length ?? 0 })
      toastSuccess('Question added')
      setAddDraft(emptyDraft())
    } catch (e) {
      toastApiError(e, 'Could not add question')
    }
  }

  const handleEditSave = async () => {
    if (!editing || !editDraft.questionText.trim()) return
    try {
      await updateMut.mutateAsync({ questionId: editing.id, input: draftToInput(editDraft) })
      toastSuccess('Question updated')
      setEditing(null)
    } catch (e) {
      toastApiError(e, 'Could not update question')
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    try {
      await removeMut.mutateAsync(removeTarget.id)
      toastSuccess('Question removed')
      setRemoveTarget(null)
    } catch (e) {
      toastApiError(e, 'Could not remove question')
    }
  }

  const handleSend = async () => {
    try {
      const res = await sendMut.mutateAsync(undefined)
      toastSuccess(`Sent to ${res.sent} employee(s)${res.skippedExisting ? `, ${res.skippedExisting} already had it` : ''}.`)
      setSendOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not send survey')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading survey…
      </div>
    )
  }
  if (isError || !survey) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Survey not found.</p>
        <Button variant="outline" asChild>
          <Link to="/surveys">Back to surveys</Link>
        </Button>
      </div>
    )
  }

  const questions = [...survey.questions].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">{survey.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {survey.status} · Employees{survey.isAnonymous ? ' · Anonymous' : ''} ·{' '}
              {questions.length} question{questions.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={questions.length === 0 || sendMut.isPending}
            onClick={() => setSendOpen(true)}
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            {alreadySent ? 'Send to new employees' : 'Send to employees'}
          </Button>
        ) : null}
      </div>

      {alreadySent && results ? (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Recipients', value: results.recipients },
            { label: 'Completed', value: results.completed },
            { label: 'Response rate', value: `${results.responseRate}%` },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Questions */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No questions yet — add your first one below.
          </p>
        ) : (
          <ol className="space-y-2">
            {questions.map((q, idx) => (
              <li
                key={q.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {idx + 1}. {q.questionText}
                    {q.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {SURVEY_QUESTION_TYPE_LABELS[q.questionType]}
                    {q.options?.length ? ` · ${q.options.length} options` : ''}
                    {q.helpText ? ` · ${q.helpText}` : ''}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(q)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label="Remove question"
                      onClick={() => setRemoveTarget(q)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Add question */}
      {canManage ? (
        <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Add question</p>
          <QuestionFields draft={addDraft} onChange={setAddDraft} />
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={!addDraft.questionText.trim() || addMut.isPending}
              onClick={() => void handleAdd()}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {addMut.isPending ? 'Adding…' : 'Add question'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Edit dialog */}
      <Dialog open={editing != null} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <QuestionFields draft={editDraft} onChange={setEditDraft} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editDraft.questionText.trim() || updateMut.isPending}
              onClick={() => void handleEditSave()}
            >
              {updateMut.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove question confirm */}
      <AlertDialog open={removeTarget != null} onOpenChange={o => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this question?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removeTarget?.questionText}” will be removed from the survey.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleRemove()
              }}
            >
              {removeMut.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send confirm */}
      <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this survey to employees?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a response task for every active employee and marks the survey ACTIVE.
              Employees who already received it are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleSend()
              }}
            >
              {sendMut.isPending ? 'Sending…' : 'Send survey'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

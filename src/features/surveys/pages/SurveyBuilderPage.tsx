import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Copy, Loader2, Lock, Pencil, Plus, Send, Trash2, Unlock, Users } from 'lucide-react'
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
  usePublishSurvey,
  useRemoveQuestion,
  useSendSurvey,
  useSurvey,
  useSurveyResults,
  useUpdateQuestion,
  useUpdateSurvey,
} from '@/features/surveys/hooks/useSurveys'
import { buildSurveyShareUrl } from '@/features/surveys/api/surveys.api'
import { SurveyCompletionProgress } from '@/features/surveys/components/SurveyCompletionProgress'
import { SurveySummaryPanel } from '@/features/surveys/components/SurveySummaryPanel'
import {
  CHOICE_QUESTION_TYPES,
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_RECURRENCE_LABELS,
  type CreateQuestionInput,
  type SurveyQuestion,
  type SurveyQuestionType,
  type SurveyRecurrence,
} from '@/features/surveys/types'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { listAllEmployees } from '@/features/employees/api/employees.api'
import { combineOperationalDateAndHm, dayKeyFromInstant, formatOpsHm } from '@/shared/lib/operational-day.util'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

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

function isoToDatetimeLocal(iso: string | null | undefined): string {
  const day = dayKeyFromInstant(iso ?? null)
  const hm = formatOpsHm(iso)
  if (!day || !hm) return ''
  return `${day}T${hm}`
}

function datetimeLocalToIso(value: string): string | undefined {
  if (!value) return undefined
  return combineOperationalDateAndHm(value.slice(0, 10), value.slice(11, 16)) || undefined
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
  const publishMut = usePublishSurvey(surveyId)
  const updateMutSurvey = useUpdateSurvey(surveyId)
  const alreadySent = (survey?.recipientCount ?? 0) > 0
  const { data: results } = useSurveyResults(surveyId, Boolean(surveyId))

  const [addDraft, setAddDraft] = React.useState<QuestionDraft>(emptyDraft())
  const [editing, setEditing] = React.useState<SurveyQuestion | null>(null)
  const [editDraft, setEditDraft] = React.useState<QuestionDraft>(emptyDraft())
  const [removeTarget, setRemoveTarget] = React.useState<SurveyQuestion | null>(null)
  const [sendOpen, setSendOpen] = React.useState(false)
  const [selectedZoneId, setSelectedZoneId] = React.useState('')
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>([])
  const { data: locationTree } = useLocationManagementTree(sendOpen)
  const [sendingEmployees, setSendingEmployees] = React.useState(false)
  const [distributeAtLocal, setDistributeAtLocal] = React.useState('')
  const [recurrenceLocal, setRecurrenceLocal] = React.useState<SurveyRecurrence | ''>('')
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')
  const [editAnonymous, setEditAnonymous] = React.useState(false)
  const [editOpensAt, setEditOpensAt] = React.useState('')
  const [editClosesAt, setEditClosesAt] = React.useState('')
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false)

  const selectedZone = locationTree?.zones.find(z => z.id === selectedZoneId)
  const branchOptions = React.useMemo<MultiSelectOption[]>(() => {
    if (!selectedZone) return []
    return selectedZone.branches
      .filter(b => b.locationId)
      .map(b => ({ value: b.locationId!, label: b.name }))
  }, [selectedZone])

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

  const copyShareLink = async () => {
    if (!survey) return
    const questionCount = survey.questions.length
    if (questionCount === 0) {
      toastApiError(new Error('Add at least one question first'), 'Cannot share yet')
      return
    }
    try {
      let token = survey.shareToken
      if (survey.status === 'DRAFT') {
        const published = await publishMut.mutateAsync()
        token = published.shareToken
        toastSuccess('Survey published')
      }
      const url = buildSurveyShareUrl(token)
      try {
        await navigator.clipboard.writeText(url)
        toastSuccess('Shareable link copied')
      } catch {
        window.prompt('Copy this survey link:', url)
      }
    } catch (e) {
      toastApiError(e, 'Could not prepare shareable link')
    }
  }

  const resetSendState = () => {
    setSelectedZoneId('')
    setSelectedLocationIds([])
    setSendingEmployees(false)
    setDistributeAtLocal('')
    setRecurrenceLocal('')
  }

  const handleSend = async (schedule: boolean) => {
    try {
      setSendingEmployees(true)
      if (schedule) {
        const iso = datetimeLocalToIso(distributeAtLocal)
        if (!iso) {
          toastApiError(new Error('Pick a date and time'), 'Schedule time required')
          return
        }
        const res = await sendMut.mutateAsync({
          distributeAt: iso,
          recurrence: recurrenceLocal || null,
        })
        toastSuccess(
          res.scheduled
            ? res.recurrence
              ? `${SURVEY_RECURRENCE_LABELS[res.recurrence]} distribution scheduled${
                  res.distributeAt ? ` — first run ${new Date(res.distributeAt).toLocaleString()}` : ''
                }. Each run creates a new survey.`
              : `Distribution scheduled${res.distributeAt ? ` for ${new Date(res.distributeAt).toLocaleString()}` : ''}.`
            : `Sent to ${res.sent} employee(s).`,
        )
        setSendOpen(false)
        resetSendState()
        return
      }

      let employeeIds: string[] | undefined
      const locationIds =
        selectedLocationIds.length > 0
          ? selectedLocationIds
          : selectedZone
            ? selectedZone.branches.filter(b => b.locationId).map(b => b.locationId!)
            : []
      if (locationIds.length > 0) {
        const employees = await listAllEmployees({ locationIds })
        employeeIds = employees.map(e => e.id)
        if (employeeIds.length === 0) {
          toastApiError(new Error('No employees found in selected branches'), 'No employees')
          return
        }
      }
      const res = await sendMut.mutateAsync({ employeeIds })
      toastSuccess(
        `Sent to ${res.sent} employee(s)${res.skippedExisting ? `, ${res.skippedExisting} already had it` : ''}.`,
      )
      setSendOpen(false)
      resetSendState()
    } catch (e) {
      toastApiError(e, schedule ? 'Could not schedule survey' : 'Could not send survey')
    } finally {
      setSendingEmployees(false)
    }
  }

  const handleCancelSchedule = async () => {
    try {
      await updateMutSurvey.mutateAsync({ distributeAt: null, recurrence: null })
      toastSuccess('Scheduled distribution cancelled')
    } catch (e) {
      toastApiError(e, 'Could not cancel schedule')
    }
  }

  const openDetailsEditor = () => {
    if (!survey) return
    setEditTitle(survey.title)
    setEditDescription(survey.description ?? '')
    setEditAnonymous(survey.isAnonymous)
    setEditOpensAt(isoToDatetimeLocal(survey.opensAt))
    setEditClosesAt(isoToDatetimeLocal(survey.closesAt))
    setDetailsOpen(true)
  }

  const detailsScheduleInvalid = Boolean(editOpensAt && editClosesAt && editClosesAt <= editOpensAt)

  const handleSaveDetails = async () => {
    if (!editTitle.trim() || detailsScheduleInvalid) return
    try {
      await updateMutSurvey.mutateAsync({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        isAnonymous: editAnonymous,
        opensAt: editOpensAt
          ? combineOperationalDateAndHm(editOpensAt.slice(0, 10), editOpensAt.slice(11, 16))
          : null,
        closesAt: editClosesAt
          ? combineOperationalDateAndHm(editClosesAt.slice(0, 10), editClosesAt.slice(11, 16))
          : null,
      })
      toastSuccess('Survey details saved')
      setDetailsOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not save survey details')
    }
  }

  const handleCloseSurvey = async () => {
    try {
      await updateMutSurvey.mutateAsync({ status: 'CLOSED', distributeAt: null, recurrence: null })
      toastSuccess('Survey closed — new responses are blocked')
      setCloseConfirmOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not close survey')
    }
  }

  const handleReopenSurvey = async () => {
    try {
      await updateMutSurvey.mutateAsync({ status: 'ACTIVE' })
      toastSuccess('Survey reopened')
    } catch (e) {
      toastApiError(e, 'Could not reopen survey')
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
  const isClosed = survey.status === 'CLOSED'

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
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
              {survey.createdByName ? ` · Created by ${survey.createdByName}` : ''}
            </p>
            {survey.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={openDetailsEditor}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit details
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
                <Users className="h-3.5 w-3.5" aria-hidden />
                Responses
                {typeof survey.responseCount === 'number' && survey.responseCount > 0
                  ? ` (${survey.responseCount})`
                  : ''}
              </Link>
            </Button>
            {!isClosed ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={questions.length === 0 || publishMut.isPending}
                  onClick={() => void copyShareLink()}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {publishMut.isPending
                    ? 'Preparing…'
                    : survey.status === 'DRAFT'
                      ? 'Publish & copy link'
                      : 'Copy shareable link'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={questions.length === 0 || sendMut.isPending}
                  onClick={() => setSendOpen(true)}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  {alreadySent ? 'Send to new employees' : 'Send or schedule'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={updateMutSurvey.isPending}
                  onClick={() => setCloseConfirmOpen(true)}
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Close survey
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={updateMutSurvey.isPending}
                onClick={() => void handleReopenSurvey()}
              >
                <Unlock className="h-3.5 w-3.5" aria-hidden />
                {updateMutSurvey.isPending ? 'Reopening…' : 'Reopen survey'}
              </Button>
            )}
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
              <Users className="h-3.5 w-3.5" aria-hidden />
              Responses
            </Link>
          </Button>
        )}
      </div>

      {isClosed ? (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          This survey is closed. The shareable link no longer accepts responses.
          {canManage ? ' Use Reopen survey to accept responses again.' : ''}
        </div>
      ) : null}

      {survey.shareToken ? (
        <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground">Shareable link</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                One link for everyone. Copy it and send by email, SMS, or chat.
                {survey.status === 'DRAFT'
                  ? ' Publishing activates the survey so people can respond.'
                  : ''}
              </p>
              <p className="mt-2 break-all rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-foreground">
                {buildSurveyShareUrl(survey.shareToken)}
              </p>
            </div>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                disabled={questions.length === 0 || publishMut.isPending}
                onClick={() => void copyShareLink()}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {survey.distributeAt && !survey.distributedAt ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {survey.recurrence ? 'Recurring distribution' : 'Scheduled distribution'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {survey.recurrence ? (
                <>
                  A new survey is created and sent {SURVEY_RECURRENCE_LABELS[survey.recurrence].toLowerCase()}.
                  Next run:{' '}
                  <span className="font-medium text-foreground">
                    {isoToDatetimeLocal(survey.distributeAt).replace('T', ' ')}
                  </span>
                  .
                </>
              ) : (
                <>
                  Employees will receive this survey automatically at{' '}
                  <span className="font-medium text-foreground">
                    {isoToDatetimeLocal(survey.distributeAt).replace('T', ' ')}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={updateMutSurvey.isPending}
              onClick={() => void handleCancelSchedule()}
            >
              {updateMutSurvey.isPending ? 'Cancelling…' : 'Cancel schedule'}
            </Button>
          ) : null}
        </div>
      ) : null}

      <SurveyCompletionProgress
        className="mb-5"
        completed={results?.completed ?? survey.responseCount ?? 0}
        recipients={results?.recipients ?? survey.recipientCount ?? 0}
        hint={
          results?.includesPeriodRuns
            ? 'Includes all weekly/monthly period runs created from this survey.'
            : survey.recurrence
              ? 'Progress updates when period runs are sent and people respond.'
              : undefined
        }
      />

      {(alreadySent || survey.status === 'ACTIVE') && results && results.recipients > 0 ? (
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

      {results?.questionSummaries && results.questionSummaries.length > 0 ? (
        <SurveySummaryPanel className="mb-5" summaries={results.questionSummaries} />
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

      {/* Edit survey details */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit survey details</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Title *</span>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="e.g. Staff satisfaction Q3"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Description</span>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional context shown to recipients"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editAnonymous}
                onChange={e => setEditAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Anonymous responses (recommended for honest staff feedback)
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Start</span>
                <Input
                  type="datetime-local"
                  value={editOpensAt}
                  onChange={e => setEditOpensAt(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">End</span>
                <Input
                  type="datetime-local"
                  value={editClosesAt}
                  min={editOpensAt || undefined}
                  onChange={e => setEditClosesAt(e.target.value)}
                />
              </label>
            </div>
            {detailsScheduleInvalid ? (
              <p className="text-xs text-destructive">End must be after the start.</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Leave Start or End empty for no open/close limit. Schedule / repeat is managed with
              Send or schedule.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editTitle.trim() || detailsScheduleInvalid || updateMutSurvey.isPending}
              onClick={() => void handleSaveDetails()}
            >
              {updateMutSurvey.isPending ? 'Saving…' : 'Save details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Close survey confirm */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this survey?</AlertDialogTitle>
            <AlertDialogDescription>
              People will no longer be able to submit responses via the shareable link. You can
              reopen it later. Any scheduled distribution will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutSurvey.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updateMutSurvey.isPending}
              onClick={e => {
                e.preventDefault()
                void handleCloseSurvey()
              }}
            >
              {updateMutSurvey.isPending ? 'Closing…' : 'Close survey'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Send confirm with branch selection */}
      <Dialog
        open={sendOpen}
        onOpenChange={o => {
          setSendOpen(o)
          if (o && survey?.recurrence) setRecurrenceLocal(survey.recurrence)
          if (!o) resetSendState()
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Send this survey to employees</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send now to selected branches, or schedule a one-time or repeating distribution. Repeating
              runs create a new survey each period from this template.
            </p>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Schedule for</span>
              <Input
                type="datetime-local"
                value={distributeAtLocal}
                onChange={e => setDistributeAtLocal(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                Optional. Leave empty and use Send now, or set a future time and Schedule.
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Repeat</span>
              <Select
                value={recurrenceLocal || 'none'}
                onValueChange={v =>
                  setRecurrenceLocal(v === 'none' ? '' : (v as SurveyRecurrence))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="One-time only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time only</SelectItem>
                  {(Object.keys(SURVEY_RECURRENCE_LABELS) as SurveyRecurrence[]).map(key => (
                    <SelectItem key={key} value={key}>
                      {SURVEY_RECURRENCE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Zone</span>
              <Select
                value={selectedZoneId}
                onValueChange={v => {
                  setSelectedZoneId(v)
                  setSelectedLocationIds([])
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  {locationTree?.zones.map(z => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {selectedZoneId ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Branches</span>
                <MultiSelect
                  options={branchOptions}
                  value={selectedLocationIds}
                  onChange={setSelectedLocationIds}
                  placeholder="All branches in zone"
                  searchPlaceholder="Search branches…"
                />
                <span className="text-xs text-muted-foreground">
                  Leave empty to send to all employees in this zone
                </span>
              </label>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendOpen(false)
                resetSendState()
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={sendMut.isPending || sendingEmployees || !distributeAtLocal}
              variant="outline"
              onClick={() => void handleSend(true)}
            >
              {sendMut.isPending || sendingEmployees ? 'Scheduling…' : 'Schedule'}
            </Button>
            <Button
              disabled={sendMut.isPending || sendingEmployees}
              onClick={() => void handleSend(false)}
            >
              {sendMut.isPending || sendingEmployees ? 'Sending…' : 'Send now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

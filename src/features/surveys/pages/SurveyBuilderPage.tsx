import * as React from 'react'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Link, useParams } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  Copy,
  CopyPlus,
  DoorOpen,
  Eye,
  FilePlus2,
  LayoutTemplate,
  Library,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Printer,
  Repeat,
  Send,
  Trash2,
  Unlock,
  BarChart3,
  Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Banner } from '@/shared/ui/banner'
import { Badge } from '@/shared/ui/badge'
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
import { toastApiError, toastInfo, toastSuccess } from '@/shared/lib/toast'
import {
  useAddQuestion,
  useCancelSurveySchedule,
  useCloseSurvey,
  useCopyQuestion,
  useMoveQuestion,
  useOpenSurvey,
  usePublishSurvey,
  useRemoveQuestion,
  useSurvey,
  useSurveyResults,
  useUpdateQuestion,
  useUpdateSurvey,
} from '@/features/surveys/hooks/useSurveys'
import { buildSurveyShareUrl } from '@/features/surveys/api/surveys.api'
import { WITHOUT_NAME_SETTING_HELP } from '@/features/surveys/survey-respondent'
import { SurveyResultsStrip } from '@/features/surveys/components/SurveyResultsStrip'
import { SurveySendDialog } from '@/features/surveys/components/SurveySendDialog'
import { NewSurveyDialog, type NewSurveyStart } from '@/features/surveys/components/NewSurveyDialog'
import { SurveyLibraryUpdateBanner } from '@/features/surveys/components/SurveyLibraryUpdateBanner'
import { SurveyManagerCopiesDialog, namesManager } from '@/features/surveys/components/SurveyManagerCopiesDialog'
import { SurveyDateTimeField } from '@/features/surveys/components/SurveyDateTimeField'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import {
  describeSurveyAudience,
  useSurveyAudienceLookups,
} from '@/features/surveys/components/SurveyAudienceFields'
import {
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_RECURRENCE_LABELS,
  SURVEY_STATUS_LABELS,
  SURVEY_TARGET_KIND_LABELS,
  type SurveyQuestion,
} from '@/features/surveys/types'
import {
  formatSurveyDateTime,
  isoToSurveyLocal,
  surveyEndLabel,
  surveyEndPassed,
  surveyLocalToIso,
} from '@/features/surveys/survey-datetime'
import { SurveyReopenDialog } from '@/features/surveys/components/SurveyReopenDialog'
import { describeShowIf } from '@/features/surveys/survey-logic'
import { describeLikertScale } from '@/features/surveys/survey-likert'
import { SurveyQuestionEditor } from '@/features/surveys/components/SurveyQuestionEditor'
import { SurveyAlertRulesPanel } from '@/features/surveys/alerts/SurveyAlertRulesPanel'
import { SurveyAccessPanel } from '@/features/surveys/access/SurveyAccessPanel'
import { SURVEY_AUDIENCE_GROUPS } from '@/features/surveys/survey-audience-groups'
import { SurveyReviewersPanel } from '@/features/surveys/reviewers/SurveyReviewers'
import { SurveyRemindersPanel } from '@/features/surveys/reminders/SurveyRemindersPanel'
import { SurveyContactRulePanel } from '@/features/surveys/contact-rule/SurveyContactRulePanel'
import { SurveyEventTriggerPanel } from '@/features/surveys/event-triggers/SurveyEventTriggerPanel'
import { SendOutsideDialog } from '@/features/surveys/outside/SendOutsideDialog'
import { SurveySharePanel } from '@/features/surveys/sharing/SurveySharePanel'
import {
  MoveToSectionButton,
  SplitSectionsWarning,
  SurveySectionHeader,
  useSectionActions,
} from '@/features/surveys/sections/SurveySectionControls'
import { SurveyQuestionFormatDialog } from '@/features/surveys/components/SurveyQuestionFormatGallery'
import { SurveyQuestionBankDialog, bankAudienceForSurvey } from '@/features/surveys/components/SurveyQuestionBankDialog'
import type { BankQuestion } from '@/features/surveys/api/survey-library.api'
import {
  bankQuestionToDraft,
  draftToInput,
  emptyDraft,
  lockedDraftToInput,
  notCountedOf,
  questionToDraft,
  sectionTitles,
  showIfSources,
  type QuestionDraft,
} from '@/features/surveys/survey-question-draft'

/** The survey's introduction (what people read first): two lines, with the rest a click away. */
function SurveyIntroduction({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false)
  const id = React.useId()
  const long = text.length > 240 || text.split('\n').filter(Boolean).length > 2
  return (
    <section className="mb-5 rounded-xl border border-border bg-card px-4 py-3" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-sm font-semibold text-foreground">
        Introduction people read first
      </h2>
      <p
        id={`${id}-text`}
        className={`mt-1 whitespace-pre-line text-sm text-muted-foreground ${open || !long ? '' : 'line-clamp-2'}`}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          aria-expanded={open}
          aria-controls={`${id}-text`}
          onClick={() => setOpen(v => !v)}
        >
          {open ? 'Show less' : 'Show the full introduction'}
        </button>
      ) : null}
    </section>
  )
}

export default function SurveyBuilderPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const { data: survey, isLoading, isError } = useSurvey(surveyId)
  useDocumentTitle(survey ? `Survey: ${survey.title} – CareAdmin` : null)
  const addMut = useAddQuestion(surveyId)
  const updateMut = useUpdateQuestion(surveyId)
  const removeMut = useRemoveQuestion(surveyId)
  const moveMut = useMoveQuestion(surveyId)
  const copyMut = useCopyQuestion(surveyId)
  const publishMut = usePublishSurvey(surveyId)
  const openMut = useOpenSurvey(surveyId)
  const closeMut = useCloseSurvey(surveyId)
  const cancelScheduleMut = useCancelSurveySchedule(surveyId)
  const updateMutSurvey = useUpdateSurvey(surveyId)
  const isTemplate = Boolean(survey?.isTemplate)
  // Shared company template seen by a branch-restricted user: view and "Use" only.
  const readOnly = Boolean(survey?.readOnly)
  const canEdit = canManage && !readOnly
  // A repeating survey's own dates mean nothing — each period gets its dates from the schedule.
  const isSeriesSurvey = Boolean(
    survey && !survey.clonedFromId && (survey.recurrence || survey.periodCount > 0),
  )
  const { data: results } = useSurveyResults(surveyId, Boolean(surveyId) && Boolean(survey) && !isTemplate)
  const hasSchedule = Boolean(survey?.distributeAt && !survey?.distributedAt)
  const { lookups } = useSurveyAudienceLookups(
    survey?.targetKind ?? 'EMPLOYEE',
    Boolean(survey) && hasSchedule,
    (survey?.audienceEmployeeIds?.length ?? 0) > 0,
  )

  /** The question editor: adding (with the draft to start from) or editing a question. */
  const [editor, setEditor] = React.useState<{
    question: SurveyQuestion | null
    initial: QuestionDraft
    note?: string | null
    /** "Add question here": straight after this question (the end of its section). */
    afterQuestionId?: string
  } | null>(null)
  /** "See example questions" from the survey page: a format opens the editor on a new question. */
  const [formatsOpen, setFormatsOpen] = React.useState(false)
  /** The section the last added question went in: the next one continues it. */
  const [lastSection, setLastSection] = React.useState('')
  const [removeTarget, setRemoveTarget] = React.useState<SurveyQuestion | null>(null)
  const [sendOpen, setSendOpen] = React.useState(false)
  const [outsideOpen, setOutsideOpen] = React.useState(false)
  /** "Make a copy for each manager" (a staff survey whose text says {{manager}}). */
  const [managerCopiesOpen, setManagerCopiesOpen] = React.useState(false)
  const [newSurvey, setNewSurvey] = React.useState<NewSurveyStart | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')
  const [editClosingMessage, setEditClosingMessage] = React.useState('')
  /** Who it's for ('' = not said). */
  const [editGroup, setEditGroup] = React.useState('')
  const [editGroupOther, setEditGroupOther] = React.useState('')
  const [editAnonymous, setEditAnonymous] = React.useState(false)
  const [editAllowWithoutName, setEditAllowWithoutName] = React.useState(false)
  const [editOpensAt, setEditOpensAt] = React.useState('')
  const [editClosesAt, setEditClosesAt] = React.useState('')
  const [editOpenDays, setEditOpenDays] = React.useState('')
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false)
  const [reopenOpen, setReopenOpen] = React.useState(false)

  const sectionActions = useSectionActions(surveyId)
  const openEdit = (q: SurveyQuestion) => setEditor({ question: q, initial: questionToDraft(q) })
  const openAdd = () => setEditor({ question: null, initial: emptyDraft(lastSection) })

  const handleSave = async (draft: QuestionDraft) => {
    const editing = editor?.question ?? null
    try {
      if (editing) {
        // Answered: the help text, section heading and comment box can still change.
        const input = survey?.questionsLocked ? lockedDraftToInput(draft, editing) : draftToInput(draft, editing)
        await updateMut.mutateAsync({ questionId: editing.id, input })
        toastSuccess('Question updated')
      } else {
        // After the last question: positions can have gaps once questions are removed, so the count
        // could put the new question in the middle (and before a question its "Show only if" uses).
        const sortOrder = (survey?.questions ?? []).reduce((next, q) => Math.max(next, q.sortOrder + 1), 0)
        await addMut.mutateAsync({
          ...draftToInput(draft),
          ...(editor?.afterQuestionId ? { afterQuestionId: editor.afterQuestionId } : { sortOrder }),
        })
        toastSuccess('Question added')
        setLastSection(draft.sectionTitle.trim())
      }
      setEditor(null)
    } catch (e) {
      toastApiError(e, editing ? 'Could not update question' : 'Could not add question')
    }
  }

  /** Read out after a move, for people using a screen reader. */
  const [moveAnnouncement, setMoveAnnouncement] = React.useState('')
  const handleMove = async (
    q: SurveyQuestion,
    direction: 'up' | 'down',
    move: { blockedReason: string | null; to: number; total: number },
  ) => {
    // A blocked move stays focusable and says why (a disabled button's tooltip is never read out).
    if (move.blockedReason) {
      toastInfo('This question cannot move there', move.blockedReason)
      setMoveAnnouncement(move.blockedReason)
      return
    }
    try {
      await moveMut.mutateAsync({ questionId: q.id, direction })
      setMoveAnnouncement(`Question moved to position ${move.to} of ${move.total}.`)
    } catch (e) {
      toastApiError(e, 'Could not move question')
    }
  }

  const handleCopy = async (q: SurveyQuestion) => {
    try {
      await copyMut.mutateAsync(q.id)
      toastSuccess('Question copied — the copy is straight after it')
    } catch (e) {
      toastApiError(e, 'Could not copy question')
    }
  }

  const [bankOpen, setBankOpen] = React.useState(false)
  const [bankAdding, setBankAdding] = React.useState(false)
  /** After adding from the bank: the first new question opens for editing once the list has it. */
  const [editWhenListed, setEditWhenListed] = React.useState<string | null>(null)

  /**
   * Add from the question bank: in the order chosen, each a new question of the survey's own (a new
   * key, no link to the library), after the last one; then the first opens for editing.
   */
  const handleAddFromBank = async (chosen: BankQuestion[], section: string | null | undefined) => {
    setBankAdding(true)
    let added = 0
    let firstId: string | null = null
    try {
      let sortOrder = (survey?.questions ?? []).reduce((next, q) => Math.max(next, q.sortOrder + 1), 0)
      for (const q of chosen) {
        const created = await addMut.mutateAsync({ ...draftToInput(bankQuestionToDraft(q, section)), sortOrder })
        sortOrder += 1
        added += 1
        firstId ??= created?.id ?? null
      }
      toastSuccess(added === 1 ? 'Question added — check it and change anything you need' : `${added} questions added — the first is open to check`)
      setBankOpen(false)
      if (firstId) setEditWhenListed(firstId)
    } catch (e) {
      toastApiError(e, added ? `${added} of ${chosen.length} questions added; the rest could not be` : 'Could not add the questions')
    } finally {
      setBankAdding(false)
    }
  }

  React.useEffect(() => {
    if (!editWhenListed) return
    const q = survey?.questions.find(x => x.id === editWhenListed)
    if (!q) return
    setEditWhenListed(null)
    setEditor({ question: q, initial: questionToDraft(q) })
  }, [editWhenListed, survey?.questions])

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
    try {
      let token = survey.shareToken
      if (survey.status === 'DRAFT') {
        const published = await publishMut.mutateAsync()
        token = published.shareToken
        toastSuccess('Survey published')
      }
      if (!token) return
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

  const openDetailsEditor = () => {
    if (!survey) return
    setEditTitle(survey.title)
    setEditDescription(survey.description ?? '')
    setEditClosingMessage(survey.closingMessage ?? '')
    setEditGroup(survey.audienceGroup ?? '')
    setEditGroupOther(survey.audienceGroupOther ?? '')
    setEditAnonymous(survey.isAnonymous)
    setEditAllowWithoutName(Boolean(survey.allowAnonymousResponses))
    setEditOpensAt(isoToSurveyLocal(survey.opensAt))
    setEditClosesAt(isoToSurveyLocal(survey.closesAt))
    setEditOpenDays(survey.periodOpenDays ? String(survey.periodOpenDays) : '')
    setDetailsOpen(true)
  }

  const detailsScheduleInvalid =
    !isSeriesSurvey && Boolean(editOpensAt && editClosesAt && editClosesAt <= editOpensAt)
  const openDaysValue = editOpenDays.trim() ? Number(editOpenDays) : null
  const openDaysInvalid =
    openDaysValue !== null && (!Number.isInteger(openDaysValue) || openDaysValue < 1 || openDaysValue > 366)

  const handleSaveDetails = async () => {
    if (!survey || !editTitle.trim() || detailsScheduleInvalid || openDaysInvalid) return
    try {
      await updateMutSurvey.mutateAsync({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        closingMessage: editClosingMessage.trim() || null,
        // Who it's for (a label on top of the audience type; SEVERAL adds the "Who are you?" question).
        audienceGroup: editGroup || null,
        audienceGroupOther: editGroup === 'OTHER' ? editGroupOther.trim() || null : null,
        ...(survey.settingsLocked || survey.anonymityLocked ? {} : { isAnonymous: editAnonymous }),
        // Named surveys only; it cannot be turned off once fixed (the server checks this too).
        ...((survey.settingsLocked || survey.anonymityLocked ? survey.isAnonymous : editAnonymous) ||
        (survey.anonymousChoiceFixed && !editAllowWithoutName)
          ? {}
          : { allowAnonymousResponses: editAllowWithoutName }),
        ...(isSeriesSurvey
          ? {}
          : {
              opensAt: surveyLocalToIso(editOpensAt) ?? null,
              closesAt: surveyLocalToIso(editClosesAt) ?? null,
            }),
        ...(survey.recurrence ? { periodOpenDays: openDaysValue } : {}),
      })
      toastSuccess('Survey details saved')
      setDetailsOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not save survey details')
    }
  }

  const runAction = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    try {
      await fn()
      toastSuccess(ok)
    } catch (e) {
      toastApiError(e, fail)
    }
  }

  /** Reopen (publish again for a public survey), optionally with a new end date or none. */
  const reopen = async (input: { closesAt?: string | null }): Promise<boolean> => {
    try {
      await (survey?.targetKind === 'PUBLIC' ? publishMut.mutateAsync(input) : openMut.mutateAsync(input))
      toastSuccess('Survey reopened')
      return true
    } catch (e) {
      toastApiError(e, 'Could not reopen survey')
      return false
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
  /** The survey's section headings, in order. */
  const sectionNames = [...new Set(questions.map(q => q.sectionTitle?.trim() ?? '').filter(Boolean))]
  const placeQuestion = async (questionId: string, title: string | null) => {
    try {
      await sectionActions.place.mutateAsync({ questionId, title })
      toastSuccess(title ? `Moved to “${title}”` : 'Moved out of its section')
    } catch (e) {
      toastApiError(e, 'Could not move the question')
    }
  }
  const forServiceUsers = survey.targetKind === 'SERVICE_USER'
  const forPublic = survey.targetKind === 'PUBLIC'
  const audienceLower = SURVEY_TARGET_KIND_LABELS[survey.targetKind].toLowerCase()
  const isClosed = survey.status === 'CLOSED'
  // Anonymity cannot change once sent or answered, nor on a ready-made survey (its privacy notice says which).
  const anonymityFixed = survey.settingsLocked || Boolean(survey.anonymityLocked)
  const isPeriod = Boolean(survey.clonedFromId)
  const isSeries = !isPeriod && !survey.eventTrigger && (Boolean(survey.recurrence) || survey.periodCount > 0)
  const alreadySent = survey.recipientCount > 0
  const scheduleFailed = Boolean(survey.distributionFailedAt)
  const noQuestions = questions.length === 0
  const scheduledAudience = describeSurveyAudience(
    survey.targetKind,
    {
      locationIds: survey.locationIds,
      roleIds: survey.roleIds,
      employeeIds: survey.audienceEmployeeIds ?? [],
    },
    lookups,
  )
  const startFromTemplate = () =>
    setNewSurvey({
      kind: 'template',
      template: {
        id: survey.id,
        title: survey.title,
        targetKind: survey.targetKind,
        isAnonymous: survey.isAnonymous,
        locationIds: survey.locationIds,
        roleIds: survey.roleIds,
        description: survey.description,
        questionCount: questions.length,
        librarySourceId: survey.librarySourceId ?? null,
        libraryReference: survey.libraryReference ?? null,
      },
    })

  const previewButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={noQuestions}
      title={noQuestions ? 'Add a question first' : undefined}
      asChild={!noQuestions}
    >
      {noQuestions ? (
        <>
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Preview
        </>
      ) : (
        <Link to="/surveys/$surveyId/preview" params={{ surveyId }}>
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Preview
        </Link>
      )}
    </Button>
  )
  // A printable paper copy of the questions (audited when printed).
  const paperCopyButton = noQuestions ? null : (
    <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
      <Link to="/surveys/$surveyId/paper-copy" params={{ surveyId }} target="_blank">
        <Printer className="h-3.5 w-3.5" aria-hidden />
        Paper copy
      </Link>
    </Button>
  )

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
              {isTemplate ? 'Template' : SURVEY_STATUS_LABELS[survey.status]} · {SURVEY_TARGET_KIND_LABELS[survey.targetKind]}{survey.audienceGroupLabel ? ` · For: ${survey.audienceGroupLabel}` : ''}
              {survey.isAnonymous ? ' · Anonymous' : survey.allowAnonymousResponses ? ' · Name optional' : ''} · {questions.length} question
              {questions.length === 1 ? '' : 's'}
              {survey.createdByName ? ` · Created by ${survey.createdByName}` : ''}
              {survey.libraryReference ? ` · Ready-made ${survey.libraryReference}` : ''}
              {!isTemplate && surveyEndLabel(survey) ? (
                <span data-testid="survey-end-label"> · {surveyEndLabel(survey)}</span>
              ) : null}
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2" data-testid="survey-actions">
            {previewButton}
            {paperCopyButton}
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={openDetailsEditor}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit details
              </Button>
            ) : null}
            {survey.targetKind === 'EMPLOYEE' && (isTemplate || survey.status === 'DRAFT') && namesManager({ ...survey, questions }) ? (
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setManagerCopiesOpen(true)}>
                <Users className="h-3.5 w-3.5" aria-hidden />
                Make a copy for each manager
              </Button>
            ) : null}
            {isTemplate ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={noQuestions}
                onClick={startFromTemplate}
              >
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
                Use this template
              </Button>
            ) : (
              <>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                  <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                    Results
                    {(survey.responseCount ?? 0) > 0 ? ` (${survey.responseCount})` : ''}
                  </Link>
                </Button>
                {!isClosed ? (
                  <>
                    {forPublic ? (
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        disabled={noQuestions || publishMut.isPending}
                        onClick={() => void copyShareLink()}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        {publishMut.isPending
                          ? 'Preparing…'
                          : survey.status === 'DRAFT'
                            ? 'Publish & copy link'
                            : 'Copy shareable link'}
                      </Button>
                    ) : null}
                    {forPublic && !survey.isAnonymous && canManage && !isTemplate ? (
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={noQuestions} onClick={() => setOutsideOpen(true)}>
                        <Send className="h-3.5 w-3.5" aria-hidden />
                        Send to people
                      </Button>
                    ) : null}
                    {forPublic ? null : (
                      <>
                        {survey.status === 'DRAFT' && !isSeries ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={noQuestions || openMut.isPending}
                            onClick={() =>
                              void runAction(
                                () => openMut.mutateAsync(),
                                'Open for responses — staff can now record answers',
                                'Could not open survey',
                              )
                            }
                          >
                            <DoorOpen className="h-3.5 w-3.5" aria-hidden />
                            Open for responses
                          </Button>
                        ) : null}
                        {survey.eventTrigger ? (
                          <span className="text-xs text-muted-foreground" data-testid="survey-sent-after-events">
                            Sent after events: see “Sent when something happens” below.
                          </span>
                        ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5"
                          disabled={noQuestions}
                          onClick={() => setSendOpen(true)}
                        >
                          {isSeries ? <Repeat className="h-3.5 w-3.5" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
                          {isSeries
                            ? 'Change schedule'
                            : alreadySent
                              ? `Send to more ${audienceLower}`
                              : 'Send or schedule'}
                        </Button>
                        )}
                      </>
                    )}
                    {/* A draft has nothing to close (a repeating survey can still stop repeating). */}
                    {survey.status !== 'DRAFT' || isSeries ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={closeMut.isPending}
                        onClick={() => setCloseConfirmOpen(true)}
                      >
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                        {isSeries ? 'Stop repeating' : 'Close survey'}
                      </Button>
                    ) : null}
                  </>
                ) : isSeries && !forPublic ? (
                  // A stopped repeating survey is restarted with a new repeat — its periods are
                  // what people answer, so it is never "reopened" itself.
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={noQuestions}
                    onClick={() => setSendOpen(true)}
                  >
                    <Repeat className="h-3.5 w-3.5" aria-hidden />
                    Restart repeating
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={openMut.isPending || noQuestions}
                    onClick={() =>
                      // Past its end date: ask for a new one (or none) first, or it would close again.
                      surveyEndPassed(survey.closesAt) ? setReopenOpen(true) : void reopen({})
                    }
                  >
                    <Unlock className="h-3.5 w-3.5" aria-hidden />
                    Reopen survey
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {previewButton}
            {paperCopyButton}
            {isTemplate ? null : (
              <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  Results
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {survey.description ? <SurveyIntroduction text={survey.description} /> : null}

      {isTemplate ? (
        <Banner
          className="mb-5 rounded-xl"
          variant="info"
          icon={<LayoutTemplate className="h-4 w-4" />}
          title={readOnly ? 'Shared company template — read only' : 'This is a template — it is never sent'}
          message={
            readOnly
              ? 'This template is shared by every branch, so only someone with access to all branches can change it. Use “Use this template” to start your own survey from it — you can change that survey’s questions.'
              : 'A template is a reusable starting point. Edit its questions here, then use “Use this template” to create a survey you can send, schedule or open for responses. The template itself never receives answers.'
          }
        />
      ) : null}

      {isTemplate && survey.librarySourceId ? (
        <>
          <p className="-mt-3 mb-5 px-1 text-xs text-muted-foreground" data-testid="library-next-step">
            From the ready-made library ({survey.libraryReference ?? 'ready-made'}
            {survey.libraryRevision ? `, revision ${survey.libraryRevision}` : ''}). Next: check the wording, then use
            “Use this template” to start a survey.
          </p>
          <SurveyLibraryUpdateBanner surveyId={survey.id} canApply={canEdit} />
        </>
      ) : null}

      {!isTemplate && isClosed ? (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          {isSeries
            ? 'This repeating survey has stopped — no more periods will be sent.'
            : survey.closedAtEndDate
              ? `This survey closed at its end date${survey.closesAt ? ` (${formatSurveyDateTime(survey.closesAt)})` : ''} and no longer accepts responses.`
              : 'This survey is closed and no longer accepts responses.'}
          {canManage ? (isSeries ? ' Use Restart repeating to start it again.' : ' Use Reopen survey to accept responses again.') : ''}
        </div>
      ) : null}

      {isPeriod ? (
        <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p className="text-foreground">
            One period of the repeating survey{' '}
            <Link
              to="/surveys/$surveyId"
              params={{ surveyId: survey.clonedFromId! }}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {survey.clonedFromTitle ?? 'repeating survey'}
            </Link>
            {survey.closesAt ? ` · open until ${formatSurveyDateTime(survey.closesAt)}` : ''}.
          </p>
        </div>
      ) : null}

      {scheduleFailed ? (
        <Banner
          className="mb-5 rounded-xl"
          variant="destructive"
          title="Scheduled send failed"
          message={`${survey.distributionError ?? 'The scheduled send did not go out.'} Nothing was sent. Fix the problem, then schedule it again.`}
        />
      ) : null}

      {!isTemplate && forServiceUsers ? (
        <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3" data-testid="survey-how-people-answer">
          <h2 className="text-sm font-semibold text-foreground">How people answer this survey</h2>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">In their portal:</span> use Send or schedule. People with
              a portal account get an email and answer in the portal. A family member or representative can answer
              for them. To ask particular people, choose Chosen people when you send: anyone without a portal
              account is added to the recording list, for a call, a visit or a letter.
            </li>
            <li>
              <span className="font-medium text-foreground">By phone, on a visit or on paper:</span>{' '}
              {survey.status === 'DRAFT'
                ? 'use Open for responses, then Results → Individual responses → Record response.'
                : 'go to Results → Individual responses → Record response and type in their answers.'}{' '}
              Most people we support answer this way.
            </li>
            <li>
              {survey.isAnonymous
                ? 'On an anonymous survey nobody’s own link is ever shown. To reach people without a portal, turn on the shared link below.'
                : 'To send someone their own link by text or WhatsApp, use Copy link under Results → Recipients. You can also turn on one shared link below.'}{' '}
              To see what they see, use Preview.
            </li>
          </ul>
        </div>
      ) : null}

      {!isTemplate && survey.targetKind === 'EMPLOYEE' ? (
        <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3" data-testid="survey-how-people-answer">
          <h2 className="text-sm font-semibold text-foreground">How staff answer this survey</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Use Send or schedule. Each member of staff gets an email with their own link and a carer app
            notification.{' '}
            {survey.isAnonymous
              ? 'On an anonymous survey nobody’s own link is ever shown.'
              : 'To send someone their own link another way, use Copy link under Results → Recipients.'}{' '}
            You can also turn on one shared link below, for a poster or a team meeting. To see what they see, use Preview.
          </p>
        </div>
      ) : null}

      {!isTemplate && canManage && !(isClosed && !survey.shareToken) ? (
        <SurveySharePanel
          survey={survey}
          canManage={canManage}
          prepareMainLink={
            forPublic && !noQuestions
              ? async () => {
                  try {
                    const published = await publishMut.mutateAsync()
                    toastSuccess('Survey published')
                    return published.shareToken
                  } catch (e) {
                    toastApiError(e, 'Could not publish the survey')
                    return null
                  }
                }
              : undefined
          }
        />
      ) : null}

      {!isTemplate && hasSchedule && !scheduleFailed ? (
        <div
          className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          data-testid="scheduled-distribution"
        >
          <div className="min-w-0 space-y-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
              {survey.recurrence
                ? `Repeats ${SURVEY_RECURRENCE_LABELS[survey.recurrence].toLowerCase()}`
                : 'Scheduled distribution'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {survey.recurrence ? 'Next period: ' : 'Sends at '}
              <span className="font-medium text-foreground">{formatSurveyDateTime(survey.distributeAt)}</span>
              {survey.recurrence
                ? ` · each period is a new copy of this survey${
                    survey.periodOpenDays ? `, open for ${survey.periodOpenDays} days` : ', open until the next period'
                  }`
                : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Goes to: <span className="font-medium text-foreground">{scheduledAudience}</span>
              {survey.scheduledByName ? ` · scheduled by ${survey.scheduledByName}` : ''}
            </p>
            {survey.distributionError ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">Last run: {survey.distributionError}</p>
            ) : null}
          </div>
          {canManage ? (
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setSendOpen(true)}>
                Change
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={cancelScheduleMut.isPending}
                onClick={() =>
                  void runAction(
                    () => cancelScheduleMut.mutateAsync(),
                    'Scheduled distribution cancelled',
                    'Could not cancel schedule',
                  )
                }
              >
                {cancelScheduleMut.isPending ? 'Cancelling…' : 'Cancel schedule'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Nothing to show on a draft nobody has answered yet. */}
      {!isTemplate &&
      !(survey.status === 'DRAFT' && !isSeries && !(survey.responseCount ?? 0) && !(survey.recipientCount ?? 0)) ? (
        <SurveyResultsStrip
          className="mb-5"
          surveyId={surveyId}
          isPublic={forPublic}
          results={results}
          fallback={{ recipients: survey.recipientCount, responses: survey.responseCount ?? 0 }}
        />
      ) : null}

      {/* Questions: sections (h3) and questions sit under this heading. */}
      <section className="space-y-3" aria-labelledby="survey-questions-title">
        <h2 id="survey-questions-title" className="text-base font-semibold text-foreground">
          Questions
          {questions.length ? <span className="ml-1 text-sm font-normal text-muted-foreground"> ({questions.length})</span> : null}
        </h2>
        <p className="sr-only" aria-live="polite" data-testid="question-move-status">
          {moveAnnouncement}
        </p>
        {survey.questionsLocked ? (
          <p className="text-xs text-muted-foreground">
            People have answered this survey, so existing questions can only have their help text, section heading,
            comment box and answers not counted in percentages changed.
          </p>
        ) : null}
        {noQuestions ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No questions yet — add your first one below.
          </p>
        ) : (
          <>
          <SplitSectionsWarning surveyId={survey.id} titles={survey.splitSections ?? []} canEdit={canEdit} />
          <ol className="mt-2 space-y-2" aria-label="Questions">
            {withSectionHeadings(questions).map(({ item: q, index: idx }) => {
              // Sections: runs of questions with the same heading ("No section" shown once there are sections).
              const titleOf = (x?: SurveyQuestion) => x?.sectionTitle?.trim() ?? ''
              const runStart = idx === 0 || titleOf(questions[idx - 1]) !== titleOf(q)
              const runIndex = questions.slice(0, idx + 1).filter((x, i) => i === 0 || titleOf(questions[i - 1]) !== titleOf(x)).length - 1
              const runCount = questions.filter((x, i) => i === 0 || titleOf(questions[i - 1]) !== titleOf(x)).length
              let runEnd = idx
              while (runEnd + 1 < questions.length && titleOf(questions[runEnd + 1]) === titleOf(q)) runEnd += 1
              const previous = questions[idx - 1]
              const next = questions[idx + 1]
              const textOf = (key: string) => questions.find(x => x.key === key)?.questionText
              // A question cannot move above the one it depends on, nor that one below it.
              const upReason =
                previous && q.showIf && previous.key && q.showIf.questionKey === previous.key
                  ? 'It is asked only after an answer to the question above, so it cannot move above it.'
                  : null
              const downReason =
                next && next.showIf && q.key && next.showIf.questionKey === q.key
                  ? 'The question below is asked only after an answer to this one, so this one cannot move below it.'
                  : null
              const upBlocked = !previous || Boolean(upReason)
              const downBlocked = !next || Boolean(downReason)
              const notCounted = notCountedOf(q.config)
              const labels: Array<{ text: string; title: string }> = [
                ...(q.isRequired ? [{ text: 'Required', title: 'People must answer this' }] : []),
                ...(q.otherOption ? [{ text: 'Other', title: `“${q.otherOption.label}” with a text box` }] : []),
                ...(q.exclusiveOptions?.length
                  ? [{ text: 'Clears the others', title: q.exclusiveOptions.map(o => `Choosing “${o}” clears other answers`).join('. ') }]
                  : []),
                ...(q.commentConfig
                  ? [
                      {
                        text: 'Comment box',
                        title: q.commentConfig.showWhen?.length
                          ? `Comment box after: ${q.commentConfig.showWhen.join(', ')}`
                          : 'Comment box after any answer',
                      },
                    ]
                  : []),
                ...(q.showIf ? [{ text: 'Asked only if…', title: describeShowIf(q.showIf, textOf(q.showIf.questionKey)) }] : []),
                ...(notCounted.length
                  ? [{ text: 'Not counted answers', title: `Not counted in percentages: ${notCounted.join(', ')}` }]
                  : []),
              ]
              return (
                <React.Fragment key={q.id}>
                  {runStart && (titleOf(q) || sectionNames.length > 0) ? (
                    <SurveySectionHeader
                      surveyId={survey.id}
                      title={titleOf(q)}
                      introduction={titleOf(q) ? (survey.sectionIntros?.[titleOf(q)] ?? null) : null}
                      canEdit={canEdit}
                      isFirst={runIndex === 0}
                      isLast={runIndex === runCount - 1}
                      split={(survey.splitSections ?? []).includes(titleOf(q))}
                      onAddHere={() =>
                        setEditor({ question: null, initial: emptyDraft(titleOf(q)), afterQuestionId: questions[runEnd]!.id })
                      }
                      onDropQuestion={questionId =>
                        void placeQuestion(questionId, titleOf(q) || null)
                      }
                    />
                  ) : null}
                  <li
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                    data-testid="survey-question-item"
                    draggable={canEdit}
                    onDragStart={e => {
                      e.dataTransfer.setData('application/x-careflow-question', q.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {idx + 1}. {q.questionText}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.questionType === 'LIKERT'
                          ? describeLikertScale(q.options)
                          : SURVEY_QUESTION_TYPE_LABELS[q.questionType]}
                        {q.questionType === 'RATING'
                          ? ` ${typeof q.config?.min === 'number' ? q.config.min : 0}–${
                              typeof q.config?.max === 'number' ? q.config.max : 10
                            }`
                          : ''}
                        {q.options?.length && q.questionType !== 'LIKERT' ? ` · ${q.options.length} answers` : ''}
                        {q.helpText ? ` · ${q.helpText}` : ''}
                      </p>
                      {labels.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {labels.map(l => (
                            <Badge key={l.text} variant="muted" size="sm" title={l.title} data-testid="question-label">
                              {l.text}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Move question ${idx + 1} up`}
                          title={upReason ?? 'Move up'}
                          // Never the disabled attribute: focus stays on the button after a move, and a
                          // move blocked by a "Show only if" rule says why when pressed.
                          aria-disabled={upBlocked || moveMut.isPending}
                          className="h-8 w-8 p-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                          onClick={() => {
                            if (!previous || moveMut.isPending) return
                            void handleMove(q, 'up', { blockedReason: upReason, to: idx, total: questions.length })
                          }}
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Move question ${idx + 1} down`}
                          title={downReason ?? 'Move down'}
                          aria-disabled={downBlocked || moveMut.isPending}
                          className="h-8 w-8 p-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                          onClick={() => {
                            if (!next || moveMut.isPending) return
                            void handleMove(q, 'down', { blockedReason: downReason, to: idx + 2, total: questions.length })
                          }}
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden />
                        </Button>
                        {sectionNames.length > 0 ? (
                          <MoveToSectionButton
                            surveyId={survey.id}
                            questionId={q.id}
                            questionNumber={idx + 1}
                            current={titleOf(q)}
                            sections={sectionNames}
                          />
                        ) : null}
                        {/* Not once answered: questions are then fixed, so a copy could never be reworded. */}
                        {!survey.questionsLocked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label={`Copy question ${idx + 1}`}
                            title="Copy (added straight after it)"
                            disabled={copyMut.isPending}
                            onClick={() => void handleCopy(q)}
                          >
                            <CopyPlus className="h-4 w-4" aria-hidden />
                          </Button>
                        ) : null}
                        <Button type="button" size="sm" variant="outline" onClick={() => openEdit(q)}>
                          Edit
                        </Button>
                        {/* Not once the survey has responses (some may be held back from the counts). */}
                        {!survey.questionsLocked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            aria-label={`Remove question ${idx + 1}`}
                            onClick={() => setRemoveTarget(q)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                </React.Fragment>
              )
            })}
          </ol>
          </>
        )}
      {canEdit ? (
        <div className="pt-1">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="gap-1.5" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add question
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setBankOpen(true)}>
              <Library className="h-3.5 w-3.5" aria-hidden />
              Add from question bank
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setFormatsOpen(true)}>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              See example questions
            </Button>
          </div>
        </div>
      ) : null}
      </section>

      {/* Settings, together after the questions: who can see the answers, and alerts (templates carry
          them to the surveys made from them). */}
      <section className="mt-8 space-y-3" aria-labelledby="survey-settings-title" data-testid="survey-settings">
        <div>
          <h2 id="survey-settings-title" className="text-base font-semibold text-foreground">
            Survey settings
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Who can see the answers, and what happens when an answer needs someone to act.
          </p>
        </div>
        <SurveyAccessPanel surveyId={survey.id} />
        {!isTemplate ? <SurveyReviewersPanel surveyId={survey.id} canEdit={canEdit} /> : null}
        <SurveyAlertRulesPanel surveyId={survey.id} canEdit={canEdit} />
        {!isTemplate && (survey.targetKind !== 'PUBLIC' || !survey.isAnonymous) ? (
          <SurveyRemindersPanel surveyId={survey.id} canEdit={canEdit} isOpen={survey.status === 'ACTIVE'} />
        ) : null}
        {!isTemplate && survey.targetKind !== 'PUBLIC' ? (
          <SurveyContactRulePanel surveyId={survey.id} canEdit={canEdit} isOpen={survey.status === 'ACTIVE'} />
        ) : null}
        {!isTemplate && !survey.clonedFromId && !isSeries ? (
          <SurveyEventTriggerPanel surveyId={survey.id} canEdit={canEdit} />
        ) : null}
      </section>

      {formatsOpen ? (
        <SurveyQuestionFormatDialog
          open
          onOpenChange={setFormatsOpen}
          draft={emptyDraft(lastSection)}
          targetKind={survey.targetKind}
          anonymous={survey.isAnonymous}
          earlier={showIfSources(questions, questions.length)}
          onApply={(draft, note) => {
            setFormatsOpen(false)
            setEditor({ question: null, initial: draft, note })
          }}
        />
      ) : null}

      {bankOpen ? (
        <SurveyQuestionBankDialog
          open
          onOpenChange={setBankOpen}
          mode="multi"
          anonymous={survey.isAnonymous}
          defaultAudience={bankAudienceForSurvey(survey.targetKind)}
          sections={sectionTitles(questions)}
          pending={bankAdding}
          onUse={(chosen, section) => void handleAddFromBank(chosen, section)}
        />
      ) : null}

      {editor ? (
        <SurveyQuestionEditor
          open
          onOpenChange={o => !o && setEditor(null)}
          initial={editor.initial}
          editing={
            editor.question
              ? { number: questions.findIndex(q => q.id === editor.question!.id) + 1, total: questions.length }
              : null
          }
          newNumber={questions.length + 1}
          locked={Boolean(editor.question && survey.questionsLocked)}
          earlier={showIfSources(
            questions,
            editor.question ? questions.findIndex(q => q.id === editor.question!.id) : questions.length,
          )}
          dependents={
            editor.question?.key
              ? questions.filter(q => q.id !== editor.question!.id && q.showIf?.questionKey === editor.question!.key)
              : []
          }
          sections={sectionTitles(questions)}
          pending={addMut.isPending || updateMut.isPending}
          anonymous={survey.isAnonymous}
          targetKind={survey.targetKind}
          initialNote={editor.note ?? null}
          onSave={draft => void handleSave(draft)}
        />
      ) : null}

      {/* Edit survey details */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{isTemplate ? 'Edit template details' : 'Edit survey details'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Title *</span>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="e.g. Staff satisfaction Q3" />
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
            <div className="space-y-1 text-sm">
              <label htmlFor="edit-audience-group" className="block font-medium">
                Who it&apos;s for
              </label>
              <select
                id="edit-audience-group"
                value={editGroup}
                onChange={e => setEditGroup(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Not said</option>
                {SURVEY_AUDIENCE_GROUPS[survey.targetKind].map(g => (
                  <option key={g.code} value={g.code}>
                    {g.label}
                  </option>
                ))}
              </select>
              {editGroup === 'OTHER' ? (
                <Input
                  aria-label="The group in your own words"
                  value={editGroupOther}
                  maxLength={100}
                  onChange={e => setEditGroupOther(e.target.value)}
                  placeholder="e.g. Day centre visitors"
                />
              ) : null}
              {editGroup === 'SEVERAL' && survey.audienceGroup !== 'SEVERAL' ? (
                <p className="text-xs text-muted-foreground">
                  A &quot;Who are you?&quot; question is added first, so Results can be split by group (not once anyone has answered).
                </p>
              ) : null}
            </div>
            <div className="space-y-1 text-sm">
              <label htmlFor="edit-closing-message" className="block font-medium">
                Message after submitting
              </label>
              <textarea
                id="edit-closing-message"
                value={editClosingMessage}
                onChange={e => setEditClosingMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                aria-describedby="edit-closing-message-help"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional: what happens next, or where to get help"
              />
              <p id="edit-closing-message-help" className="text-xs text-muted-foreground">
                Shown under the thank-you once someone submits. You can change it at any time.
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editAnonymous}
                  disabled={anonymityFixed}
                  onChange={e => setEditAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                  data-testid="survey-details-anonymous"
                />
                Anonymous responses — answers are never linked to who gave them
              </label>
              {survey.anonymityLocked ? (
                <p className="text-xs text-muted-foreground" data-testid="survey-details-anonymity-reason">
                  Set by the ready-made survey{survey.libraryReference ? ` ${survey.libraryReference}` : ''} — its
                  introduction and privacy notice are written for{' '}
                  {survey.isAnonymous ? 'anonymous' : 'named, confidential'} answers.
                </p>
              ) : survey.settingsLocked ? (
                <p className="text-xs text-muted-foreground">
                  Fixed now the survey has been sent or answered — people were told whether it is anonymous.
                </p>
              ) : null}
            </div>
            {(anonymityFixed ? survey.isAnonymous : editAnonymous) ? null : (
              <div className="space-y-1 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editAllowWithoutName}
                    disabled={Boolean(survey.anonymousChoiceFixed) && editAllowWithoutName}
                    onChange={e => setEditAllowWithoutName(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                    data-testid="survey-details-allow-without-name"
                  />
                  Let people choose to answer without their name
                </label>
                <p className="text-xs text-muted-foreground" data-testid="survey-details-allow-without-name-help">
                  {survey.anonymousChoiceFixed === 'library'
                    ? `Set by the ready-made survey${survey.libraryReference ? ` ${survey.libraryReference}` : ''} — its privacy notice tells people they can answer without their name.`
                    : survey.anonymousChoiceFixed === 'sent'
                      ? 'Fixed now people have been offered it — it cannot be turned off.'
                      : WITHOUT_NAME_SETTING_HELP}
                </p>
              </div>
            )}
            {isTemplate || isSeriesSurvey ? null : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <span className="block font-medium">Start</span>
                  <SurveyDateTimeField label="Start" value={editOpensAt} onChange={setEditOpensAt} />
                </div>
                <div className="space-y-1 text-sm">
                  <span className="block font-medium">End</span>
                  <SurveyDateTimeField
                    label="End"
                    value={editClosesAt}
                    min={editOpensAt || undefined}
                    defaultTime="17:00"
                    onChange={setEditClosesAt}
                  />
                </div>
              </div>
            )}
            {detailsScheduleInvalid ? <p className="text-xs text-destructive">End must be after the start.</p> : null}
            {survey.recurrence ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Keep each period open for (days)</span>
                <Input
                  type="number"
                  min={1}
                  max={366}
                  value={editOpenDays}
                  onChange={e => setEditOpenDays(e.target.value)}
                  placeholder="Until the next period starts"
                />
                {openDaysInvalid ? (
                  <span className="block text-xs text-destructive">Enter a whole number of days from 1 to 366.</span>
                ) : null}
              </label>
            ) : null}
            {isTemplate ? null : isSeriesSurvey ? (
              <p className="text-xs text-muted-foreground">
                This survey repeats, so it has no start or end of its own — each period gets its dates when it
                is sent. Change when periods go out with Change schedule.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Times are UK (organisation) time. Leave Start or End empty for no limit. Sending, scheduling and
                repeating are set with Send or schedule.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editTitle.trim() || detailsScheduleInvalid || openDaysInvalid || updateMutSurvey.isPending}
              onClick={() => void handleSaveDetails()}
            >
              {updateMutSurvey.isPending ? 'Saving…' : 'Save details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit question */}
      <SurveyReopenDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        closesAt={survey.closesAt}
        pending={openMut.isPending || publishMut.isPending}
        onReopen={closesAt => void reopen({ closesAt }).then(ok => ok && setReopenOpen(false))}
      />

      {/* Close survey confirm */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSeries ? 'Stop repeating this survey?' : 'Close this survey?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSeries
                ? 'No more periods will be sent. Periods already sent keep their answers and close on their own end date.'
                : 'People will no longer be able to submit responses. You can reopen it later. Any scheduled send is cancelled.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={closeMut.isPending}
              onClick={e => {
                e.preventDefault()
                void runAction(
                  () => closeMut.mutateAsync(),
                  isSeries ? 'Repeating stopped' : 'Survey closed — new responses are blocked',
                  'Could not close survey',
                ).then(() => setCloseConfirmOpen(false))
              }}
            >
              {closeMut.isPending ? 'Closing…' : isSeries ? 'Stop repeating' : 'Close survey'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove question confirm */}
      <AlertDialog open={removeTarget != null} onOpenChange={o => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this question?</AlertDialogTitle>
            <AlertDialogDescription>“{removeTarget?.questionText}” will be removed from the survey.</AlertDialogDescription>
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

      {!isTemplate && !forPublic ? (
        <SurveySendDialog survey={survey} open={sendOpen} onOpenChange={setSendOpen} />
      ) : null}
      {outsideOpen ? <SendOutsideDialog surveyId={survey.id} open={outsideOpen} onOpenChange={setOutsideOpen} /> : null}
      {managerCopiesOpen ? (
        <SurveyManagerCopiesDialog surveyId={surveyId} open={managerCopiesOpen} onOpenChange={setManagerCopiesOpen} />
      ) : null}
      <NewSurveyDialog start={newSurvey} onClose={() => setNewSurvey(null)} />
    </div>
  )
}

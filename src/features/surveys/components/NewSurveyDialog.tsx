import * as React from 'react'
import { SURVEY_AUDIENCE_GROUPS } from '@/features/surveys/survey-audience-groups'
import { useNavigate } from '@tanstack/react-router'
import {
  BookCopy,
  CalendarClock,
  Check,
  Eye,
  FilePlus2,
  LayoutTemplate,
  Loader2,
  Lock,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { dayKeyInTimeZone } from '@/shared/lib/operational-day.util'
import { useAuthStore } from '@/features/auth/store'
import { useCreateSurvey, useDuplicateSurvey, useSurvey, useSurveys } from '@/features/surveys/hooks/useSurveys'
import {
  fetchLibrarySurveys,
  useAdoptLibrarySurveys,
  useLibrarySurvey,
  useLibrarySurveys,
  useSurveyLibraryLink,
  type LibrarySurvey,
} from '@/features/surveys/api/survey-library.api'
import {
  EMPTY_AUDIENCE,
  SurveyAudienceFields,
  type SurveyAudienceValue,
} from '@/features/surveys/components/SurveyAudienceFields'
import { SurveyDateTimeField } from '@/features/surveys/components/SurveyDateTimeField'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import { LibrarySurveyDetail, questionsText } from '@/features/surveys/components/LibrarySurveyDetail'
import {
  LIBRARY_AUDIENCE_LABELS,
  recommendedTiming,
  responsesLabel,
  shortTiming,
  suggestSurveyName,
} from '@/features/surveys/survey-library-display'
import { surveyLocalToIso } from '@/features/surveys/survey-datetime'
import { WITHOUT_NAME_SETTING_HELP } from '@/features/surveys/survey-respondent'
import { SURVEY_TARGET_KIND_LABELS, type SurveyTargetKind } from '@/features/surveys/types'

/** A template (or, for Duplicate, a survey) a new survey is started from. */
export type NewSurveySource = {
  id: string
  title: string
  targetKind: SurveyTargetKind
  isAnonymous: boolean
  locationIds: string[]
  roleIds: string[]
  description?: string | null
  questionCount?: number
  /** Adopted from the ready-made library: anonymity follows the template and timing is suggested. */
  librarySourceId?: string | null
  libraryReference?: string | null
  /** Named survey: people may choose to answer without their name. */
  allowAnonymousResponses?: boolean
}

/**
 * Where the New survey dialog opens:
 * - `choose`: step 1, Start from (Surveys page "New survey").
 * - `blank`: step 2 for a blank survey (`asTemplate` for the Templates tab's "New template").
 * - `template`: step 2 with a template chosen ("Use this template", "Use", "Start a survey now").
 * - `duplicate`: step 2 copying an existing survey (no step 1).
 */
export type NewSurveyStart =
  | { kind: 'choose' }
  | { kind: 'blank'; asTemplate?: boolean }
  | { kind: 'template'; template: NewSurveySource }
  | { kind: 'duplicate'; survey: NewSurveySource }

type Origin = 'blank' | 'template' | 'library'

type Chosen =
  | { kind: 'blank' }
  | { kind: 'template'; template: NewSurveySource; justAdopted?: boolean }
  | { kind: 'duplicate'; survey: NewSurveySource }

const textareaClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const TARGET_HELP: Record<SurveyTargetKind, string> = {
  SERVICE_USER:
    'The people you support. Staff can record answers taken by phone, on a visit or on paper; people with a portal account can also answer there (a family member or representative can answer for them).',
  PUBLIC: 'Answered through one shareable public link — anyone with the link can respond, no account needed.',
  EMPLOYEE: 'Each employee gets a personal link by push notification and email.',
}

const BRANCH_RESTRICTED_LIBRARY =
  'Ready-made surveys become templates shared by every branch, so someone with access to all branches adds them. Ones already added are under “One of your templates”.'

const fromLibrary = (s: LibrarySurvey, templateId: string): NewSurveySource => ({
  id: templateId,
  title: s.title,
  targetKind: s.audience,
  isAnonymous: s.anonymous,
  // Adopted templates are company-wide.
  locationIds: [],
  roleIds: [],
  questionCount: s.questionCount,
  librarySourceId: s.id,
  libraryReference: s.reference,
  allowAnonymousResponses: Boolean(s.allowAnonymousResponses && !s.anonymous),
})

type DetailsForm = {
  title: string
  titleEdited: boolean
  targetKind: SurveyTargetKind
  description: string
  isAnonymous: boolean
  audience: SurveyAudienceValue
}

/** The details form as it starts for what was chosen. */
function formFor(chosen: Chosen | null): DetailsForm {
  const src = chosen?.kind === 'template' ? chosen.template : chosen?.kind === 'duplicate' ? chosen.survey : null
  return {
    title: '',
    titleEdited: false,
    targetKind: src?.targetKind ?? 'EMPLOYEE',
    description: '',
    isAnonymous: src?.isAnonymous ?? false,
    audience: src ? { locationIds: src.locationIds ?? [], roleIds: src.roleIds ?? [], employeeIds: [] } : EMPTY_AUDIENCE,
  }
}

function chosenFor(start: NewSurveyStart): Chosen | null {
  switch (start.kind) {
    case 'blank':
      return { kind: 'blank' }
    case 'template':
      return { kind: 'template', template: start.template }
    case 'duplicate':
      return { kind: 'duplicate', survey: start.survey }
    default:
      return null
  }
}

/** Text ending in a full stop, so the next sentence can follow it. */
const asSentence = (text: string | null | undefined) => {
  const t = text?.trim() ?? ''
  return !t || /[.!?]$/.test(t) ? t : `${t}.`
}

function matches(q: string, ...parts: Array<string | null | undefined>) {
  return !q || parts.filter(Boolean).join(' ').toLowerCase().includes(q)
}

/**
 * The one way to start a survey: step 1 picks a blank survey, one of the organisation's templates or
 * a ready-made survey (adopted as a template behind the scenes); step 2 is the same details form for
 * every start point. Creating opens the new draft in the builder — nothing is sent or scheduled.
 */
export function NewSurveyDialog({ start, onClose }: { start: NewSurveyStart | null; onClose: () => void }) {
  return (
    <Dialog open={start != null} onOpenChange={o => (o ? undefined : onClose())}>
      <DialogContent size="lg" data-testid="new-survey-dialog">
        {start ? <NewSurveyFlow start={start} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function NewSurveyFlow({ start, onClose }: { start: NewSurveyStart; onClose: () => void }) {
  const navigate = useNavigate()
  const createMut = useCreateSurvey()
  const duplicateMut = useDuplicateSurvey()
  const adopt = useAdoptLibrarySurveys()
  // Ready-made surveys become company-wide templates: only users with access to all branches add them.
  const branchRestricted = useAuthStore(s => Array.isArray(s.user?.assignedLocationIds))

  const [initial] = React.useState(() => {
    const c = chosenFor(start)
    return { chosen: c, form: formFor(c) }
  })
  const [chosen, setChosen] = React.useState<Chosen | null>(initial.chosen)
  const step = chosen ? 'details' : 'choose'
  const canGoBack = start.kind !== 'duplicate'

  // Step 1
  const [origin, setOrigin] = React.useState<Origin>(start.kind === 'template' ? 'template' : 'blank')
  const [pickedTemplateId, setPickedTemplateId] = React.useState<string | null>(
    start.kind === 'template' ? start.template.id : null,
  )
  const [pickedLibraryId, setPickedLibraryId] = React.useState<string | null>(null)
  const [templateSearch, setTemplateSearch] = React.useState('')
  const [librarySearch, setLibrarySearch] = React.useState('')
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const [readLibraryId, setReadLibraryId] = React.useState<string | null>(null)
  const [continuing, setContinuing] = React.useState(false)

  // Step 2
  const [asTemplate, setAsTemplate] = React.useState(start.kind === 'blank' && Boolean(start.asTemplate))
  const [title, setTitle] = React.useState(initial.form.title)
  const [titleEdited, setTitleEdited] = React.useState(initial.form.titleEdited)
  const [targetKind, setTargetKind] = React.useState<SurveyTargetKind>(initial.form.targetKind)
  // Who it's for, on top of the audience type ('' = not said).
  const [audienceGroup, setAudienceGroup] = React.useState('')
  const [audienceGroupOther, setAudienceGroupOther] = React.useState('')
  const groupOptions = SURVEY_AUDIENCE_GROUPS[targetKind]
  React.useEffect(() => {
    if (audienceGroup && !groupOptions.some(g => g.code === audienceGroup)) setAudienceGroup('')
  }, [groupOptions, audienceGroup])
  const groupInput = audienceGroup
    ? { audienceGroup, audienceGroupOther: audienceGroup === 'OTHER' ? audienceGroupOther.trim() : null }
    : {}
  const [description, setDescription] = React.useState(initial.form.description)
  const [isAnonymous, setIsAnonymous] = React.useState(initial.form.isAnonymous)
  /** "Let people choose to answer without their name"; null = as the template / survey copied has it. */
  const [allowWithoutName, setAllowWithoutName] = React.useState<boolean | null>(null)
  const [audience, setAudience] = React.useState<SurveyAudienceValue>(initial.form.audience)
  const [opensAt, setOpensAt] = React.useState('')
  const [closesAt, setClosesAt] = React.useState('')

  const templatesQuery = useSurveys({ isTemplate: true })
  const templates = React.useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])
  const library = useLibrarySurveys()
  const librarySurveys = React.useMemo(() => library.data ?? [], [library.data])
  const libraryRead = useLibrarySurvey(readLibraryId)

  const source = chosen?.kind === 'template' ? chosen.template : chosen?.kind === 'duplicate' ? chosen.survey : null
  const { data: sourceDetail } = useSurvey(source?.id)
  const sourceLibraryId = chosen?.kind === 'template' ? (source?.librarySourceId ?? sourceDetail?.librarySourceId ?? null) : null
  const sourceLibrary = sourceLibraryId ? librarySurveys.find(s => s.id === sourceLibraryId) : undefined
  // Ready-made origin (an adopted template, or a survey started from one): anonymity is fixed.
  const anonymityLocked = Boolean(sourceLibraryId || sourceDetail?.anonymityLocked)
  const targetLocked = chosen?.kind === 'template'
  // A named ready-made template with an anonymous version: choose the version here (then fixed).
  const libraryLink = useSurveyLibraryLink(source?.id ?? '', Boolean(sourceLibraryId && source && !source.isAnonymous))
  const anonymousVariant = sourceLibraryId && source && !source.isAnonymous ? (libraryLink.data?.anonymousVariant ?? null) : null
  const [version, setVersion] = React.useState<'NAMED' | 'ANONYMOUS'>('NAMED')
  const variantChosen = Boolean(anonymousVariant) && version === 'ANONYMOUS'
  const willBeAnonymous = anonymityLocked && source ? source.isAnonymous || variantChosen : isAnonymous
  // A ready-made survey whose privacy notice promises "answer without your name": it stays on.
  const withoutNamePromised =
    !willBeAnonymous &&
    Boolean(sourceDetail?.anonymousChoiceFixed === 'library' || (sourceLibrary?.allowAnonymousResponses && !sourceLibrary.anonymous))
  const allowsWithoutName =
    !willBeAnonymous &&
    (withoutNamePromised ||
      (allowWithoutName ?? Boolean(sourceDetail?.allowAnonymousResponses ?? source?.allowAnonymousResponses ?? false)))

  /** Fill the details form for what was chosen. */
  const enterDetails = (next: Chosen) => {
    const form = formFor(next)
    setTitle(form.title)
    setTitleEdited(form.titleEdited)
    setTargetKind(form.targetKind)
    setDescription(form.description)
    setIsAnonymous(form.isAnonymous)
    setAllowWithoutName(null)
    setAudience(form.audience)
    setOpensAt('')
    setClosesAt('')
    if (next.kind !== 'blank') setAsTemplate(false)
    setChosen(next)
  }

  const today = React.useMemo(() => dayKeyInTimeZone(new Date()), [])
  const suggestedTitle = !source
    ? ''
    : chosen?.kind === 'duplicate'
      ? `${source.title} (Copy)`
      : suggestSurveyName(source.title, sourceLibrary?.timing, today)
  const shownTitle = titleEdited || !source ? title : suggestedTitle

  const forPublic = targetKind === 'PUBLIC'
  const scheduleInvalid = Boolean(!asTemplate && opensAt && closesAt && closesAt <= opensAt)
  const pending = createMut.isPending || duplicateMut.isPending

  const pickedTemplate = templates.find(t => t.id === pickedTemplateId)
  const pickedLibrary = librarySurveys.find(s => s.id === pickedLibraryId)
  const canContinue =
    origin === 'blank'
      ? true
      : origin === 'template'
        ? Boolean(pickedTemplate && pickedTemplate.questionCount > 0)
        : Boolean(pickedLibrary && !branchRestricted)

  const continueFromChoice = async () => {
    if (origin === 'blank') {
      enterDetails({ kind: 'blank' })
      return
    }
    if (origin === 'template') {
      if (!pickedTemplate) return
      enterDetails({
        kind: 'template',
        template: {
          id: pickedTemplate.id,
          title: pickedTemplate.title,
          targetKind: pickedTemplate.targetKind,
          isAnonymous: pickedTemplate.isAnonymous,
          locationIds: pickedTemplate.locationIds,
          roleIds: pickedTemplate.roleIds,
          description: pickedTemplate.description,
          questionCount: pickedTemplate.questionCount,
          librarySourceId: pickedTemplate.librarySourceId ?? null,
          libraryReference: pickedTemplate.libraryReference ?? null,
          allowAnonymousResponses: pickedTemplate.allowAnonymousResponses ?? false,
        },
      })
      return
    }
    if (!pickedLibrary || branchRestricted) return
    if (pickedLibrary.adoptedTemplateId) {
      enterDetails({ kind: 'template', template: fromLibrary(pickedLibrary, pickedLibrary.adoptedTemplateId) })
      return
    }
    // Not adopted yet: add it to the organisation's templates, then carry on from that template.
    setContinuing(true)
    try {
      const result = await adopt.mutateAsync([pickedLibrary.id])
      let templateId =
        result.created.find(c => c.libraryId === pickedLibrary.id)?.templateId ??
        result.skipped.find(s => s.libraryId === pickedLibrary.id)?.templateId ??
        null
      if (!templateId) {
        // Adopted meanwhile (e.g. by someone else): use the existing template.
        const fresh = await fetchLibrarySurveys()
        templateId = fresh.find(s => s.id === pickedLibrary.id)?.adoptedTemplateId ?? null
      }
      if (!templateId) {
        const reason = result.skipped.find(s => s.libraryId === pickedLibrary.id)?.reason
        toastError('Could not use this survey', reason ?? 'It could not be added to your templates.')
        return
      }
      enterDetails({ kind: 'template', template: fromLibrary(pickedLibrary, templateId), justAdopted: true })
    } catch (e) {
      toastApiError(e, 'Could not add the ready-made survey to your templates')
    } finally {
      setContinuing(false)
    }
  }

  const goBack = () => {
    if (chosen?.kind === 'template') {
      setOrigin('template')
      setPickedTemplateId(chosen.template.id)
    } else if (chosen?.kind === 'blank') {
      setOrigin('blank')
    }
    setChosen(null)
  }

  const handleCreate = async () => {
    const name = shownTitle.trim()
    if (!chosen || !name || scheduleInvalid) return
    const locationIds = forPublic ? [] : audience.locationIds
    const roleIds = targetKind === 'EMPLOYEE' ? audience.roleIds : []
    try {
      if (chosen.kind === 'blank') {
        const survey = await createMut.mutateAsync({
          title: name,
          description: description.trim() || undefined,
          targetKind,
          isAnonymous,
          allowAnonymousResponses: allowsWithoutName,
          opensAt: asTemplate ? undefined : surveyLocalToIso(opensAt),
          closesAt: asTemplate ? undefined : surveyLocalToIso(closesAt),
          locationIds: locationIds.length > 0 ? locationIds : undefined,
          roleIds: roleIds.length > 0 ? roleIds : undefined,
          isTemplate: asTemplate || undefined,
          ...groupInput,
        })
        toastSuccess(asTemplate ? 'Template created — add its questions' : 'Survey created — add its questions')
        onClose()
        void navigate({ to: '/surveys/$surveyId', params: { surveyId: survey.id } })
        return
      }
      const from = chosen.kind === 'template' ? chosen.template : chosen.survey
      const copy = await duplicateMut.mutateAsync({
        id: from.id,
        overrides: {
          title: name,
          targetKind: chosen.kind === 'template' ? from.targetKind : targetKind,
          isAnonymous: anonymityLocked ? from.isAnonymous || variantChosen : isAnonymous,
          allowAnonymousResponses: allowsWithoutName,
          locationIds,
          roleIds,
          opensAt: surveyLocalToIso(opensAt),
          closesAt: surveyLocalToIso(closesAt),
          ...groupInput,
        },
      })
      toastSuccess(chosen.kind === 'template' ? 'Survey created from template — check it, then send it' : 'Survey duplicated — edit the copy')
      onClose()
      void navigate({ to: '/surveys/$surveyId', params: { surveyId: copy.id } })
    } catch (e) {
      toastApiError(
        e,
        chosen.kind === 'blank'
          ? 'Could not create survey'
          : chosen.kind === 'template'
            ? 'Could not create from template'
            : 'Could not duplicate survey',
      )
    }
  }

  // ─── Step 1: Start from ───────────────────────────────────────────────────
  if (step === 'choose') {
    const tq = templateSearch.trim().toLowerCase()
    const visibleTemplates = templates.filter(t =>
      matches(tq, t.title, t.description, SURVEY_TARGET_KIND_LABELS[t.targetKind], t.libraryReference),
    )
    const lq = librarySearch.trim().toLowerCase()
    const visibleLibrary = librarySurveys.filter(s => matches(lq, s.title, s.reference, s.summary, s.respondents))
    const groups = [...new Map(visibleLibrary.map(s => [s.group.code, s.group] as const)).values()].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    )

    return (
      <>
        <DialogHeader>
          <DialogTitle>New survey</DialogTitle>
          <DialogDescription>Step 1 of 2 · Choose what to start from</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div role="radiogroup" aria-label="Start from" className="grid gap-2 sm:grid-cols-3">
            <ChoiceCard
              icon={FilePlus2}
              title="Blank survey"
              text="Start empty and write your own questions."
              selected={origin === 'blank'}
              onSelect={() => setOrigin('blank')}
            />
            <ChoiceCard
              icon={LayoutTemplate}
              title="One of your templates"
              text={
                templatesQuery.isLoading
                  ? 'Your organisation’s templates.'
                  : `${templates.length} template${templates.length === 1 ? '' : 's'} in your organisation.`
              }
              selected={origin === 'template'}
              onSelect={() => setOrigin('template')}
            />
            <ChoiceCard
              icon={BookCopy}
              title="Ready-made library"
              text={branchRestricted ? BRANCH_RESTRICTED_LIBRARY : 'Surveys written for CQC-registered home care.'}
              selected={origin === 'library'}
              disabled={branchRestricted}
              onSelect={() => setOrigin('library')}
            />
          </div>

          {origin === 'blank' ? (
            <p className="text-xs text-muted-foreground">
              Next you name it and choose who it is for, then add your questions. You can make it a reusable template
              instead.
            </p>
          ) : null}

          {origin === 'template' ? (
            <div className="space-y-2">
              <SearchBox value={templateSearch} onChange={setTemplateSearch} label="Search your templates" />
              {templatesQuery.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : templatesQuery.isError ? (
                <p className="text-sm text-destructive">Your templates could not be loaded.</p>
              ) : !templates.length ? (
                <p className="text-sm text-muted-foreground">
                  No templates yet. Start from a blank survey or the ready-made library — or save a survey as a
                  template.
                </p>
              ) : !visibleTemplates.length ? (
                <p className="text-sm text-muted-foreground">No templates match your search.</p>
              ) : (
                <ul
                  role="radiogroup"
                  aria-label="Your templates"
                  className="max-h-[42vh] divide-y divide-border overflow-y-auto rounded-lg border border-border"
                >
                  {visibleTemplates.map(t => {
                    const empty = t.questionCount === 0
                    return (
                      <PickRow
                        key={t.id}
                        name="new-survey-template"
                        title={t.title}
                        selected={pickedTemplateId === t.id}
                        disabled={empty}
                        onSelect={() => setPickedTemplateId(t.id)}
                        action={
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 px-2 text-xs"
                            aria-label={`Preview ${t.title}`}
                            onClick={() => setPreviewId(t.id)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
                          </Button>
                        }
                      >
                        <span>For: {SURVEY_TARGET_KIND_LABELS[t.targetKind]}</span>
                        <span>{empty ? 'No questions yet' : questionsText(t.questionCount)}</span>
                        <span>{responsesLabel({ anonymous: t.isAnonymous, audience: t.targetKind })}</span>
                        {t.libraryReference ? <span>Ready-made {t.libraryReference}</span> : null}
                        {t.readOnly ? (
                          <Badge variant="muted" size="sm" className="gap-1">
                            <Lock className="h-3 w-3" aria-hidden /> Shared
                          </Badge>
                        ) : null}
                      </PickRow>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {origin === 'library' && !branchRestricted ? (
            <div className="space-y-2">
              <SearchBox value={librarySearch} onChange={setLibrarySearch} label="Search ready-made surveys" />
              {library.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : library.isError ? (
                <p className="text-sm text-destructive">The ready-made surveys could not be loaded.</p>
              ) : !visibleLibrary.length ? (
                <p className="text-sm text-muted-foreground">
                  {librarySurveys.length ? 'No ready-made surveys match your search.' : 'No ready-made surveys are available yet.'}
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Ready-made surveys"
                  className="max-h-[42vh] space-y-3 overflow-y-auto"
                >
                  {groups.map(g => (
                    <section key={g.code} className="space-y-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.name}</h3>
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {visibleLibrary
                          .filter(s => s.group.code === g.code)
                          .map(s => (
                            <PickRow
                              key={s.id}
                              name="new-survey-library"
                              title={s.title}
                              selected={pickedLibraryId === s.id}
                              onSelect={() => setPickedLibraryId(s.id)}
                              action={
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 gap-1 px-2 text-xs"
                                  aria-label={`Read ${s.title}`}
                                  onClick={() => setReadLibraryId(s.id)}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden /> Read
                                </Button>
                              }
                            >
                              <span>For: {LIBRARY_AUDIENCE_LABELS[s.audience]}</span>
                              <span>{shortTiming(s.timing)}</span>
                              <span>{questionsText(s.questionCount)}</span>
                              <span>{responsesLabel(s)}</span>
                              {s.adoptedTemplateId ? (
                                <Badge variant="success" size="sm" className="gap-1">
                                  <Check className="h-3 w-3" aria-hidden /> In your templates
                                </Badge>
                              ) : null}
                            </PickRow>
                          ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
              {pickedLibrary && !pickedLibrary.adoptedTemplateId ? (
                <p className="text-xs text-muted-foreground" data-testid="new-survey-adopt-note">
                  “{pickedLibrary.title}” will be added to your Templates (with your organisation’s name), and the new
                  survey started from it.
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canContinue || continuing} onClick={() => void continueFromChoice()}>
            {continuing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            {continuing ? 'Adding to your templates…' : 'Next'}
          </Button>
        </DialogFooter>

        <SurveyPreviewDialog surveyId={previewId} open={previewId != null} onOpenChange={o => !o && setPreviewId(null)} />
        <Dialog open={readLibraryId != null} onOpenChange={o => (o ? null : setReadLibraryId(null))}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{libraryRead.data?.title ?? 'Survey'}</DialogTitle>
              <DialogDescription>
                {libraryRead.data
                  ? `${libraryRead.data.reference} · ${libraryRead.data.group.name} · revision ${libraryRead.data.revision}`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto" data-testid="ready-made-survey-detail">
              <LibrarySurveyDetail survey={libraryRead.data} isLoading={libraryRead.isLoading} isError={libraryRead.isError} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReadLibraryId(null)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPickedLibraryId(readLibraryId)
                  setReadLibraryId(null)
                }}
              >
                Choose this survey
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ─── Step 2: Details ──────────────────────────────────────────────────────
  const isDuplicate = chosen?.kind === 'duplicate'
  // The template's own questions once loaded (an adopted template can be on an older library revision).
  const questionCount = sourceDetail?.questions?.length ?? source?.questionCount
  const sourceDescription = source ? (sourceDetail?.description ?? source.description ?? null) : null
  const timingHint = sourceLibrary ? recommendedTiming(sourceLibrary.timing) : null
  const targetLabel = SURVEY_TARGET_KIND_LABELS[targetKind]

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isDuplicate ? 'Duplicate survey' : asTemplate ? 'New template' : 'New survey'}</DialogTitle>
        <DialogDescription>{isDuplicate ? 'Name and audience for the copy' : 'Step 2 of 2 · Details'}</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        {source ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm" data-testid="new-survey-source">
            <p className="font-medium">
              {isDuplicate ? 'Copy of' : sourceLibraryId ? 'From the ready-made survey' : 'From template'}: {source.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {questionCount != null ? `${questionsText(questionCount)}, with their` : 'The questions, with their'}{' '}
              section headings and settings, are copied into a new draft.{' '}
              {isDuplicate
                ? 'Schedules and answers are not copied.'
                : 'The template itself stays unchanged.'}
              {chosen?.kind === 'template' && chosen.justAdopted ? ' It has been added to your Templates.' : ''}
            </p>
          </div>
        ) : null}

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name *</span>
          <Input
            value={shownTitle}
            onChange={e => {
              setTitle(e.target.value)
              setTitleEdited(true)
            }}
            placeholder={asTemplate ? 'e.g. Staff satisfaction' : 'e.g. Staff satisfaction Q3'}
            aria-label="Name"
          />
        </label>

        <div className="space-y-1 text-sm">
          <span className="font-medium">Who is it for? *</span>
          {targetLocked ? (
            <>
              <p
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                data-testid="new-survey-target-fixed"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {targetLabel}
              </p>
              <span className="block text-xs text-muted-foreground">
                Set by the template — its questions are written for {targetLabel.toLowerCase()}.
              </span>
            </>
          ) : (
            <>
              <Select value={targetKind} onValueChange={v => setTargetKind(v as SurveyTargetKind)}>
                <SelectTrigger className="w-full" aria-label="Who is it for">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">{SURVEY_TARGET_KIND_LABELS.EMPLOYEE}</SelectItem>
                  <SelectItem value="SERVICE_USER">{SURVEY_TARGET_KIND_LABELS.SERVICE_USER}</SelectItem>
                  <SelectItem value="PUBLIC">{SURVEY_TARGET_KIND_LABELS.PUBLIC}</SelectItem>
                </SelectContent>
              </Select>
              <span className="block text-xs text-muted-foreground">{TARGET_HELP[targetKind]}</span>
            </>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="new-survey-group">
            Who it's for
          </label>
          <select
            id="new-survey-group"
            className="block w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
            value={audienceGroup}
            onChange={e => setAudienceGroup(e.target.value)}
            aria-describedby="new-survey-group-hint"
          >
            <option value="">Choose…</option>
            {groupOptions.map(g => (
              <option key={g.code} value={g.code}>
                {g.label}
              </option>
            ))}
          </select>
          {audienceGroup === 'OTHER' ? (
            <input
              aria-label="Who it's for, in your words"
              className="mt-1 block w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
              value={audienceGroupOther}
              maxLength={80}
              onChange={e => setAudienceGroupOther(e.target.value)}
              placeholder="For example: local GP practices"
            />
          ) : null}
          <span id="new-survey-group-hint" className="block text-xs text-muted-foreground">
            {audienceGroup === 'SEVERAL'
              ? 'The survey starts with “Who are you?”, so Results can be shown for each group.'
              : 'Shown in the survey list, Results, the CSV and CQC evidence.'}
          </span>
        </div>

        <SurveyAudienceFields targetKind={targetKind} value={audience} onChange={setAudience} />

        {source ? (
          sourceDescription ? (
            <div className="space-y-1 text-sm">
              <span className="font-medium">Description</span>
              <p
                className="max-h-28 overflow-y-auto whitespace-pre-line rounded-md border border-border bg-muted/20 px-3 py-2 text-muted-foreground"
                data-testid="new-survey-description-preview"
              >
                {sourceDescription}
              </p>
              <span className="block text-xs text-muted-foreground">Copied as it is — change it in the survey if you need to.</span>
            </div>
          ) : null
        ) : (
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className={textareaClass}
              placeholder="Optional context shown to recipients"
            />
          </label>
        )}

        {anonymousVariant ? (
          <fieldset className="space-y-2 rounded-md border p-3" data-testid="new-survey-version">
            <legend className="px-1 text-sm font-medium">Which version of this ready-made survey?</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="new-survey-version"
                value="NAMED"
                checked={version === 'NAMED'}
                onChange={() => setVersion('NAMED')}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="font-medium">Named</span> — you know who answered, so you can follow up with them
                (including anyone who asks to be contacted).
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="new-survey-version"
                value="ANONYMOUS"
                checked={version === 'ANONYMOUS'}
                onChange={() => setVersion('ANONYMOUS')}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="font-medium">Anonymous</span> — answers are never linked to anyone. It has its own
                introduction and privacy notice
                {anonymousVariant.questionsLeftOut.length
                  ? ` and leaves out ${anonymousVariant.questionsLeftOut.length} question${anonymousVariant.questionsLeftOut.length === 1 ? '' : 's'} that need a name`
                  : ''}
                .
              </span>
            </label>
            {variantChosen ? (
              <div className="space-y-1 pl-6 text-xs text-muted-foreground" data-testid="new-survey-version-anonymous">
                <p>People will read: {anonymousVariant.introduction}</p>
                {anonymousVariant.questionsLeftOut.length ? (
                  <p>Left out: {anonymousVariant.questionsLeftOut.join('; ')}</p>
                ) : null}
                {anonymousVariant.alertsLeftOut.length ? (
                  <p>Alerts left out: {anonymousVariant.alertsLeftOut.join('; ')}</p>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">The version cannot be changed once the survey is created.</p>
          </fieldset>
        ) : null}

        <div className="space-y-1" hidden={Boolean(anonymousVariant)}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymityLocked && source ? source.isAnonymous : isAnonymous}
              disabled={anonymityLocked}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Anonymous responses — answers are never linked to who gave them (fixed once sent)
          </label>
          {anonymityLocked && source ? (
            <p className="pl-6 text-xs text-muted-foreground" data-testid="new-survey-anonymity-reason">
              Set by the ready-made survey — its introduction and privacy notice are written for{' '}
              {source.isAnonymous ? 'anonymous' : 'named, confidential'} answers.
            </p>
          ) : null}
        </div>

        {willBeAnonymous ? null : (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowsWithoutName}
                disabled={withoutNamePromised}
                onChange={e => setAllowWithoutName(e.target.checked)}
                className="h-4 w-4 rounded border-input"
                data-testid="new-survey-allow-without-name"
              />
              Let people choose to answer without their name
            </label>
            <p className="pl-6 text-xs text-muted-foreground" data-testid="new-survey-allow-without-name-help">
              {withoutNamePromised
                ? `Set by the ready-made survey${source?.libraryReference ? ` ${source.libraryReference}` : ''} — its privacy notice tells people they can answer without their name.`
                : WITHOUT_NAME_SETTING_HELP}
            </p>
          </div>
        )}

        {timingHint ? (
          <div
            className="flex gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/40"
            data-testid="new-survey-recommended-timing"
          >
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{timingHint}</p>
              <p className="text-xs text-muted-foreground">
                {asSentence(sourceLibrary?.timing.when)} Nothing is sent or scheduled now — when you are ready, use Send or schedule
                in the survey to send it or make it repeat.
              </p>
            </div>
          </div>
        ) : null}

        {chosen?.kind === 'blank' ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={asTemplate}
              onChange={e => setAsTemplate(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              Make this a template instead
              <span className="block text-xs text-muted-foreground">
                A reusable starting point shown under Templates. Templates are never sent — you create surveys from
                them.
              </span>
            </span>
          </label>
        ) : null}

        {asTemplate ? null : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <span className="block font-medium">Start</span>
                <SurveyDateTimeField label="Start" value={opensAt} onChange={setOpensAt} />
              </div>
              <div className="space-y-1 text-sm">
                <span className="block font-medium">End</span>
                <SurveyDateTimeField
                  label="End"
                  value={closesAt}
                  min={opensAt || undefined}
                  defaultTime="17:00"
                  onChange={setClosesAt}
                />
              </div>
            </div>
            {scheduleInvalid ? <p className="text-xs text-destructive">End must be after the start.</p> : null}
            <p className="text-xs text-muted-foreground">
              Times are UK (organisation) time. Next you {source ? 'check' : 'add'} the questions; then send it now,
              schedule it, or make it repeat (e.g. monthly) from Send or schedule.
            </p>
          </>
        )}
      </DialogBody>
      <DialogFooter className="flex-wrap">
        {canGoBack ? (
          <Button type="button" variant="ghost" className="mr-auto" onClick={goBack} disabled={pending}>
            Back
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={!shownTitle.trim() || scheduleInvalid || pending} onClick={() => void handleCreate()}>
          {pending
            ? 'Creating…'
            : isDuplicate
              ? 'Duplicate & edit'
              : asTemplate
                ? 'Create template'
                : source
                  ? 'Create survey'
                  : 'Create & add questions'}
        </Button>
      </DialogFooter>
    </>
  )
}

/** One way to start: a native radio button drawn as a card (name = title, description = text). */
function ChoiceCard({
  icon: Icon,
  title,
  text,
  selected,
  disabled,
  onSelect,
}: {
  icon: LucideIcon
  title: string
  text: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  const id = React.useId()
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/40',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
      )}
    >
      <input
        type="radio"
        name="new-survey-origin"
        className="sr-only"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
      />
      <span id={`${id}-title`} className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {title}
      </span>
      <span id={`${id}-text`} className="text-xs text-muted-foreground">
        {text}
      </span>
    </label>
  )
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
      <Input className="pl-8" placeholder={`${label}…`} value={value} onChange={e => onChange(e.target.value)} aria-label={label} />
    </div>
  )
}

/** One template or ready-made survey to pick: a native radio button with its details as its description. */
function PickRow({
  name,
  title,
  selected,
  disabled,
  onSelect,
  action,
  children,
}: {
  name: string
  title: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  action: React.ReactNode
  children: React.ReactNode
}) {
  const id = React.useId()
  return (
    <li className={cn('flex items-start gap-2 px-3 py-2.5', selected && 'bg-primary/5')}>
      <label
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded text-left',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          type="radio"
          name={name}
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-details`}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary focus-visible:outline-none"
        />
        <span className="min-w-0">
          <span id={`${id}-title`} className="block text-sm font-medium text-foreground">
            {title}
          </span>
          <span id={`${id}-details`} className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {children}
          </span>
        </span>
      </label>
      <div className="shrink-0">{action}</div>
    </li>
  )
}

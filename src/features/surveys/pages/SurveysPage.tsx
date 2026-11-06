import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import {
  BarChart3,
  BellRing, BookCopy,
  BookmarkMinus,
  BookmarkPlus,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  EyeOff,
  Eye,
  FileEdit,
  FilePlus2,
  Globe,
  HeartHandshake,
  LayoutTemplate,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  TriangleAlert,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
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
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useDeleteSurvey,
  useMoveTemplateToSurveys,
  useSaveSurveyAsTemplate,
  useSurveys,
} from '@/features/surveys/hooks/useSurveys'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import { SurveyCompletionProgress } from '@/features/surveys/components/SurveyCompletionProgress'
import {
  NewSurveyDialog,
  type NewSurveySource,
  type NewSurveyStart,
} from '@/features/surveys/components/NewSurveyDialog'
import { describeSurveyAudience, useSurveyAudienceLookups } from '@/features/surveys/components/SurveyAudienceFields'
import { ALL_AUDIENCE_GROUPS } from '@/features/surveys/survey-audience-groups'
import type { SurveyListItem, SurveyStatus, SurveyTargetKind } from '@/features/surveys/types'
import { SURVEY_RECURRENCE_LABELS, SURVEY_STATUS_LABELS, SURVEY_TARGET_KIND_LABELS } from '@/features/surveys/types'
import { formatSurveyDate, formatSurveyDateTime, surveyEndLabel } from '@/features/surveys/survey-datetime'
import { cn } from '@/shared/lib/utils'

const STATUS_BADGE: Record<SurveyStatus, { variant: 'muted' | 'success' | 'warning'; icon: LucideIcon }> = {
  DRAFT: { variant: 'muted', icon: FileEdit },
  ACTIVE: { variant: 'success', icon: CheckCircle2 },
  CLOSED: { variant: 'warning', icon: Lock },
}

/** Audience icon + chip tone for the Audience column. */
const AUDIENCE_META: Record<SurveyTargetKind, { icon: LucideIcon; className: string }> = {
  EMPLOYEE: { icon: Users, className: 'bg-teal-600/10 text-teal-700 dark:text-teal-300' },
  SERVICE_USER: {
    icon: HeartHandshake,
    className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  PUBLIC: { icon: Globe, className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
}

function AudienceChip({ targetKind }: { targetKind: SurveyTargetKind }) {
  const meta = AUDIENCE_META[targetKind]
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-2 font-medium text-foreground">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', meta.className)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {SURVEY_TARGET_KIND_LABELS[targetKind]}
    </span>
  )
}

function StatusBadge({ status }: { status: SurveyStatus }) {
  const cfg = STATUS_BADGE[status]
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      {SURVEY_STATUS_LABELS[status]}
    </Badge>
  )
}

const sourceOf = (s: SurveyListItem): NewSurveySource => ({
  id: s.id,
  title: s.title,
  targetKind: s.targetKind,
  isAnonymous: s.isAnonymous,
  locationIds: s.locationIds,
  roleIds: s.roleIds,
  description: s.description,
  questionCount: s.questionCount,
  librarySourceId: s.librarySourceId ?? null,
  libraryReference: s.libraryReference ?? null,
})

export default function SurveysPage() {
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { view?: string }
  const [view, setView] = React.useState<'surveys' | 'templates'>(search.view === 'templates' ? 'templates' : 'surveys')
  const isTemplatesView = view === 'templates'
  const { data: allSurveys = [], isLoading, isError } = useSurveys({ isTemplate: isTemplatesView })
  // Who it's for: filter the list by group.
  const [groupFilter, setGroupFilter] = React.useState('')
  const surveys = React.useMemo(
    () => (groupFilter ? allSurveys.filter(s => s.audienceGroup === groupFilter) : allSurveys),
    [allSurveys, groupFilter],
  )
  const deleteMut = useDeleteSurvey()
  const saveAsTemplateMut = useSaveSurveyAsTemplate()
  const moveToSurveysMut = useMoveTemplateToSurveys()
  // Branch names only (service-user lookups load just the location tree).
  const { lookups } = useSurveyAudienceLookups('SERVICE_USER', true, false)

  // Period copies of a repeating survey are grouped under it rather than listed separately.
  const { topLevel, periodsBySource } = React.useMemo(() => {
    const ids = new Set(surveys.map(s => s.id))
    const periods = new Map<string, SurveyListItem[]>()
    const top: SurveyListItem[] = []
    for (const s of surveys) {
      if (s.clonedFromId && ids.has(s.clonedFromId)) {
        const list = periods.get(s.clonedFromId) ?? []
        list.push(s)
        periods.set(s.clonedFromId, list)
      } else {
        top.push(s)
      }
    }
    for (const list of periods.values()) {
      list.sort((a, b) => (b.opensAt ?? b.createdAt).localeCompare(a.opensAt ?? a.createdAt))
    }
    return { topLevel: top, periodsBySource: periods }
  }, [surveys])
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const statusCounts = React.useMemo(() => {
    let draft = 0
    let active = 0
    let closed = 0
    for (const s of surveys) {
      if (s.status === 'DRAFT') draft += 1
      else if (s.status === 'ACTIVE') active += 1
      else if (s.status === 'CLOSED') closed += 1
    }
    return { total: surveys.length, draft, active, closed }
  }, [surveys])

  const [toDelete, setToDelete] = React.useState<SurveyListItem | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  // The one New survey dialog: start from blank / a template / the ready-made library, or duplicate.
  const [newSurvey, setNewSurvey] = React.useState<NewSurveyStart | null>(null)
  const openNew = () => setNewSurvey(isTemplatesView ? { kind: 'blank', asTemplate: true } : { kind: 'choose' })

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMut.mutateAsync(toDelete.id)
      toastSuccess(toDelete.isTemplate ? 'Template deleted' : 'Survey deleted')
      setToDelete(null)
    } catch (e) {
      toastApiError(e, 'Could not delete')
    }
  }

  const handleSaveAsTemplate = async (s: SurveyListItem) => {
    try {
      const res = await saveAsTemplateMut.mutateAsync(s.id)
      toastSuccess(
        res.mode === 'copied'
          ? 'Template copy saved under Templates — the survey itself is unchanged'
          : 'Moved to Templates',
      )
    } catch (e) {
      toastApiError(e, 'Could not save as template')
    }
  }

  const handleMoveToSurveys = async (s: SurveyListItem) => {
    try {
      await moveToSurveysMut.mutateAsync(s.id)
      toastSuccess('Moved back to surveys as a draft')
    } catch (e) {
      toastApiError(e, 'Could not move template')
    }
  }

  const branchLabel = (s: SurveyListItem) => {
    if (s.targetKind === 'PUBLIC') return <span className="text-xs italic">—</span>
    if (!s.locationIds?.length) return <span className="text-xs italic">All</span>
    const text = describeSurveyAudience('SERVICE_USER', { locationIds: s.locationIds, roleIds: [], employeeIds: [] }, lookups)
    return (
      <span className="block max-w-[200px] truncate" title={text}>
        {text}
      </span>
    )
  }

  const surveyRow = (s: SurveyListItem, opts: { isPeriod?: boolean } = {}) => {
    const periods = periodsBySource.get(s.id) ?? []
    const isOpen = expanded.has(s.id)
    const pendingSchedule = s.distributeAt && !s.distributedAt
    return (
      <tr
        key={s.id}
        className={cn('border-b border-border/70 last:border-0 hover:bg-muted/20', opts.isPeriod && 'bg-muted/10')}
      >
        <td className={cn('min-w-[180px] px-3 py-3', opts.isPeriod && 'pl-10')}>
          <div className="flex items-start gap-1.5">
            {periods.length > 0 ? (
              <button
                type="button"
                className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label={isOpen ? `Hide periods of ${s.title}` : `Show periods of ${s.title}`}
                aria-expanded={isOpen}
                onClick={() => toggleExpanded(s.id)}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : null}
            <div className="min-w-0">
              <Link
                to="/surveys/$surveyId"
                params={{ surveyId: s.id }}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {s.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {s.isAnonymous ? (
                  <Badge variant="muted" size="sm" className="gap-1">
                    <EyeOff className="h-3 w-3" aria-hidden /> Anonymous
                  </Badge>
                ) : null}
                {s.distributionFailedAt ? (
                  <Badge variant="destructive" size="sm" className="gap-1">
                    <TriangleAlert className="h-3 w-3" aria-hidden /> Scheduled send failed
                  </Badge>
                ) : pendingSchedule ? (
                  <Badge variant="info" size="sm" className="gap-1">
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {s.recurrence
                      ? `${SURVEY_RECURRENCE_LABELS[s.recurrence]} · next ${formatSurveyDateTime(s.distributeAt)}`
                      : `Scheduled ${formatSurveyDateTime(s.distributeAt)}`}
                  </Badge>
                ) : null}
                {periods.length > 0 || (s.recurrence && !pendingSchedule) ? (
                  <Badge variant="muted" size="sm" className="gap-1">
                    <Repeat className="h-3 w-3" aria-hidden />
                    Repeating · {periods.length} period{periods.length === 1 ? '' : 's'}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <StatusBadge status={s.status} />
        </td>
        <td className="whitespace-nowrap px-3 py-3">
          <AudienceChip targetKind={s.targetKind} />
          {s.audienceGroupLabel ? <span className="mt-0.5 block text-xs text-muted-foreground">{s.audienceGroupLabel}</span> : null}
        </td>
        <td className="px-3 py-3 text-muted-foreground">{branchLabel(s)}</td>
        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground tabular-nums">
          {s.opensAt ? formatSurveyDateTime(s.opensAt) : '—'}
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground tabular-nums">
          {s.closesAt ? (s.status === 'ACTIVE' ? surveyEndLabel(s) : formatSurveyDateTime(s.closesAt)) : 'No end'}
          {s.status === 'CLOSED' && s.closedAtEndDate ? (
            <span className="block text-xs" data-testid="survey-closed-at-end-date">
              Closed at its end date
            </span>
          ) : null}
        </td>
        <td className="px-3 py-3 text-right tabular-nums">{s.questionCount}</td>
        <td className="px-3 py-3">
          {s.countsRestricted || s.responseCount === null ? (
            <span className="text-xs text-muted-foreground" title="Only people who can see this survey’s results see how many answered">
              Restricted
            </span>
          ) : s.targetKind === 'PUBLIC' ? (
            <span className="text-xs text-muted-foreground">
              {s.responseCount} response{s.responseCount === 1 ? '' : 's'}
            </span>
          ) : s.recipientCount > 0 ? (
            <SurveyCompletionProgress compact completed={s.completedCount ?? 0} recipients={s.recipientCount} />
          ) : (
            <span className="text-xs text-muted-foreground">
              {(s.responseCount ?? 0) > 0 ? `${s.responseCount} recorded` : '—'}
            </span>
          )}
        </td>
        <td className="max-w-[140px] truncate px-3 py-3 text-muted-foreground" title={s.createdByName ?? undefined}>
          {s.createdByName ?? '—'}
        </td>
        <td className="px-3 py-3">
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label={`Preview ${s.title}`}
              title="Preview survey form"
              onClick={() => setPreviewId(s.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Link
                to="/surveys/$surveyId/responses"
                params={{ surveyId: s.id }}
                aria-label={`View results for ${s.title}`}
                title="Results"
              >
                <Users className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Link to="/surveys/$surveyId" params={{ surveyId: s.id }} aria-label={`Edit ${s.title}`} title="Edit survey">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            {canManage ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Duplicate ${s.title}`}
                  title="Duplicate survey"
                  onClick={() => setNewSurvey({ kind: 'duplicate', survey: sourceOf(s) })}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Save ${s.title} as template`}
                  title="Save as template (sent surveys stay as they are — a template copy is made)"
                  disabled={saveAsTemplateMut.isPending}
                  onClick={() => void handleSaveAsTemplate(s)}
                >
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  aria-label={`Delete ${s.title}`}
                  onClick={() => setToDelete(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        </td>
      </tr>
    )
  }

  const templateRow = (s: SurveyListItem) => (
    <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
      <td className="min-w-[200px] px-3 py-3">
        <Link
          to="/surveys/$surveyId"
          params={{ surveyId: s.id }}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {s.title}
        </Link>
        {s.description ? (
          <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted-foreground">{s.description}</p>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <AudienceChip targetKind={s.targetKind} />
        {s.audienceGroupLabel ? <span className="mt-0.5 block text-xs text-muted-foreground">{s.audienceGroupLabel}</span> : null}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{s.questionCount}</td>
      <td className="px-3 py-3 text-muted-foreground">{s.isAnonymous ? 'Anonymous' : 'Named'}</td>
      <td className="px-3 py-3 text-muted-foreground">{branchLabel(s)}</td>
      <td className="max-w-[140px] truncate px-3 py-3 text-muted-foreground" title={s.createdByName ?? undefined}>
        {s.createdByName ?? '—'}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground tabular-nums">{formatSurveyDate(s.updatedAt)}</td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={`Preview ${s.title}`}
            title="Preview survey form"
            onClick={() => setPreviewId(s.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Link
              to="/surveys/$surveyId"
              params={{ surveyId: s.id }}
              aria-label={s.readOnly ? `View ${s.title}` : `Edit ${s.title}`}
              title={s.readOnly ? 'View template (shared company template — read only)' : 'Edit template'}
            >
              {s.readOnly ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Link>
          </Button>
          {canManage ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 px-2.5 text-xs"
                aria-label={`Use template ${s.title}`}
                title="Start a new survey from this template"
                disabled={s.questionCount === 0}
                onClick={() => setNewSurvey({ kind: 'template', template: sourceOf(s) })}
              >
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
                Use
              </Button>
              {s.readOnly ? (
                <Badge variant="muted" size="sm" className="gap-1 self-center" title="Shared by every branch — only someone with access to all branches can change it">
                  <Lock className="h-3 w-3" aria-hidden /> Shared
                </Badge>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Move ${s.title} back to surveys`}
                    title="Move back to surveys as a draft"
                    disabled={moveToSurveysMut.isPending}
                    onClick={() => void handleMoveToSurveys(s)}
                  >
                    <BookmarkMinus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    aria-label={`Delete ${s.title}`}
                    onClick={() => setToDelete(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          ) : null}
        </div>
      </td>
    </tr>
  )

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 shadow-sm ring-1 ring-teal-600/20 dark:text-teal-300">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {isTemplatesView ? 'Templates' : 'Surveys'}
              </h1>
              {!isLoading && statusCounts.total > 0 ? (
                <Badge variant="muted" className="tabular-nums">
                  {statusCounts.total}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isTemplatesView
                ? 'Reusable starting points. A template is never sent — use it to create a survey, then send, schedule or repeat that survey.'
                : 'Feedback from staff, the people you support and the public. Repeating surveys show their periods underneath.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="survey-group-filter">
            Who it's for
          </label>
          <select
            id="survey-group-filter"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            data-testid="survey-group-filter"
          >
            <option value="">Everyone it's for</option>
            {ALL_AUDIENCE_GROUPS.map(g => (
              <option key={g.code} value={g.code}>
                {g.label}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to="/surveys/insight" data-testid="survey-insight-link">
              <BarChart3 className="h-4 w-4" aria-hidden />
              Insight
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to="/surveys/follow-ups" data-testid="survey-follow-ups-link">
              <BellRing className="h-4 w-4" aria-hidden />
              Follow-ups
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to="/surveys/ready-made" data-testid="ready-made-surveys-link">
              <BookCopy className="h-4 w-4" aria-hidden />
              Ready-made surveys
            </Link>
          </Button>
          {canManage ? (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/surveys/outside-people" data-testid="outside-people-link">
                <UsersRound className="h-4 w-4" aria-hidden />
                Outside people
              </Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 shadow-sm"
              onClick={openNew}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {isTemplatesView ? 'New template' : 'New survey'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Surveys / Templates tabs */}
      <div className="mt-5 flex w-fit gap-1 rounded-lg bg-muted/50 p-1 text-sm" role="tablist">
        {(
          [
            ['surveys', 'Surveys', ClipboardList],
            ['templates', 'Templates', LayoutTemplate],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
              view === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {!isTemplatesView ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Total',
              value: statusCounts.total,
              tone: 'text-foreground',
              icon: <ClipboardList className="h-5 w-5" aria-hidden />,
              iconClass: 'bg-teal-600/10 text-teal-700 dark:text-teal-300',
            },
            {
              label: 'Draft',
              value: statusCounts.draft,
              tone: 'text-muted-foreground',
              icon: <FileEdit className="h-5 w-5" aria-hidden />,
              iconClass: 'bg-muted text-muted-foreground',
            },
            {
              label: 'Open',
              value: statusCounts.active,
              tone: 'text-emerald-700 dark:text-emerald-300',
              icon: <CheckCircle2 className="h-5 w-5" aria-hidden />,
              iconClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
            },
            {
              label: 'Closed',
              value: statusCounts.closed,
              tone: 'text-amber-800 dark:text-amber-200',
              icon: <Lock className="h-5 w-5" aria-hidden />,
              iconClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
            },
          ].map(card => (
            <div
              key={card.label}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${card.tone}`}>{isLoading ? '—' : card.value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load {isTemplatesView ? 'templates' : 'surveys'}.</p>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-700 ring-1 ring-teal-600/20 dark:text-teal-300">
              {isTemplatesView ? <LayoutTemplate className="h-6 w-6" aria-hidden /> : <ClipboardList className="h-6 w-6" aria-hidden />}
            </div>
            <p className="text-sm font-medium text-foreground">{isTemplatesView ? 'No templates yet' : 'No surveys yet'}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {isTemplatesView
                ? 'Create a template, or save a survey as one — then use it to start new surveys.'
                : 'Create your first survey to gather feedback from staff, the people you support or the public.'}
            </p>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={openNew}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {isTemplatesView ? 'New template' : 'New survey'}
              </Button>
            ) : null}
          </div>
        ) : isTemplatesView ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm" data-testid="templates-table">
              <thead className="whitespace-nowrap border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Template</th>
                  <th className="px-3 py-2.5">For</th>
                  <th className="px-3 py-2.5 text-right">Questions</th>
                  <th className="px-3 py-2.5">Responses are</th>
                  <th className="px-3 py-2.5">Branches</th>
                  <th className="px-3 py-2.5">Created by</th>
                  <th className="px-3 py-2.5">Last updated</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>{surveys.map(templateRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] text-sm" data-testid="surveys-table">
              <thead className="whitespace-nowrap border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Audience</th>
                  <th className="px-3 py-2.5">Branches</th>
                  <th className="px-3 py-2.5">Start</th>
                  <th className="px-3 py-2.5">End</th>
                  <th className="px-3 py-2.5 text-right">Questions</th>
                  <th className="px-3 py-2.5">Progress</th>
                  <th className="px-3 py-2.5">Created by</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topLevel.flatMap(s => [
                  surveyRow(s),
                  ...(expanded.has(s.id) ? (periodsBySource.get(s.id) ?? []).map(p => surveyRow(p, { isPeriod: true })) : []),
                ])}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewSurveyDialog start={newSurvey} onClose={() => setNewSurvey(null)} />

      {/* Form-style preview */}
      <SurveyPreviewDialog surveyId={previewId} open={previewId != null} onOpenChange={o => !o && setPreviewId(null)} />

      {/* Delete confirm */}
      <AlertDialog open={toDelete != null} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.isTemplate
                ? 'This removes the template. Surveys already created from it are not affected.'
                : 'This removes the survey and its questions from the list. Recipients and responses are kept in the audit trail. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

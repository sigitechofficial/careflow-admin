import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  BookmarkMinus,
  BookmarkPlus,
  CalendarClock,
  CheckCircle2,
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
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateSurvey,
  useDeleteSurvey,
  useDuplicateSurvey,
  useSetSurveyTemplate,
  useSurveys,
} from '@/features/surveys/hooks/useSurveys'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import { SurveyCompletionProgress } from '@/features/surveys/components/SurveyCompletionProgress'
import type { SurveyListItem, SurveyRecurrence, SurveyStatus, SurveyTargetKind } from '@/features/surveys/types'
import { SURVEY_RECURRENCE_LABELS, SURVEY_TARGET_KIND_LABELS } from '@/features/surveys/types'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { combineOperationalDateAndHm, dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { cn } from '@/shared/lib/utils'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

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

export default function SurveysPage() {
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const navigate = useNavigate()
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const [view, setView] = React.useState<'surveys' | 'templates'>('surveys')
  const isTemplatesView = view === 'templates'
  const { data: surveys = [], isLoading, isError } = useSurveys({ isTemplate: isTemplatesView })
  const createMut = useCreateSurvey()
  const deleteMut = useDeleteSurvey()
  const duplicateMut = useDuplicateSurvey()
  const setTemplateMut = useSetSurveyTemplate()

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

  const { data: locationTree } = useLocationManagementTree()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createIsTemplate, setCreateIsTemplate] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [targetKind, setTargetKind] = React.useState<SurveyTargetKind>('EMPLOYEE')
  const [description, setDescription] = React.useState('')
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [selectedZoneId, setSelectedZoneId] = React.useState('')
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([])
  const [opensAt, setOpensAt] = React.useState('')
  const [closesAt, setClosesAt] = React.useState('')
  const [distributeAt, setDistributeAt] = React.useState('')
  const [recurrence, setRecurrence] = React.useState<SurveyRecurrence | ''>('')
  const [toDelete, setToDelete] = React.useState<SurveyListItem | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const [duplicateSource, setDuplicateSource] = React.useState<SurveyListItem | null>(null)
  const [dupTitle, setDupTitle] = React.useState('')
  const [dupTargetKind, setDupTargetKind] = React.useState<SurveyTargetKind>('EMPLOYEE')
  const [dupAnonymous, setDupAnonymous] = React.useState(false)
  const [dupRoleIds, setDupRoleIds] = React.useState<string[]>([])
  const [locationsView, setLocationsView] = React.useState<{
    surveyTitle: string
    names: string[]
  } | null>(null)

  const { data: employeeLookups } = useEmployeeLookups(
    (createOpen && targetKind === 'EMPLOYEE') ||
      (duplicateSource != null && dupTargetKind === 'EMPLOYEE'),
  )
  const roleOptions = React.useMemo<MultiSelectOption[]>(
    () => (employeeLookups?.roles ?? []).map(r => ({ value: r.id, label: r.name })),
    [employeeLookups],
  )

  const selectedZone = locationTree?.zones.find(z => z.id === selectedZoneId)
  const branchOptions = React.useMemo<MultiSelectOption[]>(
    () =>
      selectedZone?.branches
        .filter((b): b is typeof b & { locationId: string } => b.locationId != null)
        .map(b => ({ value: b.locationId, label: b.name })) ?? [],
    [selectedZone],
  )

  const resolveLocationNames = React.useCallback(
    (locIds: string[]) => {
      const parts: string[] = []
      if (!locationTree || locIds.length === 0) return parts
      for (const zone of locationTree.zones) {
        const matched = zone.branches.filter(b => b.locationId != null && locIds.includes(b.locationId))
        if (matched.length === 0) continue
        if (matched.length === zone.branches.length) {
          parts.push(zone.name)
        } else {
          parts.push(...matched.map(b => b.name))
        }
      }
      return parts
    },
    [locationTree],
  )

  const resetCreate = () => {
    setTitle('')
    setTargetKind('EMPLOYEE')
    setCreateIsTemplate(false)
    setDescription('')
    setIsAnonymous(false)
    setSelectedZoneId('')
    setSelectedLocationIds([])
    setSelectedRoleIds([])
    setOpensAt('')
    setClosesAt('')
    setDistributeAt('')
    setRecurrence('')
  }

  const scheduleInvalid = Boolean(opensAt && closesAt && closesAt <= opensAt)

  const handleCreate = async () => {
    if (!title.trim() || scheduleInvalid) return
    try {
      let locIds: string[] = []
      if (selectedLocationIds.length > 0) {
        locIds = selectedLocationIds
      } else if (selectedZone) {
        locIds = selectedZone.branches.map(b => b.locationId).filter((id): id is string => id != null)
      }
      const forPublic = targetKind === 'PUBLIC'
      const survey = await createMut.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        targetKind,
        isAnonymous,
        opensAt: opensAt ? combineOperationalDateAndHm(opensAt.slice(0, 10), opensAt.slice(11, 16)) : undefined,
        closesAt: closesAt ? combineOperationalDateAndHm(closesAt.slice(0, 10), closesAt.slice(11, 16)) : undefined,
        distributeAt:
          !forPublic && distributeAt
            ? combineOperationalDateAndHm(distributeAt.slice(0, 10), distributeAt.slice(11, 16))
            : undefined,
        recurrence: !forPublic && recurrence ? recurrence : undefined,
        locationIds: !forPublic && locIds.length > 0 ? locIds : undefined,
        roleIds:
          targetKind === 'EMPLOYEE' && selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
        isTemplate: createIsTemplate || undefined,
      })
      toastSuccess(createIsTemplate ? 'Template created' : 'Survey created')
      setCreateOpen(false)
      resetCreate()
      void navigate({ to: '/surveys/$surveyId', params: { surveyId: survey.id } })
    } catch (e) {
      toastApiError(e, 'Could not create survey')
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMut.mutateAsync(toDelete.id)
      toastSuccess('Survey deleted')
      setToDelete(null)
    } catch (e) {
      toastApiError(e, 'Could not delete survey')
    }
  }

  const openDuplicate = (s: SurveyListItem) => {
    setDuplicateSource(s)
    // From a template → start a fresh survey with the template's name; from a survey → append "(Copy)".
    setDupTitle(s.isTemplate ? s.title : `${s.title} (Copy)`)
    setDupTargetKind(s.targetKind)
    setDupAnonymous(s.isAnonymous)
    setDupRoleIds(s.roleIds ?? [])
  }

  const handleDuplicateConfirm = async () => {
    if (!duplicateSource || !dupTitle.trim()) return
    const fromTemplate = duplicateSource.isTemplate
    try {
      const copy = await duplicateMut.mutateAsync({
        id: duplicateSource.id,
        overrides: {
          title: dupTitle.trim(),
          targetKind: dupTargetKind,
          isAnonymous: dupAnonymous,
          roleIds:
            dupTargetKind === 'EMPLOYEE' && dupRoleIds.length > 0 ? dupRoleIds : undefined,
        },
      })
      toastSuccess(fromTemplate ? 'Survey created from template' : 'Survey duplicated — edit the copy')
      setDuplicateSource(null)
      void navigate({ to: '/surveys/$surveyId', params: { surveyId: copy.id } })
    } catch (e) {
      toastApiError(e, fromTemplate ? 'Could not create from template' : 'Could not duplicate survey')
    }
  }

  const handleSetTemplate = async (s: SurveyListItem, isTemplate: boolean) => {
    try {
      await setTemplateMut.mutateAsync({ id: s.id, isTemplate })
      toastSuccess(isTemplate ? 'Saved as template' : 'Moved back to surveys')
    } catch (e) {
      toastApiError(e, 'Could not update template')
    }
  }

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
                ? 'Reusable survey templates. Use a template to start a new editable survey.'
                : 'Create survey forms for employees, service users or the public. Responses feed quality assurance.'}
            </p>
          </div>
        </div>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            className="gap-1.5 shadow-sm"
            onClick={() => {
              setCreateIsTemplate(isTemplatesView)
              setCreateOpen(true)
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {isTemplatesView ? 'New template' : 'New survey'}
          </Button>
        ) : null}
      </div>

      {/* Surveys / Templates tabs */}
      <div className="mt-5 flex w-fit gap-1 rounded-lg bg-muted/50 p-1 text-sm">
        {(
          [
            ['surveys', 'Surveys', ClipboardList],
            ['templates', 'Templates', LayoutTemplate],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
              view === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

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
            label: 'Active',
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
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}
            >
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${card.tone}`}>
                {isLoading ? '—' : card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading surveys…
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load surveys.</p>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-700 ring-1 ring-teal-600/20 dark:text-teal-300">
              {isTemplatesView ? (
                <LayoutTemplate className="h-6 w-6" aria-hidden />
              ) : (
                <ClipboardList className="h-6 w-6" aria-hidden />
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {isTemplatesView ? 'No templates yet' : 'No surveys yet'}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {isTemplatesView
                ? 'Save a survey as a template, or create one here — then reuse it to start new surveys.'
                : 'Create your first survey to gather feedback from employees, service users or the public.'}
            </p>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => {
                  setCreateIsTemplate(isTemplatesView)
                  setCreateOpen(true)
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {isTemplatesView ? 'New template' : 'New survey'}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] text-sm">
              <thead className="whitespace-nowrap border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Audience</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Published</th>
                  <th className="px-3 py-2.5">Start</th>
                  <th className="px-3 py-2.5">End</th>
                  <th className="px-3 py-2.5 text-right">Questions</th>
                  <th className="px-3 py-2.5">Progress</th>
                  <th className="px-3 py-2.5 text-right">Recipients</th>
                  <th className="px-3 py-2.5">Created by</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map(s => (
                  <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                    <td className="min-w-[150px] px-3 py-3">
                      <Link
                        to="/surveys/$surveyId"
                        params={{ surveyId: s.id }}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {s.title}
                      </Link>
                      {s.isAnonymous || (s.distributeAt && !s.distributedAt) || (s.recurrence && !s.clonedFromId) ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {s.isAnonymous ? (
                            <Badge variant="muted" size="sm" className="gap-1">
                              <EyeOff className="h-3 w-3" aria-hidden /> Anonymous
                            </Badge>
                          ) : null}
                          {s.distributeAt && !s.distributedAt ? (
                            <Badge variant="info" size="sm" className="gap-1">
                              <CalendarClock className="h-3 w-3" aria-hidden />
                              {s.recurrence
                                ? `${SURVEY_RECURRENCE_LABELS[s.recurrence]} · next ${formatInstant(s.distributeAt)}`
                                : `Scheduled ${formatInstant(s.distributeAt)}`}
                            </Badge>
                          ) : s.recurrence && !s.clonedFromId ? (
                            <Badge variant="muted" size="sm" className="gap-1">
                              <Repeat className="h-3 w-3" aria-hidden />
                              Repeats {SURVEY_RECURRENCE_LABELS[s.recurrence].toLowerCase()}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const cfg = STATUS_BADGE[s.status]
                        const Icon = cfg.icon
                        return (
                          <Badge variant={cfg.variant} className="gap-1">
                            <Icon className="h-3 w-3" aria-hidden />
                            {s.status}
                          </Badge>
                        )
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {(() => {
                        const meta = AUDIENCE_META[s.targetKind]
                        const Icon = meta.icon
                        return (
                          <span className="inline-flex items-center gap-2 font-medium text-foreground">
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                                meta.className,
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            {SURVEY_TARGET_KIND_LABELS[s.targetKind]}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {(() => {
                        const names = resolveLocationNames(s.locationIds ?? [])
                        if (names.length === 0) return <span className="text-xs italic">All</span>
                        if (names.length === 1) {
                          return <span className="whitespace-nowrap">{names[0]}</span>
                        }
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="min-w-0 truncate" title={names[0]}>
                              {names[0]}
                            </span>
                            <Badge variant="muted" size="sm">
                              +{names.length - 1}
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 shrink-0 px-2 text-xs"
                              onClick={() =>
                                setLocationsView({ surveyTitle: s.title, names })
                              }
                            >
                              View
                            </Button>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground tabular-nums">
                      {s.publishedAt ? formatInstant(s.publishedAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground tabular-nums">
                      {s.opensAt ? formatInstant(s.opensAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground tabular-nums">
                      {s.closesAt ? formatInstant(s.closesAt) : 'No end'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.questionCount}</td>
                    <td className="px-3 py-3">
                      {s.recipientCount > 0 ? (
                        <SurveyCompletionProgress
                          compact
                          completed={s.completedCount ?? 0}
                          recipients={s.recipientCount}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.recipientCount}</td>
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
                        {!isTemplatesView ? (
                          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Link
                              to="/surveys/$surveyId/responses"
                              params={{ surveyId: s.id }}
                              aria-label={`View responses for ${s.title}`}
                              title="Response audience"
                            >
                              <Users className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Link
                            to="/surveys/$surveyId"
                            params={{ surveyId: s.id }}
                            aria-label={`Edit ${s.title}`}
                            title="Edit survey"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canManage ? (
                          <>
                            {isTemplatesView ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 px-2.5 text-xs"
                                  aria-label={`Use template ${s.title}`}
                                  title="Start a new survey from this template"
                                  onClick={() => openDuplicate(s)}
                                >
                                  <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
                                  Use
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  aria-label={`Remove ${s.title} from templates`}
                                  title="Move back to surveys"
                                  disabled={setTemplateMut.isPending}
                                  onClick={() => void handleSetTemplate(s, false)}
                                >
                                  <BookmarkMinus className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  aria-label={`Duplicate ${s.title}`}
                                  title="Duplicate survey"
                                  onClick={() => openDuplicate(s)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  aria-label={`Save ${s.title} as template`}
                                  title="Save as template"
                                  disabled={setTemplateMut.isPending}
                                  onClick={() => void handleSetTemplate(s, true)}
                                >
                                  <BookmarkPlus className="h-4 w-4" />
                                </Button>
                              </>
                            )}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={o => {
          setCreateOpen(o)
          if (!o) resetCreate()
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{createIsTemplate ? 'New template' : 'New survey'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Title *</span>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Staff satisfaction Q3" />
            </label>
            <div className="space-y-1 text-sm">
              <span className="font-medium">Audience *</span>
              <Select value={targetKind} onValueChange={v => setTargetKind(v as SurveyTargetKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">{SURVEY_TARGET_KIND_LABELS.EMPLOYEE}</SelectItem>
                  <SelectItem value="SERVICE_USER">{SURVEY_TARGET_KIND_LABELS.SERVICE_USER}</SelectItem>
                  <SelectItem value="PUBLIC">{SURVEY_TARGET_KIND_LABELS.PUBLIC}</SelectItem>
                </SelectContent>
              </Select>
              <span className="block text-xs text-muted-foreground">
                {targetKind === 'SERVICE_USER'
                  ? 'Answered in the Service User Portal by the service user, or by a family member or representative on their behalf. Only service users with a portal account receive it.'
                  : targetKind === 'PUBLIC'
                    ? 'Open survey answered through one shareable public link — anyone with the link can respond, no account needed. There is no recipient list.'
                    : 'Each employee receives a personal link by push notification and email. Optionally limit it to selected job roles.'}
              </span>
            </div>
            {targetKind === 'EMPLOYEE' && (
              <div className="space-y-1 text-sm">
                <span className="font-medium">Job roles</span>
                <MultiSelect
                  options={roleOptions}
                  value={selectedRoleIds}
                  onChange={setSelectedRoleIds}
                  placeholder="All job roles"
                  searchPlaceholder="Search roles…"
                />
                <span className="block text-xs text-muted-foreground">
                  Leave empty to send to all roles. Otherwise only employees in the selected roles
                  receive it.
                </span>
              </div>
            )}
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Description</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional context shown to recipients"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Anonymous responses (recommended for honest feedback)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createIsTemplate}
                onChange={e => setCreateIsTemplate(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Save as a reusable template (shown under Templates)
            </label>
            {targetKind !== 'PUBLIC' && (
              <>
                <div className="space-y-1 text-sm">
                  <span className="font-medium">Zone</span>
                  <Select
                    value={selectedZoneId}
                    onValueChange={v => {
                      setSelectedZoneId(v)
                      setSelectedLocationIds([])
                    }}
                  >
                    <SelectTrigger className="w-full">
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
                </div>
                {selectedZoneId && branchOptions.length > 0 && (
                  <div className="space-y-1 text-sm">
                    <span className="font-medium">Branch</span>
                    <MultiSelect
                      options={branchOptions}
                      value={selectedLocationIds}
                      onChange={setSelectedLocationIds}
                      placeholder="All branches in zone"
                    />
                  </div>
                )}
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Start</span>
                <Input type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">End</span>
                <Input
                  type="datetime-local"
                  value={closesAt}
                  min={opensAt || undefined}
                  onChange={e => setClosesAt(e.target.value)}
                />
              </label>
            </div>
            {scheduleInvalid ? (
              <p className="text-xs text-destructive">End must be after the start.</p>
            ) : null}
            {targetKind !== 'PUBLIC' && (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    Distribute to {SURVEY_TARGET_KIND_LABELS[targetKind].toLowerCase()} at
                  </span>
                  <Input
                    type="datetime-local"
                    value={distributeAt}
                    onChange={e => setDistributeAt(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">
                    Optional first run time. After you add questions, a new survey is created and sent
                    at this time (and again each period if you choose a repeat below).
                  </span>
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Repeat</span>
                  <Select
                    value={recurrence || 'none'}
                    onValueChange={v => setRecurrence(v === 'none' ? '' : (v as SurveyRecurrence))}
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
                  <span className="text-xs text-muted-foreground">
                    Monthly (and other periods) create a fresh survey each time from this template.
                  </span>
                </label>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || scheduleInvalid || createMut.isPending}
              onClick={() => void handleCreate()}
            >
              {createMut.isPending
                ? 'Creating…'
                : createIsTemplate
                  ? 'Create template'
                  : 'Create & add questions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog — edit the copy before creating it */}
      <Dialog
        open={duplicateSource != null}
        onOpenChange={o => {
          if (!o) setDuplicateSource(null)
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {duplicateSource?.isTemplate ? 'Use template' : 'Duplicate survey'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {duplicateSource?.isTemplate
                ? 'A new survey is created from this template with its questions and settings. It starts as a Draft you can edit and send.'
                : 'Questions, description, location and dates are copied. The copy starts as a Draft you can keep editing.'}
            </p>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Name *</span>
              <Input
                value={dupTitle}
                onChange={e => setDupTitle(e.target.value)}
                placeholder="Survey name"
              />
            </label>
            <div className="space-y-1 text-sm">
              <span className="font-medium">Audience *</span>
              <Select value={dupTargetKind} onValueChange={v => setDupTargetKind(v as SurveyTargetKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">{SURVEY_TARGET_KIND_LABELS.EMPLOYEE}</SelectItem>
                  <SelectItem value="SERVICE_USER">{SURVEY_TARGET_KIND_LABELS.SERVICE_USER}</SelectItem>
                  <SelectItem value="PUBLIC">{SURVEY_TARGET_KIND_LABELS.PUBLIC}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dupTargetKind === 'EMPLOYEE' && (
              <div className="space-y-1 text-sm">
                <span className="font-medium">Job roles</span>
                <MultiSelect
                  options={roleOptions}
                  value={dupRoleIds}
                  onChange={setDupRoleIds}
                  placeholder="All job roles"
                  searchPlaceholder="Search roles…"
                />
                <span className="block text-xs text-muted-foreground">Leave empty for all roles.</span>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dupAnonymous}
                onChange={e => setDupAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Anonymous responses
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateSource(null)}>
              Cancel
            </Button>
            <Button
              disabled={!dupTitle.trim() || duplicateMut.isPending}
              onClick={() => void handleDuplicateConfirm()}
            >
              {duplicateMut.isPending
                ? duplicateSource?.isTemplate
                  ? 'Creating…'
                  : 'Duplicating…'
                : duplicateSource?.isTemplate
                  ? 'Create survey'
                  : 'Duplicate & edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All locations for a survey */}
      <Dialog
        open={locationsView != null}
        onOpenChange={o => {
          if (!o) setLocationsView(null)
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Locations</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {locationsView ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Locations for <span className="font-medium text-foreground">{locationsView.surveyTitle}</span>
                </p>
                <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {locationsView.names.map(name => (
                    <li
                      key={name}
                      className="rounded-md bg-muted/40 px-2.5 py-1.5 text-sm text-foreground"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLocationsView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form-style preview */}
      <SurveyPreviewDialog
        surveyId={previewId}
        open={previewId != null}
        onOpenChange={o => !o && setPreviewId(null)}
      />

      {/* Delete confirm */}
      <AlertDialog open={toDelete != null} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the survey and its questions. Recipients and any responses are kept in the
              audit trail. This cannot be undone.
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
              {deleteMut.isPending ? 'Deleting…' : 'Delete survey'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

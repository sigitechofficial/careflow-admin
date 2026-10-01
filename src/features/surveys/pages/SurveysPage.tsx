import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList, Eye, FileEdit, Loader2, Lock, Pencil, Plus, Trash2, Users } from 'lucide-react'
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
import { useCreateSurvey, useDeleteSurvey, useSurveys } from '@/features/surveys/hooks/useSurveys'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import { SurveyCompletionProgress } from '@/features/surveys/components/SurveyCompletionProgress'
import type { SurveyListItem, SurveyRecurrence, SurveyStatus } from '@/features/surveys/types'
import { SURVEY_RECURRENCE_LABELS } from '@/features/surveys/types'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { combineOperationalDateAndHm, dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const STATUS_TONE: Record<SurveyStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  CLOSED: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
}

export default function SurveysPage() {
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const navigate = useNavigate()
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const { data: surveys = [], isLoading, isError } = useSurveys()
  const createMut = useCreateSurvey()
  const deleteMut = useDeleteSurvey()

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
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [selectedZoneId, setSelectedZoneId] = React.useState('')
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>([])
  const [opensAt, setOpensAt] = React.useState('')
  const [closesAt, setClosesAt] = React.useState('')
  const [distributeAt, setDistributeAt] = React.useState('')
  const [recurrence, setRecurrence] = React.useState<SurveyRecurrence | ''>('')
  const [toDelete, setToDelete] = React.useState<SurveyListItem | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const [locationsView, setLocationsView] = React.useState<{
    surveyTitle: string
    names: string[]
  } | null>(null)

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
    setDescription('')
    setIsAnonymous(false)
    setSelectedZoneId('')
    setSelectedLocationIds([])
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
      const survey = await createMut.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        targetKind: 'EMPLOYEE',
        isAnonymous,
        opensAt: opensAt ? combineOperationalDateAndHm(opensAt.slice(0, 10), opensAt.slice(11, 16)) : undefined,
        closesAt: closesAt ? combineOperationalDateAndHm(closesAt.slice(0, 10), closesAt.slice(11, 16)) : undefined,
        distributeAt: distributeAt
          ? combineOperationalDateAndHm(distributeAt.slice(0, 10), distributeAt.slice(11, 16))
          : undefined,
        recurrence: recurrence || undefined,
        locationIds: locIds.length > 0 ? locIds : undefined,
      })
      toastSuccess('Survey created')
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

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Surveys</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create survey forms and send them to employees. Responses feed quality assurance.
            </p>
          </div>
        </div>
        {canManage ? (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New survey
          </Button>
        ) : null}
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
            className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
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
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">No surveys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first employee survey to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="whitespace-nowrap border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Status</th>
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
                      {s.isAnonymous ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">Anonymous</div>
                      ) : null}
                      {s.distributeAt && !s.distributedAt ? (
                        <div className="mt-0.5 text-xs text-teal-700 dark:text-teal-300">
                          {s.recurrence
                            ? `${SURVEY_RECURRENCE_LABELS[s.recurrence]} · next ${formatInstant(s.distributeAt)}`
                            : `Scheduled ${formatInstant(s.distributeAt)}`}
                        </div>
                      ) : s.recurrence && !s.clonedFromId ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Repeats {SURVEY_RECURRENCE_LABELS[s.recurrence].toLowerCase()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}
                      >
                        {s.status}
                      </span>
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
            <DialogTitle>New employee survey</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Title *</span>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Staff satisfaction Q3" />
            </label>
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
              Anonymous responses (recommended for honest staff feedback)
            </label>
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
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Distribute to employees at</span>
              <Input
                type="datetime-local"
                value={distributeAt}
                onChange={e => setDistributeAt(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                Optional first run time. After you add questions, a new survey is created and sent at
                this time (and again each period if you choose a repeat below).
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
            <p className="text-xs text-muted-foreground">Audience: Employees</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || scheduleInvalid || createMut.isPending}
              onClick={() => void handleCreate()}
            >
              {createMut.isPending ? 'Creating…' : 'Create & add questions'}
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

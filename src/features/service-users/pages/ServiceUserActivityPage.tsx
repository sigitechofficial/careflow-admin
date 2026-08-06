import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Activity, CalendarClock, CheckCircle2, Loader2, ClipboardList } from 'lucide-react'
import {
  SERVICE_USER_MODULE_CONTENT_WIDE_CLASS,
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserVisitActivity } from '@/features/service-users/activity/hooks'
import type { ServiceUserActivityVisit } from '@/features/service-users/activity/api'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleVisitWorkspaceSheet } from '@/features/scheduling/components/ScheduleVisitWorkspaceSheet'
import { ContentCard, contentBodyClass, contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { cn, formatDateTime } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError } from '@/shared/lib/toast'

function visitStatusLabel(status: string): string {
  if (status === 'PARTIALLY_COMPLETED') return 'Partially completed'
  if (status === 'COMPLETED') return 'Completed'
  return status.replace(/_/g, ' ')
}

function visitDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIsoDate(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function VisitActivityRow({
  visit,
  onOpen,
  opening,
}: {
  visit: ServiceUserActivityVisit
  onOpen: (visit: ServiceUserActivityVisit) => void
  opening: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(visit)}
      disabled={opening}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 text-left transition-colors',
        'hover:border-teal-300 hover:bg-teal-50/40 dark:hover:border-teal-800 dark:hover:bg-teal-950/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{visit.visitName}</p>
          <Badge variant={visit.status === 'COMPLETED' ? 'success' : 'secondary'} className="shrink-0">
            {visitStatusLabel(visit.status)}
          </Badge>
        </div>
        <p className={cn('mt-1', contentHelperClass)}>
          {formatDateTime(visit.scheduledStartDateTime)}
          {visit.scheduledEndDateTime ? ` – ${formatDateTime(visit.scheduledEndDateTime)}` : ''}
        </p>
        {visit.notes?.trim() ? (
          <p className={cn('mt-1 line-clamp-2', contentBodyClass)}>{visit.notes.trim()}</p>
        ) : null}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
        Details
      </span>
    </button>
  )
}

export default function ServiceUserActivityPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())
  const profileQuery = useServiceUser(serviceUserId)

  const defaultFrom = React.useMemo(() => daysAgoIsoDate(30), [])
  const defaultTo = React.useMemo(() => todayIsoDate(), [])
  const [dateFrom, setDateFrom] = React.useState(defaultFrom)
  const [dateTo, setDateTo] = React.useState(defaultTo)
  const [appliedFrom, setAppliedFrom] = React.useState(defaultFrom)
  const [appliedTo, setAppliedTo] = React.useState(defaultTo)

  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  const activityQuery = useServiceUserVisitActivity(serviceUserId, {
    page: 1,
    limit: 50,
    dateFrom: appliedFrom || undefined,
    dateTo: appliedTo || undefined,
  })

  const [workspaceJob, setWorkspaceJob] = React.useState<TimelineJob | null>(null)
  const [workspaceDate, setWorkspaceDate] = React.useState('')
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false)
  const [openingVisitId, setOpeningVisitId] = React.useState<string | null>(null)

  const visits = activityQuery.data?.data ?? []

  const applyRange = () => {
    if (rangeInvalid) {
      toastApiError(new Error('Invalid range'), 'From date must be on or before To date')
      return
    }
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
  }

  const resetRange = () => {
    setDateFrom(defaultFrom)
    setDateTo(defaultTo)
    setAppliedFrom(defaultFrom)
    setAppliedTo(defaultTo)
  }

  const openVisit = async (visit: ServiceUserActivityVisit) => {
    if (!visit.scheduledJobId) {
      toastApiError(new Error('Missing job'), 'This visit has no linked scheduled job')
      return
    }
    setOpeningVisitId(visit.id)
    try {
      const job = await getScheduledJob(visit.scheduledJobId)
      setWorkspaceJob(job)
      setWorkspaceDate(visitDateKey(visit.scheduledStartDateTime))
      setWorkspaceOpen(true)
    } catch (e) {
      toastApiError(e, 'Could not open visit details')
    } finally {
      setOpeningVisitId(null)
    }
  }

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing service user id.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={profileQuery.data ?? null}
        shellLayout="wide"
      />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} shellLayout="wide" />

      <div className={SERVICE_USER_MODULE_CONTENT_WIDE_CLASS}>
        <ContentCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={cn(contentTitleClass, 'inline-flex items-center gap-2')}>
                <Activity className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden />
                Visit activity
              </h2>
              <p className={cn('mt-1 max-w-2xl', contentHelperClass)}>
                Previous completed visits for this service user. Open a visit to see tasks, observations,
                medication, and body map recorded on that visit.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/service-users/$serviceUserId/visit-plan" params={{ serviceUserId }}>
                Visit plan
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-3">
            <FormField label="From" className="min-w-[10rem]">
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </FormField>
            <FormField label="To" className="min-w-[10rem]">
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </FormField>
            <Button type="button" size="sm" onClick={applyRange} disabled={rangeInvalid}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetRange}>
              Last 30 days
            </Button>
            {rangeInvalid ? (
              <p className="w-full text-xs text-destructive">From must be on or before To.</p>
            ) : null}
          </div>

          {!apiConfigured ? (
            <p className="text-sm text-muted-foreground">API is not configured.</p>
          ) : activityQuery.isLoading || activityQuery.isFetching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading completed visits…
            </div>
          ) : activityQuery.isError ? (
            <p className="text-sm text-destructive">
              {activityQuery.error instanceof Error
                ? activityQuery.error.message
                : 'Could not load visit activity'}
            </p>
          ) : visits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <p className={cn('mt-3 font-medium', contentTitleClass)}>No completed visits in this range</p>
              <p className={cn('mx-auto mt-1 max-w-md', contentHelperClass)}>
                Try a wider date range, or complete visits will appear here once carers finish them.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visits.map((visit) => (
                <li key={visit.id}>
                  <VisitActivityRow
                    visit={visit}
                    onOpen={(v) => void openVisit(v)}
                    opening={openingVisitId === visit.id}
                  />
                </li>
              ))}
            </ul>
          )}

          {activityQuery.data?.meta?.total != null && activityQuery.data.meta.total > visits.length ? (
            <p className={contentHelperClass}>
              Showing {visits.length} of {activityQuery.data.meta.total} visits
              {appliedFrom || appliedTo
                ? ` (${appliedFrom || '…'} → ${appliedTo || '…'})`
                : ''}
              .
            </p>
          ) : visits.length > 0 ? (
            <p className={cn('inline-flex items-center gap-1.5', contentHelperClass)}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              {visits.length} completed visit{visits.length === 1 ? '' : 's'}
              {appliedFrom || appliedTo
                ? ` · ${appliedFrom || '…'} → ${appliedTo || '…'}`
                : ''}
            </p>
          ) : null}
        </ContentCard>
      </div>

      <ScheduleVisitWorkspaceSheet
        open={workspaceOpen}
        onOpenChange={(open) => {
          setWorkspaceOpen(open)
          if (!open) setWorkspaceJob(null)
        }}
        job={workspaceJob}
        date={workspaceDate}
        defaultTab="tasks"
      />
    </div>
  )
}

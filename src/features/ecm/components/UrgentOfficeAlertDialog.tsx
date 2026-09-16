import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { AuthoriseManualCheckInDialog } from '@/features/ecm/components/AuthoriseManualCheckInDialog'
import { RejectManualCheckInDialog } from '@/features/ecm/components/RejectManualCheckInDialog'
import { AllowCarerContinueDialog } from '@/features/ecm/components/AllowCarerContinueDialog'
import {
  useAcknowledgeEcmException,
  useAllowVisitContinue,
  useAuthoriseCheckInMethodGrant,
  useRejectCheckInMethodGrant,
} from '@/features/ecm/hooks/useEcm'
import { ecmExceptionQueueSearch } from '@/features/notifications/utils/notification-deep-link'
import { formatOpsCalendarDate, formatOpsClockTime } from '@/shared/lib/operational-day.util'
import type { EcmExceptionRow } from '@/features/ecm/types/ecm.types'
import {
  isLiveCarerSos,
  isLiveLeftVisitArea,
  isLiveOutsideAreaCheckIn,
} from '@/features/ecm/utils/ecm-urgent-alert.util'
import {
  dialogHeadline,
  liveSosAlerts,
  visitHasLiveSos,
  waitingUrgentOfficeDialogVisits,
  type UrgentOfficeDialogAlert,
  type UrgentOfficeDialogState,
  type UrgentOfficeDialogVisit,
} from '@/features/ecm/utils/ecm-urgent-dialog.util'

function mapsHref(lat?: number | null, lng?: number | null, unavailable?: boolean): string | null {
  if (unavailable || lat == null || lng == null) return null
  return `https://maps.google.com/?q=${lat},${lng}`
}

function factLine(label: string, value: string | null | undefined) {
  if (!value?.trim()) return null
  return (
    <p className="text-sm leading-snug text-foreground">
      <span className="text-muted-foreground">{label}</span>
      <span className="mx-1.5 text-muted-foreground/70">·</span>
      <span className="font-medium">{value.trim()}</span>
    </p>
  )
}

function visitFacts(visit: UrgentOfficeDialogVisit | undefined, rows: EcmExceptionRow[]) {
  const row = rows[0]
  const titleSu = visit?.alerts[0]?.title.split('—')[1]?.trim()
  return {
    carer:
      rows.find(item => item.sos?.employeeName)?.sos?.employeeName?.trim() ||
      row?.carers?.map(c => c.name || c.employeeId).filter(Boolean).join(', ') ||
      null,
    serviceUser: row?.serviceUserName?.trim() || titleSu || null,
    visitId: row?.visitRef?.trim() || null,
    visitName: row?.jobName?.trim() || null,
    scheduled: row?.plannedStartDateTime
      ? `${formatOpsCalendarDate(row.plannedStartDateTime)} · ${formatOpsClockTime(row.plannedStartDateTime)}`
      : null,
  }
}

function sosDisplayList(alerts: UrgentOfficeDialogAlert[], rows: EcmExceptionRow[]) {
  const byId = new Map(rows.map(row => [row.id, row]))
  return alerts.map(alert => {
    const row = byId.get(alert.exceptionId)
    const href = mapsHref(row?.sos?.latitude, row?.sos?.longitude, row?.sos?.locationUnavailable)
    const carerMessage = row?.sos?.message?.trim()
    return {
      exceptionId: alert.exceptionId,
      sentAt: formatOpsClockTime(row?.sos?.createdAt ?? row?.createdAt ?? alert.createdAt),
      message: carerMessage || (row ? 'No message' : 'Waiting for visit details…'),
      href,
    }
  })
}

function SosSection({
  alerts,
  rows,
  ackAction,
}: {
  alerts: UrgentOfficeDialogAlert[]
  rows: EcmExceptionRow[]
  ackAction?: React.ReactNode
}) {
  const items = sosDisplayList(alerts, rows)
  if (items.length === 0) return null

  return (
    <section className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      {items.length > 1 ? (
        <p className="text-xs font-medium text-muted-foreground">
          {items.length} SOS alerts on this visit — none acknowledged yet
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map(item => (
          <li key={item.exceptionId} className="space-y-1">
            <p className="text-xs text-muted-foreground">Sent at {item.sentAt}</p>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Message from carer</p>
              <p className="mt-0.5 text-sm text-foreground">{item.message}</p>
            </div>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                View on map
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Location was not available on the device.</p>
            )}
          </li>
        ))}
      </ul>
      {ackAction}
    </section>
  )
}

function LeftAreaSection({
  jobId,
  row,
  fallbackMessage,
  showHeading,
  onAllowed,
}: {
  jobId: string
  row: EcmExceptionRow | undefined
  fallbackMessage: string
  showHeading: boolean
  onAllowed: () => void
}) {
  const allow = useAllowVisitContinue()
  const [reasonOpen, setReasonOpen] = React.useState(false)
  const href = mapsHref(row?.areaLock?.latitude, row?.areaLock?.longitude)

  return (
    <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      {showHeading ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Visit locked</p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {row
          ? 'The carer left the visit area. Tasks, medication, and observations stay blocked until you allow them to continue.'
          : fallbackMessage}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          View on map
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      ) : null}
      <Button type="button" size="sm" disabled={allow.isPending} onClick={() => setReasonOpen(true)}>
        Allow to continue
      </Button>
      <AllowCarerContinueDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        busy={allow.isPending}
        onConfirm={payload =>
          allow
            .mutateAsync({
              jobId: row?.scheduledJobId ?? jobId,
              reasonId: payload.reasonId,
              note: payload.note,
            })
            .then(onAllowed)
        }
      />
    </section>
  )
}

function ManualAuthSection({
  row,
  fallbackMessage,
  showHeading,
  onDecided,
}: {
  row: EcmExceptionRow | undefined
  fallbackMessage: string
  showHeading: boolean
  onDecided: () => void
}) {
  const authorise = useAuthoriseCheckInMethodGrant()
  const reject = useRejectCheckInMethodGrant()
  const [reasonOpen, setReasonOpen] = React.useState(false)
  const [rejectOpen, setRejectOpen] = React.useState(false)
  const grant = row?.checkInMethodRequest
  const grantId = grant?.id
  const note = grant?.carerNote?.trim()
  const href = mapsHref(grant?.latitude, grant?.longitude, grant?.locationUnavailable)
  const busy = authorise.isPending || reject.isPending

  return (
    <section className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      {showHeading ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          Waiting for office approval
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {note ? (
          <>
            <span className="font-medium text-foreground/80">Carer note</span>
            <span className="mx-1.5 text-muted-foreground/80">·</span>
            {note}
          </>
        ) : row ? (
          'The carer asked to check in without a geo match. No note was added.'
        ) : (
          fallbackMessage
        )}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          View on map
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      ) : null}
      {row && grantId ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => setReasonOpen(true)}>
            Authorise
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setRejectOpen(true)}
          >
            Reject
          </Button>
          <AuthoriseManualCheckInDialog
            open={reasonOpen}
            onOpenChange={setReasonOpen}
            busy={authorise.isPending}
            onConfirm={payload =>
              authorise
                .mutateAsync({
                  jobId: row.scheduledJobId,
                  grantId,
                  reasonId: payload.reasonId,
                  note: payload.note,
                })
                .then(onDecided)
            }
          />
          <RejectManualCheckInDialog
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            busy={reject.isPending}
            onConfirm={payload =>
              reject
                .mutateAsync({
                  jobId: row.scheduledJobId,
                  grantId,
                  reasonCode: payload.reasonCode,
                  note: payload.note,
                })
                .then(onDecided)
            }
          />
        </div>
      ) : null}
    </section>
  )
}

export function UrgentOfficeAlertDialog({
  state,
  rows,
  onSelectVisit,
  onLater,
  onRemoveKind,
  onPickerOpenChange,
}: {
  state: UrgentOfficeDialogState
  rows: EcmExceptionRow[]
  onSelectVisit: (jobId: string) => void
  onLater: () => void
  onRemoveKind: (kind: 'CARER_SOS' | 'LEFT_VISIT_AREA' | 'OUTSIDE_AREA_CHECK_IN_REQUEST') => void
  onPickerOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const acknowledge = useAcknowledgeEcmException()
  const visit = state.visits.find(item => item.scheduledJobId === state.activeJobId)
  const open = Boolean(visit)
  const hasSos = visit ? visitHasLiveSos(visit) : false
  const waiting = waitingUrgentOfficeDialogVisits(state)
  const sosRows = rows.filter(row => row.kind === 'CARER_SOS')
  const leftRow = rows.find(isLiveLeftVisitArea)
  const authRow = rows.find(isLiveOutsideAreaCheckIn)
  const showSos = visit?.alerts.some(alert => alert.kind === 'CARER_SOS')
  const showLeft = visit?.alerts.some(alert => alert.kind === 'LEFT_VISIT_AREA')
  const showAuth = visit?.alerts.some(alert => alert.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST')
  const facts = visitFacts(visit, rows)
  const sectionCount = [showSos, showLeft, showAuth].filter(Boolean).length
  const sosAlertList = visit ? liveSosAlerts(visit) : []
  const sosOnly = Boolean(showSos && !showLeft && !showAuth)

  const acknowledgeSos = () => {
    const liveIds = sosRows.filter(isLiveCarerSos).map(row => row.id)
    const ids =
      liveIds.length > 0
        ? liveIds
        : visit?.alerts.filter(item => item.kind === 'CARER_SOS').map(item => item.exceptionId) ?? []
    if (!ids.length) return
    void acknowledge.acknowledgeAll(ids).then(() => onRemoveKind('CARER_SOS'))
  }

  const acknowledgeLabel = acknowledge.isPending
    ? 'Acknowledging…'
    : sosAlertList.length > 1
      ? `Acknowledge all SOS (${sosAlertList.length})`
      : 'Acknowledge SOS'

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onLater()
      }}
    >
      <DialogContent
        size="md"
        data-testid="urgent-office-alert-dialog"
        onPointerDownOutside={event => {
          if (hasSos) event.preventDefault()
        }}
        onEscapeKeyDown={event => {
          if (hasSos) event.preventDefault()
        }}
        onInteractOutside={event => {
          if (hasSos) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="pr-8">{dialogHeadline(visit)}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              {hasSos ? (
                <p>A carer sent an emergency alert. Acknowledge so they know the office has seen it.</p>
              ) : showLeft ? (
                <p>This visit is locked until you allow the carer to continue.</p>
              ) : (
                <p>The carer needs office approval before they can check in.</p>
              )}
              {factLine('Carer', facts.carer)}
              {factLine('Service user', facts.serviceUser)}
              {factLine('Visit ID', facts.visitId)}
              {factLine('Visit', facts.visitName)}
              {factLine('Scheduled', facts.scheduled)}
            </div>
          </DialogDescription>
          {waiting.length > 0 ? (
            <div className="relative pt-1">
              <button
                type="button"
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                data-testid="urgent-office-alert-waiting"
                onClick={() => onPickerOpenChange(!state.pickerOpen)}
              >
                {waiting.length} more waiting
              </button>
              {state.pickerOpen ? (
                <ul
                  className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card p-1 shadow-md"
                  data-testid="urgent-office-alert-switcher"
                >
                  {waiting.map(item => (
                    <li key={item.scheduledJobId}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => onSelectVisit(item.scheduledJobId)}
                      >
                        <span className="font-medium">{dialogHeadline(item)}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.alerts.map(alert => alert.title).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>
        <DialogBody className="space-y-3">
          {showSos ? (
            <SosSection
              alerts={sosAlertList}
              rows={sosRows}
              ackAction={
                showSos && !sosOnly ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={acknowledge.isPending}
                    onClick={acknowledgeSos}
                  >
                    {acknowledgeLabel}
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {showLeft ? (
            <LeftAreaSection
              jobId={visit?.scheduledJobId ?? ''}
              row={leftRow}
              showHeading={sectionCount > 1}
              fallbackMessage={visit?.alerts.find(alert => alert.kind === 'LEFT_VISIT_AREA')?.message ?? ''}
              onAllowed={() => onRemoveKind('LEFT_VISIT_AREA')}
            />
          ) : null}
          {showAuth ? (
            <ManualAuthSection
              row={authRow}
              showHeading={sectionCount > 1}
              fallbackMessage={
                visit?.alerts.find(alert => alert.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST')?.message ?? ''
              }
              onDecided={() => onRemoveKind('OUTSIDE_AREA_CHECK_IN_REQUEST')}
            />
          ) : null}
        </DialogBody>
        <DialogFooter className="justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate({
                to: '/ecm/live',
                search: ecmExceptionQueueSearch(visit?.scheduledJobId),
              })
            }
          >
            Open visit
          </Button>
          {sosOnly ? (
            <Button type="button" disabled={acknowledge.isPending} onClick={acknowledgeSos}>
              {acknowledgeLabel}
            </Button>
          ) : !showSos ? (
            <Button type="button" variant="ghost" onClick={onLater}>
              Later
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

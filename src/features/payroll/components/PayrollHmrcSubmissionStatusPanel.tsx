import * as React from 'react'
import { Download, FileSpreadsheet, Loader2, RotateCcw, ScrollText } from 'lucide-react'
import type {
  PayrollHmrcSubmission,
  PayrollHmrcSubmissionAuditEvent,
} from '@/features/payroll/types/payroll.types'
import {
  buildHmrcLifecycleSteps,
  mapHmrcStatusToLifecycle,
} from '@/features/payroll/utils/hmrc-submission-lifecycle.util'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

type Props = {
  documentLabel: 'FPS' | 'EPS'
  isValidated: boolean
  submissions: PayrollHmrcSubmission[]
  isLoading?: boolean
  canManage: boolean
  currentUserId: string | null
  /** Load full detail (includes redacted XML + audit events). */
  onDownload: (submission: PayrollHmrcSubmission) => Promise<PayrollHmrcSubmission>
  /** FPS run workbook (.xlsx) — shown next to XML for FPS only. */
  onDownloadFpsExcel?: () => void
  fpsExcelDownloading?: boolean
  onRetry?: (submission: PayrollHmrcSubmission) => void
  onApproveLive?: (submissionId: string) => void
  onRejectLive?: (submissionId: string, reason?: string) => void
  approvePending?: boolean
  rejectPending?: boolean
  retryPending?: boolean
}

function downloadXml(filename: string, xml: string) {
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function shortHash(value: string | null | undefined): string | null {
  if (!value) return null
  return value.length <= 16 ? value : `${value.slice(0, 12)}…`
}

function eventLabel(eventType: string): string {
  switch (eventType) {
    case 'DRAFT_BUILT':
      return 'Draft built'
    case 'LIVE_REQUESTED':
      return 'Live requested'
    case 'LIVE_APPROVED':
      return 'Live approved & sent'
    case 'LIVE_REJECTED':
      return 'Live rejected'
    case 'GATEWAY_RESPONSE':
      return 'Gateway response'
    case 'GATEWAY_POSTED':
      return 'Gateway posted'
    default:
      return eventType
  }
}

export function PayrollHmrcSubmissionStatusPanel({
  documentLabel,
  isValidated,
  submissions,
  isLoading,
  canManage,
  currentUserId,
  onDownload,
  onDownloadFpsExcel,
  fpsExcelDownloading,
  onRetry,
  onApproveLive,
  onRejectLive,
  approvePending,
  rejectPending,
  retryPending,
}: Props) {
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)
  const [auditLoadingId, setAuditLoadingId] = React.useState<string | null>(null)
  const [auditById, setAuditById] = React.useState<
    Record<
      string,
      {
        events: PayrollHmrcSubmissionAuditEvent[]
        payloadFingerprint: string | null
        responseSha256: string | null
        correlationId: string | null
      }
    >
  >({})
  const [openAuditId, setOpenAuditId] = React.useState<string | null>(null)

  const latest = submissions[0] ?? null
  const steps = buildHmrcLifecycleSteps({
    isValidated,
    latestStatus: latest?.status ?? null,
  })

  const handleDownload = async (s: PayrollHmrcSubmission) => {
    setDownloadingId(s.id)
    try {
      const detail = await onDownload(s)
      const xml = detail.requestXmlRedacted
      if (!xml) {
        toastApiError(new Error('No GovTalk XML stored for this attempt'))
        return
      }
      const env = s.environment.toLowerCase()
      downloadXml(
        `care-${documentLabel.toLowerCase()}-${env}-${s.id.slice(0, 8)}.xml`,
        xml,
      )
      toastSuccess('Downloaded redacted GovTalk XML')
    } catch (err) {
      toastApiError(err)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleToggleAudit = async (s: PayrollHmrcSubmission) => {
    if (openAuditId === s.id) {
      setOpenAuditId(null)
      return
    }
    if (auditById[s.id]) {
      setOpenAuditId(s.id)
      return
    }
    setAuditLoadingId(s.id)
    try {
      const detail = await onDownload(s)
      setAuditById((prev) => ({
        ...prev,
        [s.id]: {
          events: detail.auditEvents ?? [],
          payloadFingerprint: detail.payloadFingerprint ?? s.payloadFingerprint ?? null,
          responseSha256: detail.responseSha256 ?? null,
          correlationId: detail.correlationId ?? s.correlationId,
        },
      }))
      setOpenAuditId(s.id)
    } catch (err) {
      toastApiError(err)
    } finally {
      setAuditLoadingId(null)
    }
  }

  return (
    <div className="space-y-3" data-testid="payroll-hmrc-status-panel">
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
        <p className="mb-2 text-xs font-medium text-foreground">
          {documentLabel} filing status
          {latest ? (
            <span className="ml-2 font-normal text-muted-foreground">
              · latest {mapHmrcStatusToLifecycle(latest.status).stageLabel}
              {latest.environment ? ` (${latest.environment})` : ''}
            </span>
          ) : (
            <span className="ml-2 font-normal text-muted-foreground">· no attempts yet</span>
          )}
        </p>
        <ol className="flex flex-wrap items-center gap-1.5">
          {steps.map((step, idx) => (
            <li key={step.id} className="flex items-center gap-1.5">
              {idx > 0 ? (
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-[11px] font-medium',
                  step.state === 'complete' &&
                    'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
                  step.state === 'current' &&
                    'bg-sky-500/15 text-sky-900 dark:text-sky-200 ring-1 ring-sky-400/40',
                  step.state === 'upcoming' && 'bg-muted text-muted-foreground',
                  step.state === 'error' && 'bg-rose-500/15 text-rose-800 dark:text-rose-200',
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading submission history…</p>
      ) : submissions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No HMRC attempts yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Env</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Detail</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const life = mapHmrcStatusToLifecycle(s.status)
                const isPendingLive =
                  s.environment === 'LIVE' && s.status === 'PENDING_APPROVAL'
                const isRequester = Boolean(
                  currentUserId && s.createdById && currentUserId === s.createdById,
                )
                const canApprove =
                  canManage && isPendingLive && !isRequester && Boolean(onApproveLive)
                const canReject = canManage && isPendingLive && Boolean(onRejectLive)
                const canRetryRow =
                  canManage && (s.canRetry ?? life.canRetry) && Boolean(onRetry)
                const audit = auditById[s.id]
                const auditOpen = openAuditId === s.id

                return (
                  <React.Fragment key={s.id}>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString('en-GB')}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">{s.environment}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-medium',
                            life.tone === 'success' &&
                              'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
                            life.tone === 'warning' &&
                              'bg-amber-500/15 text-amber-900 dark:text-amber-200',
                            life.tone === 'danger' &&
                              'bg-rose-500/15 text-rose-800 dark:text-rose-200',
                            life.tone === 'neutral' && 'bg-muted text-muted-foreground',
                          )}
                        >
                          {s.lifecycleStage ?? life.stageLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {[
                          s.mode,
                          s.correlationId ? `Corr ${s.correlationId}` : null,
                          shortHash(s.payloadFingerprint)
                            ? `Hash ${shortHash(s.payloadFingerprint)}`
                            : null,
                          s.errorMessage,
                          s.httpStatus ? `HTTP ${s.httpStatus}` : null,
                          isPendingLive && isRequester ? 'Waiting for another user' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={auditLoadingId === s.id}
                            onClick={() => void handleToggleAudit(s)}
                            data-testid="payroll-hmrc-audit-toggle"
                          >
                            {auditLoadingId === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <ScrollText className="h-3 w-3" aria-hidden />
                            )}
                            Audit
                          </Button>
                        {(s.canDownloadPayload ?? s.hasRequestXml) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={downloadingId === s.id}
                            onClick={() => void handleDownload(s)}
                          >
                            {downloadingId === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <Download className="h-3 w-3" aria-hidden />
                            )}
                            XML
                          </Button>
                        ) : null}
                        {documentLabel === 'FPS' && onDownloadFpsExcel ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={fpsExcelDownloading}
                            onClick={() => onDownloadFpsExcel()}
                          >
                            {fpsExcelDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <FileSpreadsheet className="h-3 w-3" aria-hidden />
                            )}
                            Excel
                          </Button>
                        ) : null}
                          {canRetryRow ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-[11px]"
                              disabled={retryPending}
                              onClick={() => onRetry?.(s)}
                            >
                              {retryPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              ) : (
                                <RotateCcw className="h-3 w-3" aria-hidden />
                              )}
                              Retry
                            </Button>
                          ) : null}
                          {canApprove ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              disabled={approvePending || rejectPending}
                              onClick={() => {
                                const phrase = window.prompt(
                                  `Type exactly: SEND LIVE ${documentLabel}`,
                                )
                                if (phrase !== `SEND LIVE ${documentLabel}`) {
                                  window.alert('Cancelled — confirmation phrase did not match.')
                                  return
                                }
                                onApproveLive?.(s.id)
                              }}
                            >
                              Approve live
                            </Button>
                          ) : null}
                          {canReject ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-rose-700 dark:text-rose-300"
                              disabled={approvePending || rejectPending}
                              onClick={() => {
                                const reason =
                                  window.prompt('Optional reason for rejecting:') ?? undefined
                                onRejectLive?.(s.id, reason || undefined)
                              }}
                            >
                              Reject
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {auditOpen && audit ? (
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={5} className="px-3 py-3">
                          <p className="mb-2 text-[11px] font-medium text-foreground">
                            Immutable audit trail
                          </p>
                          <p className="mb-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                            Payload hash: {audit.payloadFingerprint ?? '—'}
                            {audit.responseSha256
                              ? ` · Response hash: ${audit.responseSha256}`
                              : ''}
                            {audit.correlationId ? ` · Correlation: ${audit.correlationId}` : ''}
                          </p>
                          {audit.events.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground">
                              No lifecycle events recorded for this attempt yet (pre-T21 rows).
                            </p>
                          ) : (
                            <ol className="space-y-1.5">
                              {audit.events.map((ev) => (
                                <li
                                  key={ev.id}
                                  className="rounded border border-border bg-background px-2 py-1.5 text-[11px]"
                                >
                                  <span className="font-medium text-foreground">
                                    {eventLabel(ev.eventType)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {' '}
                                    → {ev.toStatus}
                                    {ev.fromStatus ? ` (from ${ev.fromStatus})` : ''}
                                    {' · '}
                                    {new Date(ev.createdAt).toLocaleString('en-GB')}
                                    {ev.actorUserId
                                      ? ` · actor ${ev.actorUserId.slice(0, 8)}…`
                                      : ''}
                                    {ev.correlationId ? ` · corr ${ev.correlationId}` : ''}
                                    {ev.responseSha256
                                      ? ` · resp ${shortHash(ev.responseSha256)}`
                                      : ''}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

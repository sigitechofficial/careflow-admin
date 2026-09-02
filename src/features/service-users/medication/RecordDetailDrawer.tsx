import * as React from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useMedicationEventDetail } from '@/features/service-users/hooks/useMedicationEvents'
import { MarEventStatusBadge } from '@/features/service-users/medication/MarEventStatusBadge'
import { RecordReviewPanel } from '@/features/service-users/medication/RecordReviewPanel'
import { statusCodeHeaderClass } from '@/features/service-users/medication/mar-record-utils'
import {
  carerAdministeredName,
  eventDateLabel,
  eventDisplayCode,
  eventReason,
  eventReviewLabel,
  eventRoundWindow,
  eventScheduledDueTime,
  eventTimeSlotLabel,
  formatGbDate,
  formatGbDateTime,
  snapshotDiffersFromCurrent,
  userDisplayName,
} from '@/features/service-users/medication/medication-event-display'
import type { MedicationEventDetail } from '@/features/service-users/api/medication-mar.api'
import './mar-record.css'

const WITNESS_RELATION_LABELS: Record<string, string> = {
  CO_CARER: 'Co-carer',
  RELATIVE: 'Relative',
  OTHER: 'Other',
}

function witnessRelationDisplay(
  code: string | null | undefined,
  detail: string | null | undefined,
): string {
  const label = code ? WITNESS_RELATION_LABELS[code.toUpperCase()] ?? code : ''
  const extra = detail?.trim() ?? ''
  if (label && extra) return `${label} — ${extra}`
  return label || extra || '—'
}

function DetailRow({
  label,
  value,
  mono,
  full,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  if (full) {
    return (
      <div className="record-summary-item full">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
    )
  }
  return (
    <div className="drawer-row">
      <span className="drawer-key">{label}</span>
      <span className={cn('drawer-val', mono && 'font-mono text-xs tabular-nums')}>{value}</span>
    </div>
  )
}

function AdministrationTimingSection({ ev }: { ev: MedicationEventDetail }) {
  const roundWindow = eventRoundWindow(ev)
  const reviewPending = eventReviewLabel(ev) === 'Pending'

  return (
    <>
      <div className="record-summary-body">
        <div className="record-summary-item">
          <div className="label">Date</div>
          <div className="value">{eventDateLabel(ev)}</div>
        </div>
        <div className="record-summary-item">
          <div className="label">Round</div>
          <div className="value">{eventTimeSlotLabel(ev)}</div>
        </div>
        <div className="record-summary-item">
          <div className="label">Scheduled</div>
          <div className="value font-mono text-sm tabular-nums">{eventScheduledDueTime(ev)}</div>
        </div>
        <div className="record-summary-item">
          <div className="label">Given at</div>
          <div className="value text-sm tabular-nums">
            {ev.actualDateTime ? formatGbDateTime(ev.actualDateTime) : '—'}
          </div>
        </div>
        {/* Recorded at — hidden on UI for now (per request)
        <div className="record-summary-item">
          <div className="label">Recorded at</div>
          <div className="value text-sm tabular-nums">{formatGbDateTime(ev.createdAt)}</div>
        </div>
        */}
        {roundWindow && (
          <div className="record-summary-item">
            <div className="label">Admin window</div>
            <div className="value font-mono text-sm tabular-nums">{roundWindow}</div>
          </div>
        )}
        <div className="record-summary-item full">
          <div className="label">Status</div>
          <div className="value" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <MarEventStatusBadge status={ev.status} statusCode={ev.statusCode} />
            {eventReason(ev) !== '—' && (
              <span className="text-sm text-[#64748b]">{eventReason(ev)}</span>
            )}
          </div>
        </div>
        {ev.doseGiven && (
          <div className="record-summary-item">
            <div className="label">Dose given</div>
            <div className="value">{ev.doseGiven}</div>
          </div>
        )}
        {ev.supportLevel && (
          <div className="record-summary-item">
            <div className="label">How supported</div>
            <div className="value">{ev.supportLevel}</div>
          </div>
        )}
        <div className="record-summary-item">
          <div className="label">Review</div>
          <div className="value">
            {reviewPending ? (
              <span className="badge-review">⏳ Pending review</span>
            ) : (
              eventReviewLabel(ev)
            )}
          </div>
        </div>
      </div>

      <div className="drawer-section">
        <div className="drawer-label">Timing (full)</div>
        <DetailRow
          label="Scheduled visit"
          mono
          value={ev.scheduledDateTime ? formatGbDateTime(ev.scheduledDateTime) : '—'}
        />
        <DetailRow
          label="Given at"
          mono
          value={ev.actualDateTime ? formatGbDateTime(ev.actualDateTime) : '—'}
        />
        {/* Recorded at — hidden on UI for now (per request) */}
        {/* <DetailRow label="Recorded at" mono value={formatGbDateTime(ev.createdAt)} /> */}
        {ev.updatedAt && ev.updatedAt !== ev.createdAt && (
          <DetailRow label="Last updated" mono value={formatGbDateTime(ev.updatedAt)} />
        )}
      </div>
    </>
  )
}

function AdministrationPeopleSection({ ev }: { ev: MedicationEventDetail }) {
  return (
    <div className="drawer-section">
      <div className="drawer-label">Who recorded</div>
      <DetailRow label="Carer" value={carerAdministeredName(ev.administeredBy)} />
      <DetailRow label="Entered by" value={ev.enteredBy ? userDisplayName(ev.enteredBy) : '—'} />
      <DetailRow label="Recorded by" value={ev.createdBy ? userDisplayName(ev.createdBy) : '—'} />
      {ev.managerReviewedBy && (
        <DetailRow
          label="Reviewed by"
          value={`${userDisplayName(ev.managerReviewedBy)}${
            ev.managerReviewedAt ? ` · ${formatGbDateTime(ev.managerReviewedAt)}` : ''
          }`}
        />
      )}
    </div>
  )
}

export function RecordDetailDrawer({
  open,
  onOpenChange,
  serviceUserId,
  eventId,
  onCorrect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  eventId: string | null
  onCorrect?: () => void
}) {
  const detailQuery = useMedicationEventDetail(serviceUserId, eventId, open)
  const ev = detailQuery.data

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const displayCode = ev ? eventDisplayCode(ev) : '—'
  const hdrClass = statusCodeHeaderClass(displayCode)
  const roundLabel = ev ? eventTimeSlotLabel(ev) : '—'

  return (
    <>
      <div
        className={`mar-drawer-overlay ${open ? 'open' : ''}`}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />
      <div className={`mar-drawer ${open ? 'open' : ''}`} role="dialog" aria-label="Administration record">
        <div className="record-summary-card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
            <button type="button" className="mar-record-close" aria-label="Close" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {detailQuery.isLoading && (
            <div className="flex items-center gap-2 px-6 py-8 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading record…
            </div>
          )}

          {detailQuery.error && (
            <p className="px-6 py-8 text-sm text-destructive" role="alert">
              {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load'}
            </p>
          )}

          {ev && (
            <>
              <div className={`record-summary-hdr ${hdrClass}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '0 8px 8px' }}>
                  <div className="record-summary-code">{displayCode}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 8 }}>
                      <MarEventStatusBadge status={ev.status} statusCode={ev.statusCode} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {ev.medication.medicationName}
                      {roundLabel !== '—' ? ` · ${roundLabel}` : ''}
                      {ev.isPrn ? ' · PRN' : ''}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                      {formatGbDate(ev.scheduledDateTime ?? ev.actualDateTime ?? ev.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <AdministrationTimingSection ev={ev} />
              <AdministrationPeopleSection ev={ev} />

              <div className="drawer-section">
                <div className="drawer-label">Medication</div>
                <DetailRow label="Name" value={ev.medication.medicationName} />
                <DetailRow
                  label="Dose"
                  value={[ev.medication.dose, ev.medication.strength].filter(Boolean).join(' · ') || '—'}
                />
                <DetailRow
                  label="Route"
                  value={ev.routeNameSnapshot ?? ev.medication.route?.name ?? '—'}
                />
                {snapshotDiffersFromCurrent(ev.medicationNameSnapshot, ev.medication.medicationName) && (
                  <DetailRow
                    label="At record time"
                    value={
                      <>
                        {ev.medicationNameSnapshot}
                        {ev.doseSnapshot ? ` · ${ev.doseSnapshot}` : ''}
                        {ev.strengthSnapshot ? ` · ${ev.strengthSnapshot}` : ''}
                      </>
                    }
                  />
                )}
              </div>

              {(ev.reason || ev.notGivenReason || ev.notes || ev.prnReason || ev.prnOutcome) && (
                <div className="drawer-section">
                  <div className="drawer-label">Notes &amp; reason</div>
                  {(ev.reason || ev.notGivenReason) && (
                    <DetailRow label="Reason" value={eventReason(ev)} />
                  )}
                  {ev.notes && <DetailRow label="Notes" value={ev.notes} full />}
                  {ev.prnReason && <DetailRow label="PRN reason" value={ev.prnReason} />}
                  {ev.prnOutcome && <DetailRow label="PRN outcome" value={ev.prnOutcome} />}
                </div>
              )}

              {ev.witnessPresent != null && (
                <div className="drawer-section">
                  <div className="drawer-label">Witness</div>
                  <DetailRow label="Present" value={ev.witnessPresent ? 'Yes' : 'No'} />
                  {ev.witnessPresent ? (
                    <>
                      <DetailRow label="Name" value={ev.witnessName ?? '—'} />
                      <DetailRow
                        label="Relation"
                        value={witnessRelationDisplay(ev.witnessRelationCode, ev.witnessRelationDetail)}
                      />
                      {ev.witnessNotes ? <DetailRow label="Notes" value={ev.witnessNotes} full /> : null}
                    </>
                  ) : null}
                </div>
              )}

              {(ev.correctionReason || ev.correctionNotes) && (
                <div className="drawer-section">
                  <div className="drawer-label">Correction</div>
                  {ev.correctionReason && <DetailRow label="Reason" value={ev.correctionReason} />}
                  {ev.correctionNotes && <DetailRow label="Notes" value={ev.correctionNotes} full />}
                </div>
              )}

              {ev.managerReviewNotes && (
                <div className="drawer-section">
                  <div className="drawer-label">Manager review</div>
                  <DetailRow label="Notes" value={ev.managerReviewNotes} full />
                </div>
              )}

              <div className="drawer-section">
                <RecordReviewPanel
                  serviceUserId={serviceUserId}
                  event={ev}
                  onReviewed={() => detailQuery.refetch()}
                />
              </div>

              {onCorrect && (
                <div className="drawer-section">
                  <button type="button" className="mar-record-btn-outline w-full" onClick={onCorrect}>
                    Edit / correct record
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, MapPin, X } from 'lucide-react'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import type { MedicationStatusCodeLookupRow } from '@/features/service-users/types'
import { useCreateMedicationAdministrationEvent } from '@/features/service-users/hooks/useMedicationMarChart'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import { MarStatusCodePicker } from '@/features/service-users/medication/MarStatusCodePicker'
import {
  formatRoundWindow,
  formatTimeSlotDisplay,
  recordContextDetail,
  recordContextTitle,
} from '@/features/service-users/medication/mar-calendar-layout'
import { formatGbDate } from '@/features/service-users/medication/mar-record-utils'
import {
  marChartRowIsPatch,
  marChartRowMayNeedBodyMap,
} from '@/features/service-users/medication/medication-body-map-eligibility'
import { MedicationBodyMapSitePanel } from '@/features/service-users/medication/MedicationBodyMapSitePanel'
import {
  fetchMedicationBodyMapSite,
  patchBodyMapMedicationSiteAdministration,
} from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BodyMapMarAdministrationLink } from '@/features/service-users/body-map/components/BodyMapMarAdministrationLink'
import {
  MAR_LINK_ON_SAVE,
  type MarAdministrationLinkChoice,
} from '@/features/service-users/body-map/utils/mar-administration-event-label'
import './mar-record.css'

export type RecordAdministrationTarget = {
  row: MarChartMedicationRow
  day: number
  date: string
}

const RECORDABLE_CODES = new Set([
  'G', 'PG', 'R', 'N', 'U', 'H', 'A', 'C', 'F', 'I', 'S', 'T', 'O', 'P', 'PCI',
])

function needsReason(code: string, reasonRequirement: string): boolean {
  return reasonRequirement === 'REQUIRED'
}

function scheduledDateTimeIso(date: string, dueTime: string | null): string {
  if (dueTime && /^\d{2}:\d{2}$/.test(dueTime)) {
    return `${date}T${dueTime}:00.000Z`
  }
  return `${date}T12:00:00.000Z`
}

export function RecordAdministrationDialog({
  open,
  onOpenChange,
  serviceUserId,
  target,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  target: RecordAdministrationTarget | null
}) {
  const qc = useQueryClient()
  const lookupsQuery = useMedicationLookups(open)
  const employeesQuery = useEmployees({ page: 1, limit: 100 }, open)
  const createMutation = useCreateMedicationAdministrationEvent(serviceUserId)
  const [marLinkChoice, setMarLinkChoice] = React.useState<MarAdministrationLinkChoice>('')

  const [statusCode, setStatusCode] = React.useState<string | null>(null)
  const [reason, setReason] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [recordingMode, setRecordingMode] = React.useState<'admin' | 'on-behalf'>('on-behalf')
  const [administeredById, setAdministeredById] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setStatusCode(null)
      setReason('')
      setNotes('')
      setRecordingMode('on-behalf')
      setAdministeredById('')
      setMarLinkChoice('')
    }
  }, [open])

  const medIdForSite = target?.row.medicationId
  const siteQuery = useQuery({
    queryKey: [...bodyMapKeys.all, 'med-site', serviceUserId, medIdForSite] as const,
    queryFn: () => fetchMedicationBodyMapSite(serviceUserId, medIdForSite!),
    enabled: open && Boolean(medIdForSite && target?.row && marChartRowMayNeedBodyMap(target.row)),
  })

  React.useEffect(() => {
    if (!open) return
    setMarLinkChoice(prev => {
      if (statusCode === 'G') return prev === '' ? MAR_LINK_ON_SAVE : prev
      return prev === MAR_LINK_ON_SAVE ? '' : prev
    })
  }, [statusCode, open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const employeeOptions = React.useMemo(() => {
    const rows = employeesQuery.data?.rows ?? []
    return rows.map(emp => {
      const name =
        emp.fullName?.trim() ||
        [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() ||
        emp.id
      return { id: emp.id, name }
    })
  }, [employeesQuery.data])

  const statusCodes = React.useMemo(() => {
    const raw: MedicationStatusCodeLookupRow[] = lookupsQuery.data?.statusCodes ?? []
    return raw.filter(sc => RECORDABLE_CODES.has(sc.code))
  }, [lookupsQuery.data])

  const selectedMeta = statusCodes.find(s => s.code === statusCode)

  const handleSave = async () => {
    if (!target || !statusCode) return
    const row = target.row
    const onBehalf = recordingMode === 'on-behalf'
    try {
      const created = await createMutation.mutateAsync({
        serviceUserMedicationId: row.medicationId,
        medicationScheduleId: row.scheduleId ?? undefined,
        statusCode,
        scheduledDateTime: scheduledDateTimeIso(target.date, row.dueTime),
        actualDateTime: new Date().toISOString(),
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        recordOnBehalfOfCarer: onBehalf || undefined,
        administeredById: onBehalf && administeredById ? administeredById : undefined,
      })
      if (marLinkChoice && marChartRowMayNeedBodyMap(row)) {
        try {
          const siteLookup = siteQuery.data ?? (await fetchMedicationBodyMapSite(serviceUserId, row.medicationId))
          const eventToLink =
            marLinkChoice === MAR_LINK_ON_SAVE ? created?.id : marLinkChoice
          if (siteLookup.linked && siteLookup.bodyMapRecordId && eventToLink) {
            await patchBodyMapMedicationSiteAdministration(
              siteLookup.bodyMapRecordId,
              eventToLink,
            )
            void qc.invalidateQueries({ queryKey: bodyMapKeys.all })
          }
        } catch {
          /* site link is best-effort; administration already saved */
        }
      }
      toastSuccess('Administration recorded')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Could not record administration')
    }
  }

  const reasonRequired =
    selectedMeta != null && needsReason(selectedMeta.code, selectedMeta.reasonRequirement)
  const notesRequired = statusCode === 'PG'

  if (!open) return null

  const row = target?.row
  const needsBodyMap = row ? marChartRowMayNeedBodyMap(row) : false
  const isPatchDue = row ? marChartRowIsPatch(row) : false
  const slot = row ? formatTimeSlotDisplay(row) : null
  const window = row ? formatRoundWindow(row) : null
  const dateLabel = target ? formatGbDate(target.date) : ''

  return (
    <div
      className="mar-record-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Record administration"
      onClick={e => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="mar-record-modal">
        <div className="mar-record-modal-header">
          <div>
            <div className="mar-record-modal-type">Record administration</div>
            <div className="mar-record-modal-title">
              {row ? recordContextTitle(row) : 'Medication'}
            </div>
            <div className="mar-record-modal-detail">
              {row && target
                ? recordContextDetail(row, dateLabel)
                : ''}
              {window ? ` · Window ${window}` : ''}
            </div>
          </div>
          <button type="button" className="mar-record-close" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {lookupsQuery.isLoading ? (
          <div className="mar-record-modal-body flex items-center gap-2 text-sm text-[#64748b] dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading status codes…
          </div>
        ) : (
          <div className="mar-record-modal-body">
            {row && needsBodyMap ? (
              <div style={{ marginBottom: 16 }}>
                {isPatchDue ? (
                  <Link
                    to="/service-users/$serviceUserId/body-map"
                    params={{ serviceUserId }}
                    search={{ linkMedicationId: row.medicationId }}
                    className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Open body map for patch change
                  </Link>
                ) : null}
                <MedicationBodyMapSitePanel
                  serviceUserId={serviceUserId}
                  medicationId={row.medicationId}
                  medicationName={row.medicationName}
                />
              </div>
            ) : null}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Status code <span style={{ color: '#dc2626' }}>*</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                All MAR status codes except Pending ({statusCodes.length} options)
              </div>
              <MarStatusCodePicker
                codes={statusCodes}
                value={statusCode}
                onChange={setStatusCode}
              />
            </div>

            <div className="recording-as-panel">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Recording capacity <span style={{ color: '#dc2626' }}>*</span>
              </div>
              <label className="recording-as-option">
                <input
                  type="radio"
                  name="recording-mode"
                  checked={recordingMode === 'admin'}
                  onChange={() => setRecordingMode('admin')}
                />
                <div>
                  <strong>As admin / manager</strong>
                  <span>You administered or witnessed this dose yourself.</span>
                </div>
              </label>
              <label className="recording-as-option">
                <input
                  type="radio"
                  name="recording-mode"
                  checked={recordingMode === 'on-behalf'}
                  onChange={() => setRecordingMode('on-behalf')}
                />
                <div>
                  <strong>On behalf of carer</strong>
                  <span>Entering what a carer reported during their visit.</span>
                </div>
              </label>
              {recordingMode === 'on-behalf' && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                  <label className="block text-xs font-medium text-[#374151] dark:text-slate-300 mb-1.5">
                    Carer who administered <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="mar-record-input w-full"
                    value={administeredById}
                    onChange={e => setAdministeredById(e.target.value)}
                  >
                    <option value="">Select carer…</option>
                    {employeeOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {reasonRequired && (
              <div
                style={{
                  marginBottom: 16,
                  background: '#fef9f0',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
                  Reason <span style={{ color: '#dc2626' }}>*</span> — required for this status
                </div>
                <textarea
                  className="mar-record-textarea"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label className="block text-xs font-medium text-[#374151] dark:text-slate-300 mb-1">
                {notesRequired ? (
                  <>
                    Notes <span style={{ color: '#dc2626' }}>*</span>
                  </>
                ) : (
                  'Notes (optional)'
                )}
              </label>
              <textarea
                className="mar-record-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder={
                  notesRequired
                    ? 'Describe how much was given and what happened…'
                    : 'Any additional observations…'
                }
              />
            </div>

            {slot && (
              <p className="mb-4 text-xs text-[#64748b] dark:text-slate-400">
                Time slot: <strong className="text-[#1e293b] dark:text-slate-100">{slot.label}</strong>
                {slot.time ? ` · ${slot.time}` : ''}
              </p>
            )}

            {needsBodyMap && siteQuery.data?.linked && siteQuery.data.bodyMapRecordId ? (
              <div className="mb-4">
                <BodyMapMarAdministrationLink
                  serviceUserId={serviceUserId}
                  medicationId={row!.medicationId}
                  bodyMapRecordId={siteQuery.data.bodyMapRecordId}
                  linkedEventId={siteQuery.data.medicationSite?.lastAdministrationEventId}
                  linkedEvent={siteQuery.data.medicationSite?.lastAdministrationEvent ?? null}
                  mode="on-record"
                  statusCode={statusCode}
                  recordLinkChoice={marLinkChoice}
                  onRecordLinkChoice={setMarLinkChoice}
                />
              </div>
            ) : null}

            <div className="mar-record-actions">
              <button
                type="button"
                className="mar-record-btn-primary"
                disabled={
                  !statusCode ||
                  createMutation.isPending ||
                  (reasonRequired && !reason.trim()) ||
                  (notesRequired && !notes.trim()) ||
                  (recordingMode === 'on-behalf' && !administeredById)
                }
                onClick={() => void handleSave()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Submit record'
                )}
              </button>
              <button type="button" className="mar-record-btn-outline" onClick={() => onOpenChange(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

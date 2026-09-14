import * as React from 'react'
import { Loader2, CheckCheck, AlertTriangle, ShieldAlert, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { extractApiErrorMessage, toastError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import type { MedicationPackCompartmentRow, MedicationPackRow, MedicationStatusCodeLookupRow } from '@/features/service-users/types'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useMedicationPackMembers } from '@/features/service-users/hooks/useMedicationPackLifecycle'
import { useCreateMedicationAdministrationEvent, useCorrectMedicationEvent, useMedicationRegularChart } from '@/features/service-users/hooks/useMedicationMarChart'
import { scheduleForCompartment } from '@/features/service-users/medication/blister-pack-wizard.utils'
import { MarStatusCodePicker } from '@/features/service-users/medication/MarStatusCodePicker'
import type { StatusPickRow } from '@/features/service-users/medication/mar-record-utils'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import './mar-record.css'

/** Same recordable set as standalone MAR record dialog (excludes Pending / PR display-only). */
const RECORDABLE_CODES = new Set([
  'G', 'PG', 'R', 'N', 'U', 'H', 'A', 'C', 'F', 'I', 'S', 'T', 'O', 'P', 'PCI',
])

function needsReason(code: string, statusCodes: StatusPickRow[]): boolean {
  const row = statusCodes.find(s => s.code === code)
  return row?.reasonRequirement === 'REQUIRED'
}

function scheduledDateTimeIso(date: string, dueTime: string): string {
  return `${date}T${dueTime}:00.000Z`
}

function isAlreadyRecordedError(e: unknown): boolean {
  const msg = extractApiErrorMessage(e, '').toLowerCase()
  return msg.includes('already exists')
}

type RecordLine = {
  memberId: string
  serviceUserMedicationId: string
  medicationScheduleId?: string
  medicationName: string
  strength?: string | null
  dose?: string | null
}

type LineState = { statusCode: string; reason: string }

function todayInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toStatusPickRows(rows: MedicationStatusCodeLookupRow[]): StatusPickRow[] {
  return rows
    .filter(sc => RECORDABLE_CODES.has(sc.code))
    .map(sc => ({
      code: sc.code,
      label: sc.label,
      color: sc.color,
      textColor: sc.textColor,
      reasonRequirement: sc.reasonRequirement,
    }))
}

function chartDayFromDate(dateYmd: string, chartMonth: string): number | null {
  const [y, mo, d] = dateYmd.split('-').map(Number)
  const [cy, cm] = chartMonth.split('-').map(Number)
  if (y !== cy || mo !== cm || d == null) return null
  return d
}

function lineRecordedOnChart(
  line: RecordLine,
  chartRows: MarChartMedicationRow[],
  day: number,
  compartmentDueTime?: string | null,
): MarChartCell | null {
  const row = chartRows.find(r => {
    if (r.medicationId !== line.serviceUserMedicationId) return false
    if (compartmentDueTime && r.dueTime && r.dueTime !== compartmentDueTime) return false
    if (line.medicationScheduleId && r.scheduleId && r.scheduleId !== line.medicationScheduleId) {
      return false
    }
    return true
  })
  const cell = row?.days.find(c => c.day === day)
  if (!cell || cell.cellState !== 'recorded') return null
  return cell
}

function StatusChip({ code, meta }: { code: string; meta?: StatusPickRow }) {
  const color = meta?.color ?? '#64748b'
  const text = meta?.textColor?.trim() || '#FFFFFF'
  const label = meta?.label ?? code
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm">
      <span
        className="inline-flex min-w-[2rem] items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: color, color: text }}
      >
        {code}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

export function PackRecordRoundDialog({
  open,
  onOpenChange,
  serviceUserId,
  pack,
  compartment,
  defaultDate,
  chartMonth,
  chartRows,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  pack: MedicationPackRow
  compartment: MedicationPackCompartmentRow | null
  /** Pre-fill date when opened from MAR calendar (YYYY-MM-DD). */
  defaultDate?: string
  /** Current MAR month (YYYY-MM) — enables on-calendar duplicate detection. */
  chartMonth?: string
  /** Pack MAR rows for the active compartment — used to skip already-recorded slots. */
  chartRows?: MarChartMedicationRow[]
}) {
  const lookupsQuery = useMedicationLookups(open)
  const membersQuery = useMedicationPackMembers(serviceUserId, pack.id, open && compartment != null)
  const createEvent = useCreateMedicationAdministrationEvent(serviceUserId)
  const correctEvent = useCorrectMedicationEvent(serviceUserId)

  const liveChartQuery = useMedicationRegularChart(
    serviceUserId,
    { month: chartMonth ?? '' },
    open && Boolean(chartMonth),
  )

  const effectiveChartRows = React.useMemo(() => {
    if (!compartment) return chartRows
    const live = liveChartQuery.data?.medications?.filter(
      r => r.packName === pack.name && r.dueTime === compartment.dueTime,
    )
    if (live?.length) return live
    return chartRows
  }, [chartRows, compartment, liveChartQuery.data?.medications, pack.name])

  const [date, setDate] = React.useState(todayInput())
  const [lineStates, setLineStates] = React.useState<Record<string, LineState>>({})
  const [pickingMemberId, setPickingMemberId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [correctionReason, setCorrectionReason] = React.useState('')
  const [correctionNotes, setCorrectionNotes] = React.useState('')
  const formResetKey = `${compartment?.id ?? ''}:${date}`
  const lastFormResetKey = React.useRef('')

  const statusCodes = React.useMemo(
    () => toStatusPickRows(lookupsQuery.data?.statusCodes ?? []),
    [lookupsQuery.data],
  )

  React.useEffect(() => {
    if (!open) return
    setDate(defaultDate ?? todayInput())
    setSubmitting(false)
  }, [open, compartment?.id, defaultDate])

  const members = React.useMemo(
    () => (membersQuery.data ?? []).filter(m => m.status === 'ACTIVE'),
    [membersQuery.data],
  )

  const { lines, fallback } = React.useMemo<{ lines: RecordLine[]; fallback: boolean }>(() => {
    if (!compartment) return { lines: [], fallback: false }
    const matched: RecordLine[] = []
    for (const m of members) {
      const med = m.serviceUserMedication
      if (!med) continue
      const sched = scheduleForCompartment(
        (med as { schedules?: Array<{ id?: string; dueTime: string | null; dose?: string | null }> })
          .schedules,
        compartment.dueTime,
      )
      if (sched) {
        matched.push({
          memberId: m.id,
          serviceUserMedicationId: m.serviceUserMedicationId,
          medicationScheduleId: sched.id,
          medicationName: med.medicationName,
          strength: med.strength,
          dose: sched.dose ?? med.dose,
        })
      }
    }
    if (matched.length > 0) return { lines: matched, fallback: false }
    const all: RecordLine[] = members
      .filter(m => m.serviceUserMedication)
      .map(m => ({
        memberId: m.id,
        serviceUserMedicationId: m.serviceUserMedicationId,
        medicationName: m.serviceUserMedication!.medicationName,
        strength: m.serviceUserMedication!.strength,
        dose: m.serviceUserMedication!.dose,
      }))
    return { lines: all, fallback: true }
  }, [members, compartment])

  const chartDay = chartMonth ? chartDayFromDate(date, chartMonth) : null

  const recordedByLine = React.useMemo(() => {
    const map = new Map<string, MarChartCell>()
    if (chartDay == null || !effectiveChartRows?.length) return map
    for (const line of lines) {
      const cell = lineRecordedOnChart(line, effectiveChartRows, chartDay, compartment?.dueTime)
      if (cell) map.set(line.memberId, cell)
    }
    return map
  }, [chartDay, effectiveChartRows, lines, compartment?.dueTime])

  const pendingLines = React.useMemo(
    () => lines.filter(l => !recordedByLine.has(l.memberId)),
    [lines, recordedByLine],
  )

  const alreadyRecordedCount = lines.length - pendingLines.length

  React.useEffect(() => {
    if (!open || lines.length === 0) return
    const fullReset = lastFormResetKey.current !== formResetKey
    if (fullReset) {
      lastFormResetKey.current = formResetKey
      const initial: Record<string, LineState> = {}
      for (const line of lines) {
        const cell = recordedByLine.get(line.memberId)
        initial[line.memberId] = {
          statusCode: cell?.statusCode ?? 'G',
          reason: '',
        }
      }
      setLineStates(initial)
      setCorrectionNotes('')
      setCorrectionReason('')
      setPickingMemberId(null)
      return
    }
    setLineStates(prev => {
      let changed = false
      const next = { ...prev }
      for (const line of lines) {
        if (next[line.memberId]) continue
        const cell = recordedByLine.get(line.memberId)
        next[line.memberId] = { statusCode: cell?.statusCode ?? 'G', reason: '' }
        changed = true
      }
      return changed ? next : prev
    })
  }, [open, formResetKey, lines, recordedByLine])

  const originalStatus = (memberId: string) =>
    recordedByLine.get(memberId)?.statusCode ?? 'G'

  const getState = (memberId: string): LineState =>
    lineStates[memberId] ?? { statusCode: 'G', reason: '' }

  const isLineChanged = (line: RecordLine, s: LineState) =>
    recordedByLine.has(line.memberId) && s.statusCode !== originalStatus(line.memberId)

  const correctionTargets = React.useMemo(
    () =>
      lines.filter(l => {
        const cell = recordedByLine.get(l.memberId)
        return Boolean(cell?.recordId) && getState(l.memberId).statusCode !== (cell?.statusCode ?? 'G')
      }),
    [lines, recordedByLine, lineStates],
  )

  const setState = (memberId: string, patch: Partial<LineState>) =>
    setLineStates(prev => {
      const current = prev[memberId] ?? { statusCode: 'G', reason: '' }
      return {
        ...prev,
        [memberId]: { ...current, ...patch },
      }
    })

  const revertLineToOriginal = (memberId: string) => {
    const original = originalStatus(memberId)
    setState(memberId, { statusCode: original, reason: '' })
    setPickingMemberId(null)
  }

  const markAllGiven = () => {
    const next: Record<string, LineState> = {}
    for (const line of lines) {
      next[line.memberId] = { statusCode: 'G', reason: '' }
    }
    setLineStates(next)
    setPickingMemberId(null)
    void submitRound(next)
  }

  const missingReason = lines.some(l => {
    const s = getState(l.memberId)
    if (!needsReason(s.statusCode, statusCodes)) return false
    const isNew = !recordedByLine.has(l.memberId)
    const isCorrection = isLineChanged(l, s)
    return (isNew || isCorrection) && !s.reason.trim()
  })

  const submitRound = async (statesOverride?: Record<string, LineState>) => {
    if (!compartment || lines.length === 0) {
      toastWarning('Cannot record', 'No medicines are due in this compartment.')
      return
    }
    if (statusCodes.length === 0) {
      toastError('MAR status codes unavailable', 'Check Medication lookups in admin settings.')
      return
    }
    const states = statesOverride ?? lineStates
    const resolveState = (memberId: string): LineState =>
      states[memberId] ?? { statusCode: 'G', reason: '' }

    const needsReasonBlock = lines.some(l => {
      const s = resolveState(l.memberId)
      if (!needsReason(s.statusCode, statusCodes)) return false
      const cell = recordedByLine.get(l.memberId)
      const isNew = !cell?.recordId
      const isCorrection =
        cell != null && cell.recordId != null && s.statusCode !== (cell.statusCode ?? 'G')
      return (isNew || isCorrection) && !s.reason.trim()
    })
    if (needsReasonBlock) {
      toastWarning('Reason required', 'Add a reason for each exception status code before saving.')
      return
    }

    const effectiveCorrectionNotes =
      correctionNotes.trim() || 'Updated during round recording'
    const effectiveCorrectionReason =
      correctionReason.trim() || 'Updated during round recording'

    const applyCorrection = async (line: RecordLine, eventId: string, s: LineState) => {
      await correctEvent.mutateAsync({
        eventId,
        statusCode: s.statusCode,
        correctionReason: effectiveCorrectionReason,
        correctionNotes: effectiveCorrectionNotes,
        reason: needsReason(s.statusCode, statusCodes) ? s.reason.trim() : undefined,
      })
    }

    setSubmitting(true)
    const scheduledDateTime = scheduledDateTimeIso(date, compartment.dueTime)
    const actualDateTime = new Date().toISOString()
    let recorded = 0
    let corrected = 0
    let skipped = 0
    const failures: string[] = []

    try {
      for (const line of lines) {
        const cell = recordedByLine.get(line.memberId)
        const s = resolveState(line.memberId)

        if (cell?.recordId) {
          if (s.statusCode === (cell.statusCode ?? 'G')) {
            skipped++
            continue
          }
          try {
            await applyCorrection(line, cell.recordId, s)
            corrected++
          } catch (e) {
            failures.push(`${line.medicationName}: ${extractApiErrorMessage(e, 'Correction failed')}`)
          }
          continue
        }

        try {
          await createEvent.mutateAsync({
            serviceUserMedicationId: line.serviceUserMedicationId,
            medicationScheduleId: line.medicationScheduleId,
            statusCode: s.statusCode,
            scheduledDateTime,
            actualDateTime,
            doseGiven: s.statusCode === 'G' ? (line.dose ?? undefined) : undefined,
            reason: needsReason(s.statusCode, statusCodes) ? s.reason.trim() : undefined,
          })
          recorded++
        } catch (e) {
          if (isAlreadyRecordedError(e)) {
            const existingCell =
              recordedByLine.get(line.memberId) ??
              (chartDay != null && effectiveChartRows
                ? lineRecordedOnChart(line, effectiveChartRows, chartDay, compartment.dueTime)
                : null)
            if (existingCell?.recordId && s.statusCode !== (existingCell.statusCode ?? 'G')) {
              try {
                await applyCorrection(line, existingCell.recordId, s)
                corrected++
              } catch (ce) {
                failures.push(
                  `${line.medicationName}: ${extractApiErrorMessage(ce, 'Could not update existing record')}`,
                )
              }
            } else {
              skipped++
            }
            continue
          }
          failures.push(`${line.medicationName}: ${extractApiErrorMessage(e, 'Request failed')}`)
        }
      }

      const parts: string[] = []
      if (recorded > 0) parts.push(`${recorded} recorded`)
      if (corrected > 0) parts.push(`${corrected} updated`)
      if (skipped > 0) parts.push(`${skipped} unchanged`)

      if (parts.length > 0 && failures.length === 0) {
        toastSuccess(`${compartment.label}: ${parts.join(' · ')}`)
        onOpenChange(false)
      } else if (parts.length === 0 && skipped >= lines.length) {
        toastWarning(
          'No changes saved',
          failures.length > 0
            ? failures.slice(0, 2).join(' · ')
            : 'Every medicine is already recorded with the selected status codes.',
        )
      } else if (failures.length > 0) {
        toastError('Could not complete the round', failures.slice(0, 3).join(' · '))
        if (parts.length > 0) {
          toastSuccess(`${compartment.label}: ${parts.join(' · ')} (partial)`)
          onOpenChange(false)
        }
      } else {
        toastWarning('Nothing to save', 'Check status codes and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => void submitRound()

  const lookupsReady = !lookupsQuery.isLoading && statusCodes.length > 0

  return (
    <Dialog open={open} onOpenChange={o => !submitting && onOpenChange(o)}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Record {compartment?.label}{' '}
            {compartment && <span className="text-muted-foreground">· {compartment.dueTime}</span>}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                max={todayInput()}
                onChange={e => setDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!lookupsReady || submitting || lines.length === 0}
              onClick={markAllGiven}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all {lines.length > 0 ? lines.length : ''} as given
            </Button>
          </div>

          {compartment?.witnessRequired && (
            <p className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4" />
              This round requires a witness — confirm a second signatory is present.
            </p>
          )}

          {alreadyRecordedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {alreadyRecordedCount} already on the chart — change a status to update it, or leave
              unchanged to skip. New entries are recorded for medicines still due.
            </p>
          )}

          {correctionTargets.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {correctionTargets.length} correction{correctionTargets.length === 1 ? '' : 's'} — audit
                notes
              </p>
              <Input
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                placeholder="Correction reason (optional)"
              />
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={correctionNotes}
                onChange={e => setCorrectionNotes(e.target.value)}
                placeholder="Correction notes (optional — default applied if blank)"
              />
            </div>
          )}

          {fallback && lines.length > 0 && (
            <p className="text-xs text-muted-foreground">
              No schedules align with this time slot, so all pack medicines are shown. Add due times to
              each medicine's schedule for precise compartment grouping.
            </p>
          )}

          {lookupsQuery.isLoading || membersQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !lookupsReady ? (
            <p className="text-sm text-destructive">
              MAR status codes are not configured — check Medication lookups in admin settings.
            </p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines are due in this compartment.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {statusCodes.length} recordable status codes · tap a medicine to change its code
              </p>
              <ul className="space-y-2">
                {lines.map(line => {
                  const s = getState(line.memberId)
                  const meta = statusCodes.find(sc => sc.code === s.statusCode)
                  const reasonRequired = needsReason(s.statusCode, statusCodes)
                  const picking = pickingMemberId === line.memberId
                  const existingCell = recordedByLine.get(line.memberId)
                  const isRecorded = existingCell != null
                  const changed = isLineChanged(line, s)
                  return (
                    <li
                      key={line.memberId}
                      className={cn(
                        'rounded-lg border p-3',
                        changed
                          ? 'border-violet-300 bg-violet-50/40 dark:bg-violet-950/20'
                          : reasonRequired
                            ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
                            : isRecorded
                              ? 'border-border bg-muted/30'
                              : 'border-border',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{line.medicationName}</span>
                          {line.strength && (
                            <span className="ml-2 text-sm text-muted-foreground">{line.strength}</span>
                          )}
                          {line.dose && (
                            <span className="ml-2 text-sm text-muted-foreground">· {line.dose}</span>
                          )}
                          {isRecorded && !changed && (
                            <span className="ml-2 text-xs text-muted-foreground">· recorded</span>
                          )}
                          {changed && (
                            <span className="ml-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                              · will update ({originalStatus(line.memberId)} → {s.statusCode})
                              <button
                                type="button"
                                className="ml-2 underline underline-offset-2 hover:text-violet-900 dark:hover:text-violet-100"
                                onClick={() => revertLineToOriginal(line.memberId)}
                              >
                                undo
                              </button>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 transition-colors hover:bg-muted/60"
                          onClick={() => setPickingMemberId(picking ? null : line.memberId)}
                        >
                          <StatusChip code={s.statusCode} meta={meta} />
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform',
                              picking && 'rotate-180',
                            )}
                          />
                        </button>
                      </div>
                      {picking && (
                        <div className="mt-3 rounded-md border border-border bg-background p-2">
                          {changed && (
                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
                              <span className="text-xs text-muted-foreground">
                                Recorded on chart as{' '}
                                <span className="font-medium text-foreground">
                                  {originalStatus(line.memberId)}
                                </span>
                              </span>
                              <button
                                type="button"
                                className="text-xs font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300"
                                onClick={() => revertLineToOriginal(line.memberId)}
                              >
                                Revert to recorded
                              </button>
                            </div>
                          )}
                          <MarStatusCodePicker
                            codes={statusCodes}
                            value={s.statusCode}
                            onChange={code => {
                              setLineStates(prev => {
                                const current = prev[line.memberId] ?? { statusCode: 'G', reason: '' }
                                return {
                                  ...prev,
                                  [line.memberId]: {
                                    statusCode: code,
                                    reason: needsReason(code, statusCodes) ? current.reason : '',
                                  },
                                }
                              })
                              setPickingMemberId(null)
                            }}
                          />
                        </div>
                      )}
                      {reasonRequired && (
                        <Input
                          className="mt-2"
                          value={s.reason}
                          onChange={e => setState(line.memberId, { reason: e.target.value })}
                          placeholder="Reason (required for this status code)"
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {missingReason && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> A reason is required for each exception status code.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-teal-700 text-white hover:bg-teal-800"
            disabled={submitting || lines.length === 0 || missingReason || !lookupsReady}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {correctionTargets.length > 0 && pendingLines.length === 0
              ? `Update ${correctionTargets.length} medicine(s)`
              : pendingLines.length > 0 && pendingLines.length < lines.length
                ? `Save round (${pendingLines.length} due · ${alreadyRecordedCount} on chart)`
                : `Record ${lines.length} medicine(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

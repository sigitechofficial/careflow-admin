import * as React from 'react'
import { Loader2, X } from 'lucide-react'
import { useCreateMedicationAdministrationEvent } from '@/features/service-users/hooks/useMedicationMarChart'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import { recordContextDetail, recordContextTitle } from '@/features/service-users/medication/mar-calendar-layout'
import { formatGbDate } from '@/features/service-users/medication/mar-record-utils'
import { formatOpsHm } from '@/shared/lib/operational-day.util'
import './mar-record.css'

export type RecordPrnTarget = {
  row: MarChartMedicationRow
  day: number
  date: string
}

export function RecordPrnDialog({
  open,
  onOpenChange,
  serviceUserId,
  target,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  target: RecordPrnTarget | null
}) {
  const createMutation = useCreateMedicationAdministrationEvent(serviceUserId)
  const [doseGiven, setDoseGiven] = React.useState('')
  const [prnReason, setPrnReason] = React.useState('')
  const [prnOutcome, setPrnOutcome] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setDoseGiven('')
      setPrnReason('')
      setPrnOutcome('')
      setNotes('')
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const handleSave = async () => {
    if (!target || !prnReason.trim()) return
    try {
      await createMutation.mutateAsync({
        serviceUserMedicationId: target.row.medicationId,
        statusCode: 'G',
        scheduledDateTime: `${target.date}T12:00:00.000Z`,
        actualDateTime: new Date().toISOString(),
        doseGiven: doseGiven.trim() || undefined,
        isPrn: true,
        prnReason: prnReason.trim(),
        prnOutcome: prnOutcome.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      toastSuccess('PRN administration recorded')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Could not record PRN')
    }
  }

  if (!open) return null

  const row = target?.row
  const dateLabel = target ? formatGbDate(target.date) : ''

  return (
    <div
      className="mar-record-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Log PRN administration"
      onClick={e => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="mar-record-modal">
        <div className="mar-record-modal-header">
          <div>
            <div className="mar-record-modal-type">Log PRN administration</div>
            <div className="mar-record-modal-title">
              {row ? recordContextTitle(row) : 'Medication'}
            </div>
            <div className="mar-record-modal-detail">
              {row && target ? recordContextDetail(row, dateLabel) : ''}
            </div>
          </div>
          <button type="button" className="mar-record-close" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mar-record-prn-bar">
          <strong>PRN — As required.</strong> Log this dose only if you are giving it now.
        </div>

        <div className="mar-record-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Dose given <span className="text-red-600">*</span>
              </label>
              <input
                className="mar-record-input w-full"
                value={doseGiven}
                onChange={e => setDoseGiven(e.target.value)}
                placeholder={row?.dose ?? 'e.g. 400mg'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Time given</label>
              <input
                type="time"
                className="mar-record-input w-full"
                defaultValue={formatOpsHm(new Date().toISOString()) || '00:00'}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Reason for giving <span className="text-red-600">*</span>
            </label>
            <input
              className="mar-record-input w-full"
              value={prnReason}
              onChange={e => setPrnReason(e.target.value)}
              placeholder="e.g. Complained of joint pain"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="block text-xs font-medium text-[#374151] mb-1">Outcome</label>
            <select
              className="mar-record-input w-full"
              value={prnOutcome}
              onChange={e => setPrnOutcome(e.target.value)}
            >
              <option value="">Select…</option>
              <option value="Effective">Effective</option>
              <option value="Partially effective">Partially effective</option>
              <option value="Not effective">Not effective</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="block text-xs font-medium text-[#374151] mb-1">Notes (optional)</label>
            <textarea
              className="mar-record-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="mar-record-actions">
            <button
              type="button"
              className="mar-record-btn-primary"
              disabled={!prnReason.trim() || createMutation.isPending}
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
      </div>
    </div>
  )
}

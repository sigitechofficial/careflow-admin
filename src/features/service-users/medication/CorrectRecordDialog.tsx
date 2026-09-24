import * as React from 'react'
import { Loader2, X } from 'lucide-react'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useCorrectMedicationEvent } from '@/features/service-users/hooks/useMedicationMarChart'
import type { MedicationStatusCodeLookupRow } from '@/features/service-users/types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { MarStatusCodePicker } from '@/features/service-users/medication/MarStatusCodePicker'
import './mar-record.css'

const RECORDABLE = new Set([
  'G', 'R', 'N', 'U', 'H', 'A', 'C', 'F', 'I', 'S', 'T', 'O', 'P', 'PCI',
])

export function CorrectRecordDialog({
  open,
  onOpenChange,
  serviceUserId,
  eventId,
  medicationLabel,
  onCorrected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  eventId: string | null
  medicationLabel: string
  onCorrected?: () => void
}) {
  const lookupsQuery = useMedicationLookups(open)
  const correctMutation = useCorrectMedicationEvent(serviceUserId)
  const [statusCode, setStatusCode] = React.useState<string | null>(null)
  const [correctionReason, setCorrectionReason] = React.useState('')
  const [correctionNotes, setCorrectionNotes] = React.useState('')
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setStatusCode(null)
      setCorrectionReason('')
      setCorrectionNotes('')
      setReason('')
    }
  }, [open])

  const statusCodes = React.useMemo(() => {
    const raw: MedicationStatusCodeLookupRow[] = lookupsQuery.data?.statusCodes ?? []
    return raw.filter(sc => RECORDABLE.has(sc.code))
  }, [lookupsQuery.data])

  const selectedMeta = statusCodes.find(s => s.code === statusCode)
  const reasonRequired = selectedMeta?.reasonRequirement === 'REQUIRED'

  const handleSave = async () => {
    if (!eventId || !statusCode || !correctionNotes.trim()) return
    try {
      await correctMutation.mutateAsync({
        eventId,
        statusCode,
        correctionReason: correctionReason.trim() || 'Correction',
        correctionNotes: correctionNotes.trim(),
        reason: reason.trim() || undefined,
      })
      toastSuccess('Record corrected')
      onOpenChange(false)
      onCorrected?.()
    } catch (err) {
      toastApiError(err, 'Could not correct record')
    }
  }

  if (!open) return null

  return (
    <div
      className="mar-record-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Correct record"
      onClick={e => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="mar-record-modal" style={{ width: 'min(480px, 100%)' }}>
        <div className="mar-record-modal-header">
          <div>
            <div className="mar-record-modal-type" style={{ color: '#dc2626' }}>
              Edit / correct record
            </div>
            <div className="mar-record-modal-title">{medicationLabel}</div>
            <div className="mar-record-modal-detail">
              Original record is preserved in the audit log. Correction notes are mandatory.
            </div>
          </div>
          <button type="button" className="mar-record-close" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mar-record-modal-body">
          {lookupsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-[#64748b] dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <MarStatusCodePicker codes={statusCodes} value={statusCode} onChange={setStatusCode} />
              {reasonRequired && (
                <div style={{ marginTop: 16 }}>
                  <label className="block text-xs font-medium text-[#374151] dark:text-slate-300 mb-1">
                    Reason (required for status)
                  </label>
                  <textarea
                    className="mar-record-textarea"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <label className="block text-xs font-medium text-[#374151] dark:text-slate-300 mb-1">Correction reason</label>
                <textarea
                  className="mar-record-textarea"
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  rows={1}
                  placeholder="e.g. Wrong code selected"
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="block text-xs font-medium text-[#374151] dark:text-slate-300 mb-1">
                  Correction notes (required)
                </label>
                <textarea
                  className="mar-record-textarea"
                  value={correctionNotes}
                  onChange={e => setCorrectionNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
          <div className="mar-record-actions" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="mar-record-btn-primary"
              disabled={
                !statusCode ||
                !correctionNotes.trim() ||
                correctMutation.isPending ||
                (reasonRequired && !reason.trim())
              }
              onClick={() => void handleSave()}
            >
              {correctMutation.isPending ? 'Saving…' : 'Save correction'}
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

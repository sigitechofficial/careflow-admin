import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { incidentKeys } from '@/features/incidents/keys'
import { INCIDENT_INJURY_SEVERITY_OPTIONS, type IncidentInjurySeverity } from '@/features/incidents/types'
import { persistIncidentInjury } from '@/features/incidents/utils/incident-injury-persist'
import { BodyMapCanvas, type PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/**
 * Places an injury on the reusable anatomical body-map canvas, creates a real
 * BodyMapRecord (type INJURY), links it to the incident (BodyMapLink INCIDENT),
 * and records the incident injury with `bodyMapRecordId`.
 */
export function IncidentBodyMapDialog({
  open,
  onOpenChange,
  incidentId,
  serviceUserId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  incidentId: string
  serviceUserId: string
}) {
  const qc = useQueryClient()
  const { data } = useServiceUserBodyMap(serviceUserId, false)
  const [marker, setMarker] = React.useState<PlaceMarkerPayload | null>(null)
  const [injuryType, setInjuryType] = React.useState('')
  const [severity, setSeverity] = React.useState<IncidentInjurySeverity>('MINOR')
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setMarker(null)
      setInjuryType('')
      setSeverity('MINOR')
      setNotes('')
    }
  }, [open])

  async function save() {
    if (!marker || !injuryType.trim()) return
    setSaving(true)
    try {
      await persistIncidentInjury(incidentId, serviceUserId, {
        id: 'body-map',
        injuryType: injuryType.trim(),
        severity,
        notes: notes.trim() || undefined,
        marker,
      })
      toastSuccess('Injury recorded on body map')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'body-map' })
      onOpenChange(false)
    } catch (e) {
      toastApiError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add injury on body map</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tap a body region on the diagram to place the injury, then complete the details.
          </p>
          <div className="rounded-lg border border-border">
            <BodyMapCanvas
              records={data?.records ?? []}
              pendingMarker={marker}
              selectedRecordId={null}
              markMode
              showCleared={false}
              onPlaceMarker={setMarker}
              onSelectRecord={() => {}}
              embedded
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input placeholder="Injury type (e.g. Bruising)" value={injuryType} onChange={(e) => setInjuryType(e.target.value)} />
            <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as IncidentInjurySeverity)}>
              {INCIDENT_INJURY_SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {marker && (
            <p className="text-xs text-muted-foreground">
              Placed on: <span className="font-medium text-foreground">{marker.summaryLabel || marker.bodyPart}</span>
              {marker.side ? ` · ${marker.side}` : ''}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={saving} disabled={!marker || !injuryType.trim()} onClick={save}>
            Save injury
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

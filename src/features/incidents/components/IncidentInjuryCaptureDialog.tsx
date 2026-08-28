import * as React from 'react'
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
import { INCIDENT_INJURY_SEVERITY_OPTIONS, type IncidentInjurySeverity } from '@/features/incidents/types'
import type { PendingIncidentInjury } from '@/features/incidents/utils/incident-injury-persist'
import { BodyMapCanvas, type PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function newLocalId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `inj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}

/**
 * Places an injury on the body-map canvas and collects its details, then hands the result
 * back via `onCapture` WITHOUT persisting — used while raising an incident that does not
 * exist yet. The injury is written on submit via `persistIncidentInjury`.
 */
export function IncidentInjuryCaptureDialog({
  open,
  onOpenChange,
  serviceUserId,
  onCapture,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  serviceUserId: string
  onCapture: (pending: PendingIncidentInjury) => void
}) {
  const { data } = useServiceUserBodyMap(serviceUserId, false)
  const [marker, setMarker] = React.useState<PlaceMarkerPayload | null>(null)
  const [injuryType, setInjuryType] = React.useState('')
  const [severity, setSeverity] = React.useState<IncidentInjurySeverity>('MINOR')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setMarker(null)
      setInjuryType('')
      setSeverity('MINOR')
      setNotes('')
    }
  }, [open])

  function confirm() {
    if (!marker || !injuryType.trim()) return
    onCapture({
      id: newLocalId(),
      injuryType: injuryType.trim(),
      severity,
      notes: notes.trim() || undefined,
      marker,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add injury on body map</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tap a body region on the diagram to place the injury, then complete the details. It will
            be saved with the report when you submit.
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
            <Input
              placeholder="Injury type (e.g. Bruising)"
              value={injuryType}
              onChange={(e) => setInjuryType(e.target.value)}
            />
            <select
              className={selectClass}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentInjurySeverity)}
            >
              {INCIDENT_INJURY_SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!marker || !injuryType.trim()} onClick={confirm}>
            Add injury
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

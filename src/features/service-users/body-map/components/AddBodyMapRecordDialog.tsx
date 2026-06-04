import * as React from 'react'
import { recordTypesFromLookups, type BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import { BodyPartCombobox } from '@/features/service-users/body-map/components/BodyPartCombobox'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import type { BodyMapBodyView, BodyMapRiskLevel } from '@/features/service-users/body-map/types'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'

export type PendingMarker = {
  x: number
  y: number
  bodyView: BodyMapBodyView
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingMarker: PendingMarker | null
  saving: boolean
  onSubmit: (values: {
    recordType: BodyMapRecordTypeCode
    subType: string
    bodyPart: string
    description: string
    riskLevel: BodyMapRiskLevel
    causeSummary: string
    actionSummary: string
    nextReviewAt: string
  }) => void
}

export function AddBodyMapRecordDialog({
  open,
  onOpenChange,
  pendingMarker,
  saving,
  onSubmit,
}: Props) {
  const [recordType, setRecordType] = React.useState<BodyMapRecordTypeCode>('INJURY')
  const [subType, setSubType] = React.useState('')
  const [bodyPart, setBodyPart] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [riskLevel, setRiskLevel] = React.useState<BodyMapRiskLevel>('MEDIUM')
  const [causeSummary, setCauseSummary] = React.useState('')
  const [actionSummary, setActionSummary] = React.useState('')
  const [nextReviewAt, setNextReviewAt] = React.useState('')

  const bodyMapLookupsQuery = useBodyMapLookups(open)
  const recordTypesList = React.useMemo(
    () => recordTypesFromLookups(bodyMapLookupsQuery.data),
    [bodyMapLookupsQuery.data],
  )
  const typeDef = recordTypesList.find(t => t.value === recordType)

  React.useEffect(() => {
    if (!open) return
    setSubType(typeDef?.subTypes[0] ?? '')
  }, [open, recordType, typeDef?.subTypes])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingMarker || !bodyPart.trim()) return
    onSubmit({
      recordType,
      subType,
      bodyPart: bodyPart.trim(),
      description,
      riskLevel,
      causeSummary,
      actionSummary,
      nextReviewAt,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add body map record</DialogTitle>
        </DialogHeader>
        <DialogBody>
        {!pendingMarker ? (
          <p className="text-sm text-muted-foreground">
            Enable mark mode and tap the body diagram to choose a location first.
          </p>
        ) : (
          <form id="body-map-add-form" className="space-y-3" onSubmit={handleSubmit}>
            <p className="rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
              Marker at {pendingMarker.bodyView.toLowerCase()} view —{' '}
              {pendingMarker.x.toFixed(1)}%, {pendingMarker.y.toFixed(1)}%
            </p>
            <label className="block text-sm font-medium">
              Record type
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={recordType}
                onChange={e => setRecordType(e.target.value as BodyMapRecordTypeCode)}
              >
                {recordTypesList.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Sub-type
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subType}
                onChange={e => setSubType(e.target.value)}
              >
                {(typeDef?.subTypes ?? []).map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Body part
              <div className="mt-1">
                <BodyPartCombobox value={bodyPart} onChange={setBodyPart} />
              </div>
            </label>
            <label className="block text-sm font-medium">
              Risk level
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={riskLevel}
                onChange={e => setRiskLevel(e.target.value as BodyMapRiskLevel)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Observation
              <Textarea
                className="mt-1"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What was observed?"
              />
            </label>
            <label className="block text-sm font-medium">
              Cause / explanation
              <Textarea
                className="mt-1"
                rows={2}
                value={causeSummary}
                onChange={e => setCauseSummary(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Action taken
              <Textarea
                className="mt-1"
                rows={2}
                value={actionSummary}
                onChange={e => setActionSummary(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Next review
              <Input
                className="mt-1"
                type="datetime-local"
                value={nextReviewAt}
                onChange={e => setNextReviewAt(e.target.value)}
              />
            </label>
          </form>
        )}
        </DialogBody>
        {pendingMarker ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="body-map-add-form"
              disabled={saving || !bodyPart.trim()}
            >
              {saving ? 'Saving…' : 'Save record'}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

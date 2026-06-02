import * as React from 'react'
import type { BodyMapSafeguardingCheckPayload } from '@/features/service-users/body-map/types'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Textarea } from '@/shared/ui/form-field'

export type SafeguardingChecklistValues = BodyMapSafeguardingCheckPayload

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (values: SafeguardingChecklistValues) => void
}

function YesNoSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="Yes">Yes</option>
        <option value="No">No</option>
        <option value="Unknown">Unknown</option>
      </select>
    </label>
  )
}

export function SafeguardingChecklistDialog({ open, onOpenChange, onComplete }: Props) {
  const [causeKnown, setCauseKnown] = React.useState('No')
  const [explanationConsistent, setExplanationConsistent] = React.useState('Yes')
  const [happenedBefore, setHappenedBefore] = React.useState('No')
  const [immediateRisk, setImmediateRisk] = React.useState('No')
  const [managerInformed, setManagerInformed] = React.useState('Yes')
  const [incidentRequired, setIncidentRequired] = React.useState('Under consideration')
  const [referralRequired, setReferralRequired] = React.useState('Under consideration')
  const [referralReason, setReferralReason] = React.useState('')
  const [managerNotes, setManagerNotes] = React.useState('')

  const handleComplete = () => {
    if (referralRequired === 'No' && !referralReason.trim()) return
    onComplete({
      causeKnown,
      explanationConsistent,
      happenedBefore,
      immediateRisk,
      managerInformed,
      incidentRequired,
      referralRequired,
      referralReason: referralReason.trim() || undefined,
      managerReviewRequired: true,
      managerNotes: managerNotes.trim() || undefined,
      checklistData: {
        completedVia: 'care-admin-wizard',
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Safeguarding checklist</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[65vh] space-y-3 overflow-y-auto">
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Required before this record can be saved. Answers are stored for CQC evidence and manager
            review.
          </p>
          <YesNoSelect label="Is the cause known?" value={causeKnown} onChange={setCauseKnown} />
          <YesNoSelect
            label="Is the explanation consistent with the injury?"
            value={explanationConsistent}
            onChange={setExplanationConsistent}
          />
          <YesNoSelect
            label="Has this happened before?"
            value={happenedBefore}
            onChange={setHappenedBefore}
          />
          <YesNoSelect
            label="Immediate risk to the person?"
            value={immediateRisk}
            onChange={setImmediateRisk}
          />
          <YesNoSelect
            label="Manager informed?"
            value={managerInformed}
            onChange={setManagerInformed}
          />
          <label className="block text-sm font-medium">
            Incident report required?
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={incidentRequired}
              onChange={e => setIncidentRequired(e.target.value)}
            >
              <option>Yes</option>
              <option>No</option>
              <option>Under consideration</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Safeguarding referral required?
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={referralRequired}
              onChange={e => setReferralRequired(e.target.value)}
            >
              <option>Under consideration</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
          {referralRequired === 'No' ? (
            <label className="block text-sm font-medium">
              If no referral, reason (required)
              <Textarea
                className="mt-1"
                rows={2}
                value={referralReason}
                onChange={e => setReferralReason(e.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Manager review notes
            <Textarea
              className="mt-1"
              rows={3}
              value={managerNotes}
              onChange={e => setManagerNotes(e.target.value)}
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={referralRequired === 'No' && !referralReason.trim()}
          >
            Complete & save record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import type { BodyMapWoundAssessment, BodyMapWoundReviewPayload } from '@/features/service-users/body-map/types'

type Props = {
  woundAssessment: BodyMapWoundAssessment | null | undefined
  disabled?: boolean
  onSubmit: (payload: BodyMapWoundReviewPayload) => void
}

export function WoundReviewForm({ woundAssessment, disabled, onSubmit }: Props) {
  const [conditionStatus, setConditionStatus] = React.useState('UNCHANGED')
  const [progressionComparison, setProgressionComparison] = React.useState<
    'BETTER' | 'SAME' | 'WORSE'
  >('SAME')
  const [painChange, setPainChange] = React.useState('')
  const [dressingChanged, setDressingChanged] = React.useState(false)
  const [treatmentFollowed, setTreatmentFollowed] = React.useState(true)
  const [measurements, setMeasurements] = React.useState(woundAssessment?.measurements ?? '')
  const [dressing, setDressing] = React.useState(woundAssessment?.dressing ?? '')
  const [nextDressingChange, setNextDressingChange] = React.useState(
    woundAssessment?.nextDressingChange?.slice(0, 10) ?? '',
  )
  const [reviewNote, setReviewNote] = React.useState('')
  const [nextReviewAt, setNextReviewAt] = React.useState('')
  const [escalationRequired, setEscalationRequired] = React.useState(false)

  React.useEffect(() => {
    setMeasurements(woundAssessment?.measurements ?? '')
    setDressing(woundAssessment?.dressing ?? '')
    setNextDressingChange(woundAssessment?.nextDressingChange?.slice(0, 10) ?? '')
  }, [woundAssessment])

  const handleSubmit = () => {
    onSubmit({
      conditionStatus,
      reviewNote: reviewNote.trim() || undefined,
      nextReviewAt: nextReviewAt ? new Date(nextReviewAt).toISOString() : undefined,
      escalationRequired,
      woundReview: {
        progressionComparison,
        painChange: painChange.trim() || undefined,
        dressingChanged,
        treatmentFollowed,
        measurements: measurements.trim() || undefined,
        dressing: dressing.trim() || undefined,
        nextDressingChange: nextDressingChange
          ? new Date(nextDressingChange).toISOString()
          : undefined,
      },
    })
  }

  const lastProgression =
    typeof woundAssessment?.assessmentData?.lastProgression === 'string'
      ? woundAssessment.assessmentData.lastProgression
      : null

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold text-foreground">Wound review (§7.2)</p>
      {lastProgression ? (
        <p className="text-xs text-muted-foreground">
          Previous review: {lastProgression.toLowerCase()} — compare below
        </p>
      ) : woundAssessment?.woundLifecycleLabel ? (
        <p className="text-xs text-muted-foreground">
          Current lifecycle: {woundAssessment.woundLifecycleLabel}
        </p>
      ) : null}
      <label className="block text-xs font-medium">
        Better, same, or worse
        <select
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={progressionComparison}
          onChange={e =>
            setProgressionComparison(e.target.value as 'BETTER' | 'SAME' | 'WORSE')
          }
        >
          <option value="BETTER">Better</option>
          <option value="SAME">Same</option>
          <option value="WORSE">Worse</option>
        </select>
      </label>
      <label className="block text-xs font-medium">
        Clinical status
        <select
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={conditionStatus}
          onChange={e => setConditionStatus(e.target.value)}
        >
          <option value="IMPROVING">Improving</option>
          <option value="UNCHANGED">Unchanged</option>
          <option value="WORSENING">Worsening</option>
          <option value="RESOLVED">Resolved / healed</option>
        </select>
      </label>
      <label className="block text-xs font-medium">
        Measurements
        <input
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={measurements}
          onChange={e => setMeasurements(e.target.value)}
          placeholder="e.g. 2.1 × 1.4 cm"
        />
      </label>
      <label className="block text-xs font-medium">
        Pain change
        <input
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={painChange}
          onChange={e => setPainChange(e.target.value)}
          placeholder="e.g. reduced, unchanged, increased"
        />
      </label>
      <label className="block text-xs font-medium">
        Dressing
        <input
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={dressing}
          onChange={e => setDressing(e.target.value)}
        />
      </label>
      <label className="block text-xs font-medium">
        Next dressing change
        <input
          type="date"
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={nextDressingChange}
          onChange={e => setNextDressingChange(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={dressingChanged}
            onChange={e => setDressingChanged(e.target.checked)}
          />
          Dressing changed
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={treatmentFollowed}
            onChange={e => setTreatmentFollowed(e.target.checked)}
          />
          Treatment followed
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={escalationRequired}
            onChange={e => setEscalationRequired(e.target.checked)}
          />
          Escalation needed
        </label>
      </div>
      <label className="block text-xs font-medium">
        Next review date
        <input
          type="date"
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={nextReviewAt}
          onChange={e => setNextReviewAt(e.target.value)}
        />
      </label>
      <label className="block text-xs font-medium">
        Review note
        <Textarea
          className="mt-1"
          rows={2}
          value={reviewNote}
          onChange={e => setReviewNote(e.target.value)}
        />
      </label>
      <Button type="button" size="sm" disabled={disabled} onClick={handleSubmit}>
        {disabled ? 'Saving…' : 'Save wound review'}
      </Button>
    </div>
  )
}

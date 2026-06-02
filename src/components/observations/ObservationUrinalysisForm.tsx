import * as React from 'react'
import { Calendar, Pencil } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { CompositeDraft } from '@/features/service-users/observations/observation-payload'
import {
  URINALYSIS_DIPSTICK_OPTIONS,
  URINE_OBSERVATIONS,
  type UrinalysisDipstick,
} from '@/features/service-users/observations/observation-urinalysis-catalog'

const SELECT_NONE = '__none__'

type Props = {
  canSave: boolean
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

export function ObservationUrinalysisForm({
  canSave,
  compositeDraft,
  onCompositeChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const [editingActioned, setEditingActioned] = React.useState(false)
  const dipstick = (compositeDraft.dipstick as UrinalysisDipstick) || 'NOT_TAKEN'

  const actionedDisplay = React.useMemo(() => {
    const d = new Date(recordedAtLocal)
    if (Number.isNaN(d.getTime())) return recordedAtLocal
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
  }, [recordedAtLocal])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-foreground">Actioned:</span>
        {editingActioned ? (
          <div className="flex items-center gap-1">
            <Input
              type="datetime-local"
              value={recordedAtLocal}
              onChange={e => onRecordedAtChange(e.target.value)}
              className="h-8 w-[220px]"
              disabled={!canSave}
            />
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border"
              onClick={() => setEditingActioned(false)}
              title="Done"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span>{actionedDisplay}</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setEditingActioned(true)}
              disabled={!canSave}
              title="Edit actioned date/time"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="space-y-4 border-b border-border pb-6">
        <h3 className="text-sm font-semibold">
          Result of test<span className="text-destructive"> *</span>
        </h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Observation of urine</label>
          <Select
            value={compositeDraft.observationOfUrine?.trim() ? compositeDraft.observationOfUrine : SELECT_NONE}
            onValueChange={v => onCompositeChange('observationOfUrine', v === SELECT_NONE ? '' : v)}
            disabled={!canSave}
          >
            <SelectTrigger className="max-w-lg">
              <SelectValue placeholder="Please select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE}>Please select</SelectItem>
              {URINE_OBSERVATIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {compositeDraft.observationOfUrine === 'OTHER' && (
            <Input
              placeholder="Other observation"
              value={compositeDraft.observationOfUrineOther ?? ''}
              onChange={e => onCompositeChange('observationOfUrineOther', e.target.value)}
              disabled={!canSave}
            />
          )}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Dipstick</span>
          <div className="flex flex-col gap-2">
            {URINALYSIS_DIPSTICK_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 text-sm',
                  !canSave && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="urinalysis-dipstick"
                  className="h-4 w-4 border-destructive text-destructive focus:ring-destructive"
                  checked={dipstick === opt.value}
                  disabled={!canSave}
                  onChange={() => onCompositeChange('dipstick', opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Action taken</label>
          <Textarea
            value={compositeDraft.actionTaken ?? ''}
            onChange={e => onCompositeChange('actionTaken', e.target.value)}
            rows={4}
            disabled={!canSave}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Urine sent for further testing</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Result and Action taken</label>
          <Textarea
            value={compositeDraft.furtherTestingResult ?? ''}
            onChange={e => onCompositeChange('furtherTestingResult', e.target.value)}
            rows={4}
            disabled={!canSave}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Date / Time</label>
          <div className="flex max-w-md">
            <Input
              type="date"
              value={compositeDraft.furtherTestingDate ?? ''}
              onChange={e => onCompositeChange('furtherTestingDate', e.target.value)}
              className="rounded-r-none"
              disabled={!canSave}
              placeholder="Select Date"
            />
            <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-white">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

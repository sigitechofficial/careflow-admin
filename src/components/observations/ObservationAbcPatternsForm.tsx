import * as React from 'react'
import { Calendar, Info, Pencil } from 'lucide-react'
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
import {
  ABC_BEHAVIOUR_TYPES,
  ABC_LOCATIONS,
  ABC_PRESENTATIONS,
  ABC_RISK_LEVELS,
} from '@/features/service-users/observations/observation-abc-catalog'
import type { CompositeDraft } from '@/features/service-users/observations/observation-payload'

const SELECT_NONE = '__none__'

type Props = {
  canSave: boolean
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

function AbcFieldLabel({
  letter,
  rest,
  required,
}: {
  letter: 'A' | 'B' | 'C'
  rest: string
  required?: boolean
}) {
  return (
    <label className="text-sm font-medium leading-snug text-foreground">
      <span className="font-bold text-destructive">{letter}</span>
      {rest}
      {required && <span className="text-destructive"> *</span>}
    </label>
  )
}

export function ObservationAbcPatternsForm({
  canSave,
  compositeDraft,
  onCompositeChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const [editingActioned, setEditingActioned] = React.useState(false)
  const riskLevel = compositeDraft.riskLevel ?? 'LOW'

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
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">This is for recording behaviour patterns.</p>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Location</label>
            <Select
              value={compositeDraft.location?.trim() ? compositeDraft.location : SELECT_NONE}
              onValueChange={v => onCompositeChange('location', v === SELECT_NONE ? '' : v)}
              disabled={!canSave}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>Select Location</SelectItem>
                {ABC_LOCATIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <AbcFieldLabel letter="A" rest="ntecedent – what was the person doing before the incident" required />
            <Textarea
              value={compositeDraft.antecedent ?? ''}
              onChange={e => onCompositeChange('antecedent', e.target.value)}
              rows={4}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <AbcFieldLabel letter="B" rest="ehaviour – what behaviour did they exhibit" required />
            <Textarea
              value={compositeDraft.behaviour ?? compositeDraft.behavior ?? ''}
              onChange={e => onCompositeChange('behaviour', e.target.value)}
              rows={4}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <AbcFieldLabel letter="C" rest="onsequences – how was the situation resolved" required />
            <Textarea
              value={compositeDraft.consequences ?? compositeDraft.consequence ?? ''}
              onChange={e => onCompositeChange('consequences', e.target.value)}
              rows={4}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Action taken<span className="text-destructive"> *</span>
            </label>
            <Textarea
              value={compositeDraft.actionTaken ?? ''}
              onChange={e => onCompositeChange('actionTaken', e.target.value)}
              rows={3}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Risk level</span>
              <Info className="h-4 w-4 text-sky-600" aria-hidden />
            </div>
            <div className="flex flex-wrap gap-2">
              {ABC_RISK_LEVELS.map(level => (
                <button
                  key={level.value}
                  type="button"
                  disabled={!canSave}
                  onClick={() => onCompositeChange('riskLevel', level.value)}
                  className={cn(
                    'min-w-[72px] rounded border px-3 py-1.5 text-xs font-bold tracking-wide transition-opacity',
                    level.className,
                    riskLevel === level.value ? 'ring-2 ring-offset-2 ring-foreground/30' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Behaviour Type</label>
            <Select
              value={compositeDraft.behaviourType?.trim() ? compositeDraft.behaviourType : SELECT_NONE}
              onValueChange={v => onCompositeChange('behaviourType', v === SELECT_NONE ? '' : v)}
              disabled={!canSave}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a behaviour type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>Select a behaviour type</SelectItem>
                {ABC_BEHAVIOUR_TYPES.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">How did the Service User present</label>
            <Select
              value={compositeDraft.presentation?.trim() ? compositeDraft.presentation : SELECT_NONE}
              onValueChange={v => onCompositeChange('presentation', v === SELECT_NONE ? '' : v)}
              disabled={!canSave}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>Select</SelectItem>
                {ABC_PRESENTATIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Other appearance details if required"
              value={compositeDraft.appearanceDetails ?? ''}
              onChange={e => onCompositeChange('appearanceDetails', e.target.value)}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Who else was present</label>
            <Textarea
              value={compositeDraft.othersPresent ?? ''}
              onChange={e => onCompositeChange('othersPresent', e.target.value)}
              rows={3}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">What did the person say at the time of the incident</label>
            <Textarea
              value={compositeDraft.personSaid ?? ''}
              onChange={e => onCompositeChange('personSaid', e.target.value)}
              rows={3}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">How long did the behaviour last</label>
            <Textarea
              value={compositeDraft.behaviourDuration ?? ''}
              onChange={e => onCompositeChange('behaviourDuration', e.target.value)}
              rows={2}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">How long did the situation last?</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                className="w-24"
                value={compositeDraft.situationDurationMinutes ?? ''}
                onChange={e => onCompositeChange('situationDurationMinutes', e.target.value)}
                disabled={!canSave}
              />
              <span className="text-sm text-muted-foreground">Minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

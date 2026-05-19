import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-field'
import { Switch } from '@/components/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CompositeDraft } from '@/lib/observation-payload'
import { INFECTION_TYPES } from '@/lib/observation-infection-catalog'

const SELECT_NONE = '__none__'

type Props = {
  canSave: boolean
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  notes: string
  onNotesChange: (v: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center sm:gap-6">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function YesNoSwitch({
  id,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
      <span
        className={cn(
          'min-w-[2rem] text-sm font-semibold',
          checked ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {checked ? 'YES' : 'NO'}
      </span>
    </div>
  )
}

export function ObservationInfectionForm({
  canSave,
  compositeDraft,
  onCompositeChange,
  notes,
  onNotesChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const bool = (key: string) => compositeDraft[key] === 'true'

  return (
    <div className="max-w-3xl space-y-5">
      <FieldRow label="Infection Type" required>
        <Select
          value={compositeDraft.infectionType?.trim() ? compositeDraft.infectionType : SELECT_NONE}
          onValueChange={v => onCompositeChange('infectionType', v === SELECT_NONE ? '' : v)}
          disabled={!canSave}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Infection Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE}>Select Infection Type</SelectItem>
            {INFECTION_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow label="Start Date" required>
        <div className="flex max-w-md">
          <Input
            type="datetime-local"
            value={recordedAtLocal}
            onChange={e => onRecordedAtChange(e.target.value)}
            className="rounded-r-none"
            disabled={!canSave}
          />
          <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-white">
            <Calendar className="h-4 w-4" />
          </span>
        </div>
      </FieldRow>

      <FieldRow label="The Infection is now cleared">
        <YesNoSwitch
          id="infection-cleared"
          checked={bool('infectionCleared')}
          disabled={!canSave}
          onCheckedChange={v => onCompositeChange('infectionCleared', v ? 'true' : 'false')}
        />
      </FieldRow>

      <FieldRow label="Result in hospitalisation?">
        <YesNoSwitch
          id="infection-hospitalisation"
          checked={bool('hospitalisation')}
          disabled={!canSave}
          onCheckedChange={v => onCompositeChange('hospitalisation', v ? 'true' : 'false')}
        />
      </FieldRow>

      <FieldRow label="Isolation required">
        <YesNoSwitch
          id="infection-isolation"
          checked={bool('isolationRequired')}
          disabled={!canSave}
          onCheckedChange={v => onCompositeChange('isolationRequired', v ? 'true' : 'false')}
        />
      </FieldRow>

      <FieldRow label="Notes">
        <Textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          rows={5}
          disabled={!canSave}
        />
      </FieldRow>
    </div>
  )
}

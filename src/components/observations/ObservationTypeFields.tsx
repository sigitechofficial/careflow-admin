import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ObservationTypeRow } from '@/lib/observations-api'
import { ObservationAbcPatternsForm } from '@/components/observations/ObservationAbcPatternsForm'
import { ObservationSeizureChartForm } from '@/components/observations/ObservationSeizureChartForm'
import { ObservationInfectionForm } from '@/components/observations/ObservationInfectionForm'
import { ObservationNews2Form } from '@/components/observations/ObservationNews2Form'
import { ObservationUrinalysisForm } from '@/components/observations/ObservationUrinalysisForm'
import {
  BP_SITUATION_OPTIONS,
  type CompositeDraft,
  type ObservationFormVariant,
} from '@/lib/observation-payload'

type Props = {
  activeType: ObservationTypeRow
  variant: ObservationFormVariant
  canSave: boolean
  numericValue: string
  onNumericValueChange: (v: string) => void
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  notes: string
  onNotesChange: (v: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

function UnitSuffix({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-sm font-semibold text-white">
      {children}
    </span>
  )
}

function DateTimeField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
  <div className="space-y-4">
    <label className="text-sm font-medium">Date / Time</label>
    <div className="flex max-w-md">
      <Input
        type="datetime-local"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-r-none"
        disabled={disabled}
      />
      <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-white">
        <Calendar className="h-4 w-4" />
      </span>
    </div>
  </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </label>
  )
}

const BOWEL_TYPES = ['NORMAL', 'CONSTIPATED', 'DIARRHOEA', 'NONE', 'OTHER'] as const
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER'] as const
const INTAKE_LEVELS = ['NONE', 'PART', 'MOST', 'ALL'] as const
const POSITIONS = ['SUPINE', 'LEFT', 'RIGHT', 'PRONE', 'SITTING', 'OTHER'] as const
export function ObservationTypeFields({
  activeType,
  variant,
  canSave,
  numericValue,
  onNumericValueChange,
  compositeDraft,
  onCompositeChange,
  notes,
  onNotesChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const unitDisplay =
    activeType.code === 'TEMPERATURE' ? '°C' : activeType.unitLabel ?? ''

  if (variant === 'numeric') {
    return (
      <div className="max-w-xl space-y-4">
        <FieldLabel required>{activeType.name}</FieldLabel>
        <div className="flex max-w-md">
          <Input
            type="number"
            step="any"
            value={numericValue}
            onChange={e => onNumericValueChange(e.target.value)}
            className="rounded-r-none"
            disabled={!canSave}
          />
          {unitDisplay && <UnitSuffix>{unitDisplay}</UnitSuffix>}
        </div>
        <FieldLabel>Notes</FieldLabel>
        <Textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4} disabled={!canSave} />
        <DateTimeField value={recordedAtLocal} onChange={onRecordedAtChange} disabled={!canSave} />
      </div>
    )
  }

  if (variant === 'blood_pressure') {
    return (
      <div className="max-w-xl space-y-4">
        <FieldLabel required>Blood Pressure</FieldLabel>
        <div className="flex max-w-md items-stretch">
          <Input
            type="number"
            placeholder="Systolic"
            value={compositeDraft.systolic ?? ''}
            onChange={e => onCompositeChange('systolic', e.target.value)}
            className="rounded-r-none"
            disabled={!canSave}
          />
          <span className="flex items-center bg-destructive px-2 text-sm font-semibold text-white">/</span>
          <Input
            type="number"
            placeholder="Diastolic"
            value={compositeDraft.diastolic ?? ''}
            onChange={e => onCompositeChange('diastolic', e.target.value)}
            className="rounded-none border-x-0"
            disabled={!canSave}
          />
          <UnitSuffix>mmHg</UnitSuffix>
        </div>

        <FieldLabel required>Situation</FieldLabel>
        <Select
          value={compositeDraft.situation ?? 'NONE_RECORDED'}
          onValueChange={v => onCompositeChange('situation', v)}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="None recorded" />
          </SelectTrigger>
          <SelectContent>
            {BP_SITUATION_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <FieldLabel>Notes</FieldLabel>
        <Textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4} disabled={!canSave} />
        <DateTimeField value={recordedAtLocal} onChange={onRecordedAtChange} disabled={!canSave} />
      </div>
    )
  }

  if (variant === 'fluid_monitor') {
    return (
      <div className="max-w-xl space-y-4">
        <FieldLabel>Fluid Monitor</FieldLabel>
        <div className="flex max-w-lg flex-wrap gap-3">
          <div className="flex min-w-[140px] flex-1">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={compositeDraft.fluidOutMl ?? ''}
              onChange={e => onCompositeChange('fluidOutMl', e.target.value)}
              className="rounded-r-none"
              disabled={!canSave}
            />
            <span className="inline-flex items-center rounded-r-md bg-amber-500 px-3 text-sm font-semibold text-white">
              Out
            </span>
          </div>
          <div className="flex min-w-[140px] flex-1">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={compositeDraft.fluidInMl ?? ''}
              onChange={e => onCompositeChange('fluidInMl', e.target.value)}
              className="rounded-r-none"
              disabled={!canSave}
            />
            <span className="inline-flex items-center rounded-r-md bg-sky-400 px-3 text-sm font-semibold text-white">
              In
            </span>
          </div>
        </div>
        <FieldLabel>Notes</FieldLabel>
        <Textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4} disabled={!canSave} />
        <DateTimeField value={recordedAtLocal} onChange={onRecordedAtChange} disabled={!canSave} />
      </div>
    )
  }

  if (variant === 'falls') {
    return (
      <CompositeSimpleForm
        canSave={canSave}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      >
        <FieldLabel required>Did a fall occur?</FieldLabel>
        <Select
          value={compositeDraft.hadFall ?? 'false'}
          onValueChange={v => onCompositeChange('hadFall', v)}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">No</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
          </SelectContent>
        </Select>
        <FieldLabel>Location / details</FieldLabel>
        <Input
          value={compositeDraft.location ?? ''}
          onChange={e => onCompositeChange('location', e.target.value)}
          disabled={!canSave}
        />
      </CompositeSimpleForm>
    )
  }

  if (variant === 'bowel_movement') {
    return (
      <CompositeSimpleForm
        canSave={canSave}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      >
        <FieldLabel required>Bowel type</FieldLabel>
        <Select
          value={compositeDraft.bowelType ?? 'NORMAL'}
          onValueChange={v => onCompositeChange('bowelType', v)}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOWEL_TYPES.map(t => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase().replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompositeSimpleForm>
    )
  }

  if (variant === 'meals') {
    return (
      <CompositeSimpleForm
        canSave={canSave}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      >
        <FieldLabel required>Meal</FieldLabel>
        <Select
          value={compositeDraft.mealType ?? 'BREAKFAST'}
          onValueChange={v => onCompositeChange('mealType', v)}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_TYPES.map(t => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldLabel required>Intake</FieldLabel>
        <Select
          value={compositeDraft.intakeLevel ?? 'PART'}
          onValueChange={v => onCompositeChange('intakeLevel', v)}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTAKE_LEVELS.map(t => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompositeSimpleForm>
    )
  }

  if (variant === 'repositioning') {
    return (
      <CompositeSimpleForm
        canSave={canSave}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      >
        <FieldLabel required>Position</FieldLabel>
        <Select
          value={compositeDraft.position ?? 'SUPINE'}
          onValueChange={v => onCompositeChange('position', v)}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map(t => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CompositeSimpleForm>
    )
  }

  if (variant === 'abc_patterns') {
    return (
      <ObservationAbcPatternsForm
        canSave={canSave}
        compositeDraft={compositeDraft}
        onCompositeChange={onCompositeChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      />
    )
  }

  if (variant === 'seizure_chart') {
    return (
      <ObservationSeizureChartForm
        canSave={canSave}
        compositeDraft={compositeDraft}
        onCompositeChange={onCompositeChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      />
    )
  }

  if (variant === 'urinalysis') {
    return (
      <ObservationUrinalysisForm
        canSave={canSave}
        compositeDraft={compositeDraft}
        onCompositeChange={onCompositeChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      />
    )
  }

  if (variant === 'news2') {
    return (
      <ObservationNews2Form
        canSave={canSave}
        compositeDraft={compositeDraft}
        onCompositeChange={onCompositeChange}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      />
    )
  }

  if (variant === 'infection') {
    return (
      <ObservationInfectionForm
        canSave={canSave}
        compositeDraft={compositeDraft}
        onCompositeChange={onCompositeChange}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      />
    )
  }

  return null
}

function CompositeSimpleForm({
  children,
  canSave,
  notes,
  onNotesChange,
  recordedAtLocal,
  onRecordedAtChange,
}: {
  children: React.ReactNode
  canSave: boolean
  notes: string
  onNotesChange: (v: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}) {
  return (
    <div className="max-w-xl space-y-4">
      {children}
      <FieldLabel>Notes</FieldLabel>
      <Textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4} disabled={!canSave} />
      <DateTimeField value={recordedAtLocal} onChange={onRecordedAtChange} disabled={!canSave} />
    </div>
  )
}

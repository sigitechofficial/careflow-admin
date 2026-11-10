import * as React from 'react'
import { Calendar } from 'lucide-react'
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
import type { ObservationTypeRow } from '@/features/service-users/types'
import { ObservationAbcPatternsForm } from '@/components/observations/ObservationAbcPatternsForm'
import { ObservationSeizureChartForm } from '@/components/observations/ObservationSeizureChartForm'
import { ObservationInfectionForm } from '@/components/observations/ObservationInfectionForm'
import { ObservationNews2Form } from '@/components/observations/ObservationNews2Form'
import { ObservationUrinalysisForm } from '@/components/observations/ObservationUrinalysisForm'
import {
  BP_SITUATION_OPTIONS,
  type CompositeDraft,
  type ObservationFormVariant,
} from '@/features/service-users/observations/observation-payload'
import {
  joinSleepReasonCodes,
  parseSleepReasonCodes,
  SLEEP_QUALITY_OPTIONS,
  SLEEP_REASON_OPTIONS,
  sleepQualityNeedsReasons,
} from '@/features/service-users/observations/observation-sleep-catalog'
import { ObservationAlignedForm } from '@/components/observations/ObservationAlignedForm'
import { ALIGN_FORMS } from '@/features/service-users/observations/observation-align-catalog'

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
    <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-sm font-semibold text-destructive-foreground">
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
      <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-destructive-foreground">
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
          <span className="flex items-center bg-destructive px-2 text-sm font-semibold text-destructive-foreground">/</span>
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

  if (ALIGN_FORMS[variant]) {
    return (
      <ObservationAlignedForm
        variant={variant}
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

  if (variant === 'sleep') {
    const quality = compositeDraft.quality ?? ''
    const selectedReasons = new Set(parseSleepReasonCodes(compositeDraft.reasons))
    const showReasons = sleepQualityNeedsReasons(quality)
    return (
      <CompositeSimpleForm
        canSave={canSave}
        notes={notes}
        onNotesChange={onNotesChange}
        recordedAtLocal={recordedAtLocal}
        onRecordedAtChange={onRecordedAtChange}
      >
        <p className="text-sm text-muted-foreground">
          How did the person sleep this visit / overnight?
        </p>
        <FieldLabel required>Sleep</FieldLabel>
        <Select
          value={quality || '__none__'}
          onValueChange={v => {
            const next = v === '__none__' ? '' : v
            onCompositeChange('quality', next)
            if (!sleepQualityNeedsReasons(next)) onCompositeChange('reasons', '')
          }}
          disabled={!canSave}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Select sleep" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select sleep</SelectItem>
            {SLEEP_QUALITY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showReasons ? (
          <div className="space-y-2">
            <FieldLabel>Likely reason</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {SLEEP_REASON_OPTIONS.map(o => {
                const on = selectedReasons.has(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={!canSave}
                    onClick={() => {
                      const next = new Set(selectedReasons)
                      if (on) next.delete(o.value)
                      else next.add(o.value)
                      onCompositeChange('reasons', joinSleepReasonCodes([...next]))
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      on
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </CompositeSimpleForm>
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

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CompositeDraft } from '@/lib/observation-payload'
import type { SeizureOption } from '@/lib/observation-seizure-catalog'
import {
  SEIZURE_AFTER,
  SEIZURE_DURING,
  SEIZURE_INTERVENTIONS,
  SEIZURE_PRE_WARNING,
  SEIZURE_TRIGGERS,
} from '@/lib/observation-seizure-catalog'

const SELECT_NONE = '__none__'

type Props = {
  canSave: boolean
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

function SeizureField({
  number,
  label,
  required,
  children,
}: {
  number: number
  label: React.ReactNode
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[2rem_1fr] sm:items-start">
      <span className="pt-2 text-sm font-semibold text-muted-foreground">{number}:</span>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-snug">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        {children}
      </div>
    </div>
  )
}

function SeizureDropdown({
  options,
  value,
  otherValue,
  onValueChange,
  onOtherChange,
  disabled,
}: {
  options: SeizureOption[]
  value: string
  otherValue: string
  onValueChange: (v: string) => void
  onOtherChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <>
      <Select
        value={value?.trim() ? value : SELECT_NONE}
        onValueChange={v => onValueChange(v === SELECT_NONE ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Please select" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={SELECT_NONE}>Please select</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Other"
        value={otherValue}
        onChange={e => onOtherChange(e.target.value)}
        disabled={disabled}
      />
    </>
  )
}

export function ObservationSeizureChartForm({
  canSave,
  compositeDraft,
  onCompositeChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const change = onCompositeChange

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <SeizureField number={1} label="Other Location">
          <Input
            value={compositeDraft.otherLocation ?? ''}
            onChange={e => change('otherLocation', e.target.value)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={2} label="Description (or type, if known) of seizure" required>
          <Textarea
            value={compositeDraft.description ?? ''}
            onChange={e => change('description', e.target.value)}
            rows={4}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={4} label="Any warning / aura / behaviour pre-seizure">
          <SeizureDropdown
            options={SEIZURE_PRE_WARNING}
            value={compositeDraft.preSeizure ?? ''}
            otherValue={compositeDraft.preSeizureOther ?? ''}
            onValueChange={v => change('preSeizure', v)}
            onOtherChange={v => change('preSeizureOther', v)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={6} label="What happened during the seizure">
          <SeizureDropdown
            options={SEIZURE_DURING}
            value={compositeDraft.during ?? ''}
            otherValue={compositeDraft.duringOther ?? ''}
            onValueChange={v => change('during', v)}
            onOtherChange={v => change('duringOther', v)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={8} label="What happened after the seizure">
          <SeizureDropdown
            options={SEIZURE_AFTER}
            value={compositeDraft.after ?? ''}
            otherValue={compositeDraft.afterOther ?? ''}
            onValueChange={v => change('after', v)}
            onOtherChange={v => change('afterOther', v)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={10} label="Staff interventions including medication">
          <SeizureDropdown
            options={SEIZURE_INTERVENTIONS}
            value={compositeDraft.interventions ?? ''}
            otherValue={compositeDraft.interventionsOther ?? ''}
            onValueChange={v => change('interventions', v)}
            onOtherChange={v => change('interventionsOther', v)}
            disabled={!canSave}
          />
        </SeizureField>
      </div>

      <div className="space-y-5">
        <SeizureField number={3} label="Possible triggers">
          <SeizureDropdown
            options={SEIZURE_TRIGGERS}
            value={compositeDraft.triggers ?? ''}
            otherValue={compositeDraft.triggersOther ?? ''}
            onValueChange={v => change('triggers', v)}
            onOtherChange={v => change('triggersOther', v)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={5} label="How service user felt (if able to communicate)">
          <Input
            value={compositeDraft.feltIfAble ?? ''}
            onChange={e => change('feltIfAble', e.target.value)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={7} label="Length of seizure">
          <Input
            value={compositeDraft.lengthOfSeizure ?? ''}
            onChange={e => change('lengthOfSeizure', e.target.value)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={9} label="Recovery period">
          <Input
            value={compositeDraft.recoveryPeriod ?? ''}
            onChange={e => change('recoveryPeriod', e.target.value)}
            disabled={!canSave}
          />
        </SeizureField>

        <SeizureField number={11} label="Action taken (and any further comments)">
          <Textarea
            value={compositeDraft.actionTaken ?? ''}
            onChange={e => change('actionTaken', e.target.value)}
            rows={4}
            disabled={!canSave}
          />
        </SeizureField>
      </div>

      <div className="space-y-1.5 lg:col-span-2">
        <label className="text-sm font-medium">Date / Time</label>
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
      </div>
    </div>
  )
}

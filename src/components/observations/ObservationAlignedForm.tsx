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
import type { CompositeDraft } from '@/features/service-users/observations/observation-payload'
import {
  ALIGN_FORMS,
  isAlignFieldVisible,
  joinAlignCsv,
  parseAlignCsv,
  type AlignFormDef,
} from '@/features/service-users/observations/observation-align-catalog'

type Props = {
  variant: string
  canSave: boolean
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  notes: string
  onNotesChange: (v: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

export function ObservationAlignedForm({
  variant,
  canSave,
  compositeDraft,
  onCompositeChange,
  notes,
  onNotesChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const def: AlignFormDef | undefined = ALIGN_FORMS[variant]
  if (!def) return null

  return (
    <div className="max-w-xl space-y-4">
      {def.hint ? <p className="text-sm text-muted-foreground">{def.hint}</p> : null}
      {def.fields.map(field => {
        if (!isAlignFieldVisible(field, compositeDraft)) return null
        if (field.kind === 'hint') {
          return (
            <p key={field.key} className="text-sm text-muted-foreground">
              {field.hint ?? field.label}
            </p>
          )
        }
        if (field.kind === 'number') {
          return (
            <div key={field.key} className="space-y-1">
              <label className="text-sm font-medium">
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </label>
              <Input
                type="number"
                min={0}
                value={compositeDraft[field.key] ?? ''}
                onChange={e => onCompositeChange(field.key, e.target.value)}
                disabled={!canSave}
                className="max-w-xs"
              />
            </div>
          )
        }
        if (field.kind === 'multi') {
          const selected = new Set(parseAlignCsv(compositeDraft[field.key]))
          return (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </label>
              <div className="flex flex-wrap gap-2">
                {(field.options ?? []).map(o => {
                  const on = selected.has(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      disabled={!canSave}
                      onClick={() => {
                        const next = new Set(selected)
                        if (on) next.delete(o.value)
                        else next.add(o.value)
                        onCompositeChange(field.key, joinAlignCsv([...next]))
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
          )
        }
        const value = compositeDraft[field.key] ?? ''
        return (
          <div key={field.key} className="space-y-1">
            <label className="text-sm font-medium">
              {field.label}
              {field.required ? <span className="text-destructive"> *</span> : null}
            </label>
            <Select
              value={value || '__none__'}
              onValueChange={v => onCompositeChange(field.key, v === '__none__' ? '' : v)}
              disabled={!canSave}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select {field.label.toLowerCase()}</SelectItem>
                {(field.options ?? []).map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
      <label className="text-sm font-medium">Notes</label>
      <Textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4} disabled={!canSave} />
      <label className="text-sm font-medium">Date / Time</label>
      <div className="flex max-w-md">
        <Input
          type="datetime-local"
          value={recordedAtLocal}
          onChange={e => onRecordedAtChange(e.target.value)}
          className="rounded-r-none"
          disabled={!canSave}
        />
        <span className="inline-flex items-center rounded-r-md bg-destructive px-3 text-destructive-foreground">
          <Calendar className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}

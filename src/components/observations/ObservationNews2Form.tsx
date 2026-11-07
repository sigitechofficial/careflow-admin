import * as React from 'react'
import {
  Activity,
  Calendar,
  Heart,
  Info,
  Pencil,
  Thermometer,
  User,
  Wind,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import type { CompositeDraft } from '@/features/service-users/observations/observation-payload'
import { calculateNews2Score } from '@/features/service-users/observations/news2-score'
import {
  NEWS2_ACVPU,
  NEWS2_AIR_OXYGEN,
  type News2Acvpu,
  type News2AirOrOxygen,
} from '@/features/service-users/observations/observation-news2-catalog'

type Props = {
  canSave: boolean
  compositeDraft: CompositeDraft
  onCompositeChange: (key: string, value: string) => void
  notes: string
  onNotesChange: (v: string) => void
  recordedAtLocal: string
  onRecordedAtChange: (v: string) => void
}

function UnitSuffix({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-r-md bg-destructive px-3 text-sm font-semibold text-destructive-foreground">
      {children}
    </span>
  )
}

function VitalsRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex w-10 shrink-0 items-start justify-center pt-2 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function ObservationNews2Form({
  canSave,
  compositeDraft,
  onCompositeChange,
  notes,
  onNotesChange,
  recordedAtLocal,
  onRecordedAtChange,
}: Props) {
  const [editingActioned, setEditingActioned] = React.useState(false)
  const consciousness = (compositeDraft.consciousness as News2Acvpu) || ''
  const airOrOxygen = (compositeDraft.airOrOxygen as News2AirOrOxygen) || 'AIR'

  const liveScore = React.useMemo(() => {
    const payload = {
      respirationRate: compositeDraft.respirationRate ? Number(compositeDraft.respirationRate) : undefined,
      oxygenSaturation: compositeDraft.oxygenSaturation
        ? Number(compositeDraft.oxygenSaturation)
        : undefined,
      oxygenSaturationScale: 1,
      airOrOxygen,
      systolic: compositeDraft.systolic ? Number(compositeDraft.systolic) : undefined,
      diastolic: compositeDraft.diastolic ? Number(compositeDraft.diastolic) : undefined,
      pulse: compositeDraft.pulse ? Number(compositeDraft.pulse) : undefined,
      consciousness: consciousness || undefined,
      temperature: compositeDraft.temperature ? Number(compositeDraft.temperature) : undefined,
    }
    return calculateNews2Score(payload)
  }, [compositeDraft, airOrOxygen, consciousness])

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
    <div className="max-w-2xl space-y-5">
      {liveScore != null && (
        <p className="text-sm font-medium text-muted-foreground">
          Current NEWS2 score:{' '}
          <span className="text-lg font-bold text-foreground">{liveScore}</span>
        </p>
      )}

      <VitalsRow icon={<Wind className="h-6 w-6" aria-hidden />}>
        <div className="flex max-w-md">
          <Input
            type="number"
            min={0}
            step={1}
            value={compositeDraft.respirationRate ?? ''}
            onChange={e => onCompositeChange('respirationRate', e.target.value)}
            className="rounded-r-none"
            disabled={!canSave}
          />
          <UnitSuffix>rpm</UnitSuffix>
        </div>
      </VitalsRow>

      <VitalsRow icon={<span className="text-lg font-bold">O₂</span>}>
        <div className="space-y-2">
          <div className="flex max-w-md">
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={compositeDraft.oxygenSaturation ?? ''}
              onChange={e => onCompositeChange('oxygenSaturation', e.target.value)}
              className="rounded-r-none"
              disabled={!canSave}
            />
            <UnitSuffix>% Scale 1</UnitSuffix>
          </div>
          <div className="flex gap-2">
            {NEWS2_AIR_OXYGEN.map(opt => {
              const selected = airOrOxygen === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!canSave}
                  onClick={() => onCompositeChange('airOrOxygen', opt.value)}
                  className={cn(
                    'rounded-md border px-6 py-1.5 text-sm font-medium transition-colors',
                    selected && opt.value === 'AIR' && 'border-emerald-600 bg-emerald-100 text-emerald-900',
                    selected && opt.value === 'OXYGEN' && 'border-sky-600 bg-sky-600 text-white',
                    !selected && 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </VitalsRow>

      <VitalsRow icon={<Activity className="h-6 w-6" aria-hidden />}>
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
      </VitalsRow>

      <VitalsRow icon={<Heart className="h-6 w-6" aria-hidden />}>
        <div className="flex max-w-md">
          <Input
            type="number"
            min={0}
            step={1}
            value={compositeDraft.pulse ?? ''}
            onChange={e => onCompositeChange('pulse', e.target.value)}
            className="rounded-r-none"
            disabled={!canSave}
          />
          <UnitSuffix>bpm</UnitSuffix>
        </div>
      </VitalsRow>

      <VitalsRow icon={<User className="h-6 w-6" aria-hidden />}>
        <div className="flex flex-wrap items-center gap-2">
          {NEWS2_ACVPU.map(opt => {
            const selected = consciousness === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.title}
                disabled={!canSave}
                onClick={() => onCompositeChange('consciousness', opt.value)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-opacity',
                  opt.className,
                  selected ? 'ring-2 ring-offset-2 ring-foreground' : 'opacity-50 hover:opacity-80',
                )}
                aria-label={opt.title}
              >
                {opt.label}
              </button>
            )
          })}
          <span
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
            title="Alert, Confusion, Voice, Pain, Unresponsive (ACVPU)"
          >
            <Info className="h-4 w-4" />
          </span>
        </div>
      </VitalsRow>

      <VitalsRow icon={<Thermometer className="h-6 w-6" aria-hidden />}>
        <div className="flex max-w-md">
          <Input
            type="number"
            step={0.1}
            value={compositeDraft.temperature ?? ''}
            onChange={e => onCompositeChange('temperature', e.target.value)}
            className="rounded-r-none"
            disabled={!canSave}
          />
          <UnitSuffix>°C</UnitSuffix>
        </div>
      </VitalsRow>

      <Textarea
        value={notes}
        onChange={e => onNotesChange(e.target.value)}
        rows={4}
        disabled={!canSave}
        placeholder="Record notes/action taken (including O2 flow rate [L/min] and how delivered)"
      />

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
    </div>
  )
}

import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  CUSTOM_ROUND_VALUE,
  findMedicationRound,
  formatRoundLabel,
  matchRoundIdByTime,
  normalizeDueTimeHm,
  sortMedicationRounds,
  type MedicationRoundLookup,
  type MedicationTimeSlot,
} from '@/features/service-users/medication/medication-time-slots'

type Props = {
  slot: MedicationTimeSlot
  index: number
  rounds: MedicationRoundLookup[]
  usedRoundIds: Set<string>
  disabled?: boolean
  dosePlaceholder?: string
  canRemove: boolean
  onChange: (patch: Partial<MedicationTimeSlot>) => void
  onRemove: () => void
}

function roundSelectValue(slot: MedicationTimeSlot): string {
  if (slot.roundId) return slot.roundId
  return CUSTOM_ROUND_VALUE
}

export function MedicationTimeSlotRow({
  slot,
  index,
  rounds,
  usedRoundIds,
  disabled,
  dosePlaceholder,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  const sortedRounds = React.useMemo(() => sortMedicationRounds(rounds), [rounds])
  const selectValue = roundSelectValue(slot)

  const onRoundChange = (value: string) => {
    if (value === CUSTOM_ROUND_VALUE) {
      onChange({ roundId: undefined, roundName: undefined })
      return
    }
    const round = findMedicationRound(rounds, value)
    if (!round) return
    onChange({
      roundId: round.id,
      roundName: round.name,
      dueTime: normalizeDueTimeHm(round.time) ?? slot.dueTime,
    })
  }

  const onDueTimeChange = (dueTime: string) => {
    const roundId = matchRoundIdByTime(rounds, dueTime)
    const round = findMedicationRound(rounds, roundId)
    onChange({
      dueTime,
      roundId: round?.id,
      roundName: round?.name ?? (roundId ? slot.roundName : undefined),
    })
  }

  return (
    <li className="flex flex-wrap items-end gap-2">
      <div className="min-w-[10rem] flex-1 space-y-1">
        {index === 0 && <label className="text-xs text-muted-foreground">Time slot</label>}
        <Select value={selectValue} onValueChange={onRoundChange} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select time slot" />
          </SelectTrigger>
          <SelectContent>
            {sortedRounds.map(round => {
              const taken = usedRoundIds.has(round.id) && round.id !== slot.roundId
              return (
                <SelectItem key={round.id} value={round.id} disabled={taken}>
                  {formatRoundLabel(round.name)}
                  {round.time ? ` (${normalizeDueTimeHm(round.time)})` : ''}
                  {taken ? ' — already added' : ''}
                </SelectItem>
              )
            })}
            <SelectItem value={CUSTOM_ROUND_VALUE}>Custom time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[8rem] flex-1 space-y-1">
        {index === 0 && <label className="text-xs text-muted-foreground">Due time</label>}
        <Input
          type="time"
          value={slot.dueTime}
          onChange={e => onDueTimeChange(e.target.value)}
          disabled={disabled}
          className="[&::-webkit-calendar-picker-indicator]:opacity-100"
        />
      </div>
      <div className="min-w-[7rem] flex-1 space-y-1">
        {index === 0 && <label className="text-xs text-muted-foreground">Dose at this time</label>}
        <Input
          value={slot.dose}
          onChange={e => onChange({ dose: e.target.value })}
          placeholder={dosePlaceholder || 'No of tablets'}
          disabled={disabled}
        />
      </div>
      <div className="min-w-[12rem] flex-[2] space-y-1">
        {index === 0 && <label className="text-xs text-muted-foreground">Care plan action</label>}
        <Input
          value={slot.carePlanAction}
          onChange={e => onChange({ carePlanAction: e.target.value })}
          placeholder="Select Care Plan Action"
          disabled={disabled}
        />
      </div>
      <div className="pb-0.5">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          disabled={disabled || !canRemove}
          aria-label="Remove time"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}

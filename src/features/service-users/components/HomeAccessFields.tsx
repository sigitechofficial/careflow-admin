import * as React from 'react'
import {
  HOME_ACCESS_METHODS,
  homeAccessNotesCopy,
  showsKeySafeFields,
} from '@/features/service-users/home-access'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

export type HomeAccessFieldValues = {
  accessMethod: string
  keySafeLocation: string
  keySafeNumber: string
  accessInstructions: string
}

type Props = {
  value: HomeAccessFieldValues
  onChange: (patch: Partial<HomeAccessFieldValues>) => void
  disabled?: boolean
}

export function HomeAccessFields({ value, onChange, disabled }: Props) {
  const method = value.accessMethod.trim()
  const isPrimaryKeySafe = showsKeySafeFields(method)
  const hasKeySafeData = Boolean(value.keySafeLocation.trim() || value.keySafeNumber.trim())
  const [backupOn, setBackupOn] = React.useState(hasKeySafeData && !isPrimaryKeySafe)
  const notes = homeAccessNotesCopy(method)
  const showNotes = Boolean(method)
  const showBackupToggle = Boolean(method) && !isPrimaryKeySafe
  const showKeySafe = isPrimaryKeySafe || (showBackupToggle && backupOn)

  React.useEffect(() => {
    if (!isPrimaryKeySafe && hasKeySafeData) setBackupOn(true)
  }, [isPrimaryKeySafe, hasKeySafeData])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1">
        <label className="text-sm font-medium">Access method</label>
        <p className="text-xs text-muted-foreground">How carers usually enter for scheduled visits.</p>
        <Select
          value={value.accessMethod ? value.accessMethod : '__none__'}
          onValueChange={next => {
            const accessMethod = next === '__none__' ? '' : next
            onChange({ accessMethod })
            if (showsKeySafeFields(accessMethod)) {
              setBackupOn(false)
            } else if (hasKeySafeData) {
              setBackupOn(true)
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" disabled={disabled}>
            <SelectValue placeholder="How carers enter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— None —</SelectItem>
            {HOME_ACCESS_METHODS.map(row => (
              <SelectItem key={row.value} value={row.value}>
                {row.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showBackupToggle ? (
        <label className="flex items-start gap-2 self-end rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={backupOn}
            disabled={disabled}
            onChange={e => {
              const checked = e.target.checked
              setBackupOn(checked)
              if (!checked) onChange({ keySafeLocation: '', keySafeNumber: '' })
            }}
          />
          <span>
            <span className="font-medium">Also has a key safe</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Backup if the usual way in is not possible.
            </span>
          </span>
        </label>
      ) : (
        <div className="hidden md:block" />
      )}

      {showKeySafe ? (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {isPrimaryKeySafe ? 'Key safe location' : 'Backup key safe location'}
            </label>
            <p className="text-xs text-muted-foreground">Where it is fitted — not the code.</p>
            <Input
              value={value.keySafeLocation}
              onChange={e => onChange({ keySafeLocation: e.target.value })}
              disabled={disabled}
              placeholder="e.g. Left of the front door, behind the hanging basket"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {isPrimaryKeySafe ? 'Key safe code' : 'Backup key safe code'}
            </label>
            <p className="text-xs text-muted-foreground">Only staff who need it for safe access should see this.</p>
            <Input
              value={value.keySafeNumber}
              onChange={e => onChange({ keySafeNumber: e.target.value })}
              disabled={disabled}
              placeholder="e.g. 4821"
            />
          </div>
        </>
      ) : null}

      {showNotes ? (
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">{notes.label}</label>
          <p className="text-xs text-muted-foreground">{notes.hint}</p>
          <textarea
            rows={2}
            className={cn(
              'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            value={value.accessInstructions}
            onChange={e => onChange({ accessInstructions: e.target.value })}
            disabled={disabled}
            placeholder={notes.placeholder}
          />
        </div>
      ) : null}
    </div>
  )
}

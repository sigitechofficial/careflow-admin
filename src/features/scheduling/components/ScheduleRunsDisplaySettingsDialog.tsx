import * as React from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES,
  SCHEDULE_RUNS_DISPLAY_LABEL_OPTIONS,
  type ScheduleRunsDisplayLabelKey,
  type ScheduleRunsDisplayPreferences,
  type ScheduleRunsNameFormat,
} from '@/features/scheduling/utils/schedule-runs-display-preferences.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preferences: ScheduleRunsDisplayPreferences
  onSave: (preferences: ScheduleRunsDisplayPreferences) => void
  onReset: () => void
}

export function ScheduleRunsDisplaySettingsDialog({
  open,
  onOpenChange,
  preferences,
  onSave,
  onReset,
}: Props) {
  const [draft, setDraft] = React.useState(preferences)

  React.useEffect(() => {
    if (open) setDraft(preferences)
  }, [open, preferences])

  function toggleLabel(key: ScheduleRunsDisplayLabelKey, checked: boolean) {
    setDraft((d) => ({
      ...d,
      labels: { ...d.labels, [key]: checked },
    }))
  }

  function handleSave() {
    onSave(draft)
    onOpenChange(false)
  }

  function handleReset() {
    const defaults = {
      ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES,
      labels: { ...DEFAULT_SCHEDULE_RUNS_DISPLAY_PREFERENCES.labels },
    }
    setDraft(defaults)
    onReset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Run display settings</DialogTitle>
          <DialogDescription>
            Choose what appears on visit rows in runs and on run visits on the rota board.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Show labels</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCHEDULE_RUNS_DISPLAY_LABEL_OPTIONS.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.labels[key]}
                    onCheckedChange={(v) => toggleLabel(key, v === true)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Labels that have no data for a visit are omitted. All selected data remains available in
              the visit tooltip.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="runs-name-format">Name format</Label>
              <Select
                value={draft.nameFormat}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, nameFormat: v as ScheduleRunsNameFormat }))
                }
              >
                <SelectTrigger id="runs-name-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full name</SelectItem>
                  <SelectItem value="first-last-initial">First name + last initial</SelectItem>
                  <SelectItem value="last-first">Last, first</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How client names appear on run visits.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="runs-lines-of-data">Lines of data</Label>
              <Select
                value={String(draft.linesOfData)}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    linesOfData: (Number(v) === 2 ? 2 : Number(v) === 3 ? 3 : 1) as 1 | 2 | 3,
                  }))
                }
              >
                <SelectTrigger id="runs-lines-of-data">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Spread selected labels across multiple lines within each visit.
              </p>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Appointment labels</h3>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={draft.showDoubleUpIcon}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, showDoubleUpIcon: v === true }))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Show double up icon</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Show an icon on visits that need more than one carer.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={draft.showTravelMethodIcons}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, showTravelMethodIcons: v === true }))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Show travel method icons</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Show a car icon on visits that are part of a run.
                  </span>
                </span>
              </label>
            </div>
          </section>
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset defaults
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ScheduleRunsDisplaySettingsButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button type="button" size="sm" variant="outline" className="h-8" onClick={onClick}>
      <Settings2 className="mr-1.5 h-3.5 w-3.5" />
      Display
    </Button>
  )
}

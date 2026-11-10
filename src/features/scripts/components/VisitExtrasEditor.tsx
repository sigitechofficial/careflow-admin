import * as React from 'react'
import { ChevronDown, ChevronRight, ClipboardList, Pill, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect } from '@/shared/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useScriptTaskOptions } from '@/features/scripts/hooks'
import { MEDICINE_DATASET, datasetMedicineLabel } from '@/features/scripts/medicine-dataset'

export type TaskPriority = 'routine' | 'important' | 'critical'
/** A task from the task list, done on this visit. */
export type VisitTaskDraft = { name: string; priority: TaskPriority; instructions: string }
/** A medicine given on this visit: Regular at a time within the visit, or PRN (when needed). */
export type VisitMedicineDraft = {
  id: number
  name: string
  dose: string
  route: string
  kind: 'REGULAR' | 'PRN'
  time: string
  instructions: string
}

let nextMedicineId = 1
export const newMedicine = (visitStart: string): VisitMedicineDraft => ({
  id: nextMedicineId++,
  name: '',
  dose: '',
  route: 'ORAL',
  kind: 'REGULAR',
  time: visitStart,
  instructions: '',
})

const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: 'routine', label: 'Routine' },
  { value: 'important', label: 'Important' },
  { value: 'critical', label: 'Critical' },
]

/** A medicine time inside the visit (an overnight visit runs past midnight). */
export function medicineTimeInVisit(time: string, start: string, end: string): boolean {
  return end > start ? time >= start && time <= end : time >= start || time <= end
}

/**
 * Optional tasks and medicines for one visit row of Custom Visit Creation. Closed by default;
 * a visit without any keeps the service user's own tasks and medicines.
 */
export function VisitExtrasEditor({
  label,
  visitStart,
  visitEnd,
  tasks,
  medicines,
  autoMedicines,
  autoTasks,
  open,
  disabled,
  onToggle,
  onTasksChange,
  onMedicinesChange,
  onAutoMedicinesChange,
  onAutoTasksChange,
}: {
  /** How many everyday tasks the run picks for the round, for each service user (0 = none). */
  autoTasks: number
  onAutoTasksChange: (count: number) => void
  label: string
  visitStart: string
  visitEnd: string
  tasks: VisitTaskDraft[]
  medicines: VisitMedicineDraft[]
  /** How many medicines the run picks from the built-in list, for each service user (0 = none). */
  autoMedicines: number
  open: boolean
  disabled: boolean
  onToggle: () => void
  onTasksChange: (tasks: VisitTaskDraft[]) => void
  onMedicinesChange: (medicines: VisitMedicineDraft[]) => void
  onAutoMedicinesChange: (count: number) => void
}) {
  const taskOptions = useScriptTaskOptions()
  const lookups = useMedicationLookups(open)
  const routes = lookups.data?.routes ?? []
  const count = tasks.length + medicines.length + autoMedicines + autoTasks
  const fromDataset = (id: number, index: string) => {
    const d = MEDICINE_DATASET[Number(index)]
    if (d) setMedicine(id, { name: d.name, dose: d.dose, route: d.route, kind: d.kind, instructions: [d.form, d.instructions].filter(Boolean).join(' — ') })
  }

  const pickTasks = (names: string[]) =>
    onTasksChange(names.map((name) => tasks.find((t) => t.name === name) ?? { name, priority: 'routine', instructions: '' }))
  const setTask = (name: string, patch: Partial<VisitTaskDraft>) =>
    onTasksChange(tasks.map((t) => (t.name === name ? { ...t, ...patch } : t)))
  const setMedicine = (id: number, patch: Partial<VisitMedicineDraft>) =>
    onMedicinesChange(medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  return (
    <div className="md:col-span-12">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        aria-expanded={open}
        aria-label={`${label} tasks and medicines`}
        leftIcon={open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        onClick={onToggle}
      >
        Tasks &amp; medicines
        {count
          ? ` (${tasks.length} task${tasks.length === 1 ? '' : 's'}${autoTasks ? ` + ${autoTasks} auto` : ''}, ${medicines.length} medicine${medicines.length === 1 ? '' : 's'}${autoMedicines ? ` + ${autoMedicines} auto` : ''})`
          : ' (optional)'}
      </Button>
      {open ? (
        <div className="mt-2 space-y-4 rounded-md border border-dashed border-border p-3">
          <p className="text-xs text-muted-foreground">
            Added to every service user this visit is for. With none added, their own tasks and medicines apply.
          </p>

          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden /> Tasks (from the task list — due at the visit start)
            </span>
            <MultiSelect
              options={taskOptions.data ?? []}
              value={tasks.map((t) => t.name)}
              onChange={pickTasks}
              placeholder={taskOptions.isLoading ? 'Loading tasks…' : 'Select tasks'}
              searchPlaceholder="Search tasks…"
              disabled={disabled || taskOptions.isLoading}
            />
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
              <span className="text-sm text-foreground">Auto-add tasks:</span>
              <div className="w-40">
                <Select value={String(autoTasks)} onValueChange={(v) => onAutoTasksChange(Number(v))} disabled={disabled}>
                  <SelectTrigger aria-label={`${label} auto-add tasks`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 task</SelectItem>
                    <SelectItem value="2">2 tasks</SelectItem>
                    <SelectItem value="3">3 tasks</SelectItem>
                    <SelectItem value="4">4 tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">
                Everyday tasks suited to this round (e.g. wash, dressing, meals, fluids), picked when the script runs for each service user
                — never one they already have on this round. Routine priority, due at the visit start.
              </span>
            </div>
            {tasks.map((t) => (
              <div key={t.name} className="grid gap-2 md:grid-cols-12 md:items-center">
                <span className="text-sm font-medium text-foreground md:col-span-4">{t.name}</span>
                <div className="md:col-span-3">
                  <Select value={t.priority} onValueChange={(v) => setTask(t.name, { priority: v as TaskPriority })} disabled={disabled}>
                    <SelectTrigger aria-label={`${label} ${t.name} priority`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="md:col-span-5"
                  aria-label={`${label} ${t.name} instructions`}
                  placeholder="Instructions (optional)"
                  value={t.instructions}
                  disabled={disabled}
                  onChange={(e) => setTask(t.name, { instructions: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Pill className="h-3.5 w-3.5" aria-hidden /> Medicines (time within the visit)
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => onMedicinesChange([...medicines, newMedicine(visitStart)])}
              >
                Add medicine
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
              <span className="text-sm text-foreground">Auto-add from the medicine list:</span>
              <div className="w-40">
                <Select value={String(autoMedicines)} onValueChange={(v) => onAutoMedicinesChange(Number(v))} disabled={disabled}>
                  <SelectTrigger aria-label={`${label} auto-add medicines`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">1 medicine</SelectItem>
                    <SelectItem value="2">2 medicines</SelectItem>
                    <SelectItem value="3">3 medicines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">
                Picked when the script runs, for each service user separately — usual for this round, at the visit start, never one
                they already have active.
              </span>
            </div>
            {medicines.map((m, i) => {
              const n = `${label} medicine ${i + 1}`
              const outside = m.kind === 'REGULAR' && m.time && !medicineTimeInVisit(m.time, visitStart, visitEnd)
              return (
                <div key={m.id} className="grid gap-2 rounded-md border border-border p-2 md:grid-cols-12 md:items-end">
                  <div className="flex flex-col gap-1 md:col-span-12">
                    <span className="text-xs text-muted-foreground">Pick from list (fills the fields below — or type them)</span>
                    <Select value="" onValueChange={(v) => fromDataset(m.id, v)} disabled={disabled}>
                      <SelectTrigger aria-label={`${n} pick from list`}>
                        <SelectValue placeholder="Choose a medicine from the list…" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDICINE_DATASET.map((d, k) => (
                          <SelectItem key={`${d.name}-${d.dose}`} value={String(k)}>
                            {datasetMedicineLabel(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-3">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <Input aria-label={`${n} name`} placeholder="e.g. Paracetamol" value={m.name} disabled={disabled} onChange={(e) => setMedicine(m.id, { name: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-muted-foreground">Dose</span>
                    <Input aria-label={`${n} dose`} placeholder="e.g. 500mg" value={m.dose} disabled={disabled} onChange={(e) => setMedicine(m.id, { dose: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-muted-foreground">Route</span>
                    <Select value={m.route} onValueChange={(v) => setMedicine(m.id, { route: v })} disabled={disabled}>
                      <SelectTrigger aria-label={`${n} route`}>
                        <SelectValue placeholder="Route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map((r) => (
                          <SelectItem key={r.code} value={r.code}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-muted-foreground">Given</span>
                    <Select value={m.kind} onValueChange={(v) => setMedicine(m.id, { kind: v === 'PRN' ? 'PRN' : 'REGULAR' })} disabled={disabled}>
                      <SelectTrigger aria-label={`${n} regular or when needed`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="PRN">When needed (PRN)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-muted-foreground">Time</span>
                    <Input
                      type="time"
                      aria-label={`${n} time`}
                      aria-invalid={outside || undefined}
                      className={outside ? 'border-destructive' : undefined}
                      value={m.kind === 'PRN' ? '' : m.time}
                      disabled={disabled || m.kind === 'PRN'}
                      onChange={(e) => setMedicine(m.id, { time: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end md:col-span-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${n}`}
                      disabled={disabled}
                      onClick={() => onMedicinesChange(medicines.filter((x) => x.id !== m.id))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <Input
                    className="md:col-span-12"
                    aria-label={`${n} instructions`}
                    placeholder="Instructions (optional), e.g. with food"
                    value={m.instructions}
                    disabled={disabled}
                    onChange={(e) => setMedicine(m.id, { instructions: e.target.value })}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

import * as React from 'react'
import { Info, Loader2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  addMedicationPackItem,
  createMedicationPack,
  createServiceUserMedication,
  fetchMedicationLookups,
  listMedicationPacks,
  type CreateServiceUserMedicationPayload,
  type MedicationLookupsBundle,
  type MedicationPackRow,
} from '@/lib/service-users-api'
import { toastApiError, toastError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NoYesToggle } from '@/components/ui/no-yes-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
const SELECT_NONE = '__none__'

const HOW_ASSISTED_OPTIONS = [
  'Self',
  'Prompting',
  'Supervision',
  'Full assistance',
  'Not applicable',
] as const

export type MedicationTimeSlot = {
  id: string
  dueTime: string
  carePlanAction: string
}

function newTimeSlot(): MedicationTimeSlot {
  return { id: crypto.randomUUID(), dueTime: '', carePlanAction: '' }
}

export type BlisterPackItemDraft = {
  id: string
  medicationName: string
  strength: string
}

function newPackItem(): BlisterPackItemDraft {
  return { id: crypto.randomUUID(), medicationName: '', strength: '' }
}

function optionalId(v: string): string | undefined {
  return v && v !== SELECT_NONE ? v : undefined
}

function normalizeTimeInput(value: string): string {
  const t = value.trim()
  if (!t) return ''
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return t
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return t
  const h = m[1].padStart(2, '0')
  return `${h}:${m[2]}`
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  canSave: boolean
  onSaved: () => void | Promise<void>
}

export function AddMedicationDialog({
  open,
  onOpenChange,
  serviceUserId,
  canSave,
  onSaved,
}: Props) {
  const [lookups, setLookups] = React.useState<MedicationLookupsBundle | null>(null)
  const [lookupsLoading, setLookupsLoading] = React.useState(false)
  const [lookupsError, setLookupsError] = React.useState<string | null>(null)

  const [recordType, setRecordType] = React.useState<'MEDICATION' | 'BLISTER_PACK'>('MEDICATION')
  const [basicSearch, setBasicSearch] = React.useState(false)
  const [medicationName, setMedicationName] = React.useState('')
  const [dose, setDose] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [routeId, setRouteId] = React.useState(SELECT_NONE)
  const [howAssisted, setHowAssisted] = React.useState(SELECT_NONE)
  const [isControlledMedication, setIsControlledMedication] = React.useState(false)
  const [medicationTypeId, setMedicationTypeId] = React.useState(SELECT_NONE)
  const [expiryDate, setExpiryDate] = React.useState('')
  const [reasonForMedication, setReasonForMedication] = React.useState('')
  const [medicationNotes, setMedicationNotes] = React.useState('')
  const [frequencyId, setFrequencyId] = React.useState(SELECT_NONE)
  const [frequencyIntervalDays, setFrequencyIntervalDays] = React.useState('1')
  const [timeSlots, setTimeSlots] = React.useState<MedicationTimeSlot[]>(() => [
    newTimeSlot(),
    newTimeSlot(),
  ])

  const [packSource, setPackSource] = React.useState<'NEW' | 'EXISTING'>('NEW')
  const [packName, setPackName] = React.useState('')
  const [existingPackId, setExistingPackId] = React.useState(SELECT_NONE)
  const [packItems, setPackItems] = React.useState<BlisterPackItemDraft[]>(() => [
    newPackItem(),
    newPackItem(),
  ])
  const [packs, setPacks] = React.useState<MedicationPackRow[]>([])
  const [packsLoading, setPacksLoading] = React.useState(false)

  const [formError, setFormError] = React.useState<string | null>(null)
  const [formSaving, setFormSaving] = React.useState(false)

  function resetForm() {
    setRecordType('MEDICATION')
    setBasicSearch(false)
    setMedicationName('')
    setDose('')
    setStartDate('')
    setEndDate('')
    setRouteId(SELECT_NONE)
    setHowAssisted(SELECT_NONE)
    setIsControlledMedication(false)
    setMedicationTypeId(SELECT_NONE)
    setExpiryDate('')
    setReasonForMedication('')
    setMedicationNotes('')
    setFrequencyId(SELECT_NONE)
    setFrequencyIntervalDays('1')
    setTimeSlots([newTimeSlot(), newTimeSlot()])
    setPackSource('NEW')
    setPackName('')
    setExistingPackId(SELECT_NONE)
    setPackItems([newPackItem(), newPackItem()])
    setPacks([])
    setFormError(null)
  }

  React.useEffect(() => {
    if (!open) return
    resetForm()
  }, [open])

  React.useEffect(() => {
    if (!open || lookups) return
    let cancelled = false
    ;(async () => {
      setLookupsLoading(true)
      setLookupsError(null)
      try {
        const b = await fetchMedicationLookups()
        if (!cancelled) setLookups(b)
      } catch (e) {
        if (!cancelled) {
          setLookupsError(e instanceof ApiError ? e.message : 'Failed to load lookups')
        }
      } finally {
        if (!cancelled) setLookupsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, lookups])

  React.useEffect(() => {
    if (!open || recordType !== 'BLISTER_PACK') return
    let cancelled = false
    ;(async () => {
      setPacksLoading(true)
      try {
        const list = await listMedicationPacks(serviceUserId)
        if (!cancelled) setPacks(list)
      } catch {
        if (!cancelled) setPacks([])
      } finally {
        if (!cancelled) setPacksLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, recordType, serviceUserId])

  const selectedPack = packs.find(p => p.id === existingPackId) ?? null
  const existingPackItems = selectedPack?.items ?? []

  function addTimeSlot() {
    setTimeSlots(prev => [...prev, newTimeSlot()])
  }

  function removeTimeSlot(id: string) {
    setTimeSlots(prev => (prev.length <= 1 ? prev : prev.filter(s => s.id !== id)))
  }

  function updateTimeSlot(id: string, patch: Partial<MedicationTimeSlot>) {
    setTimeSlots(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addPackItem() {
    setPackItems(prev => [...prev, newPackItem()])
  }

  function removePackItem(id: string) {
    setPackItems(prev => (prev.length <= 1 ? prev : prev.filter(p => p.id !== id)))
  }

  function updatePackItem(id: string, patch: Partial<BlisterPackItemDraft>) {
    setPackItems(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  function buildSchedules() {
    return timeSlots
      .map(s => ({
        dueTime: normalizeTimeInput(s.dueTime),
        dueVisitName: s.carePlanAction.trim() || undefined,
      }))
      .filter(s => s.dueTime)
  }

  function validateMarFields(): string | null {
    if (!startDate.trim()) return 'Start date on system is required.'
    if (!optionalId(routeId)) return 'Route administration is required.'
    if (!dose.trim()) return 'Dose is required.'
    if (!optionalId(medicationTypeId)) return 'Medication type is required.'
    if (!optionalId(frequencyId)) return 'Frequency is required.'
    if (buildSchedules().length === 0) return 'Add at least one administration time under “at times”.'
    return null
  }

  function sharedMedicationPayload(schedules: CreateServiceUserMedicationPayload['schedules']) {
    const howAssistedLabel =
      howAssisted !== SELECT_NONE
        ? HOW_ASSISTED_OPTIONS.includes(howAssisted as (typeof HOW_ASSISTED_OPTIONS)[number])
          ? howAssisted
          : howAssisted
        : undefined
    return {
      medicationKind: 'REGULAR' as const,
      dose: dose.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      routeId: optionalId(routeId),
      medicationTypeId: optionalId(medicationTypeId),
      frequencyId: optionalId(frequencyId),
      frequencyIntervalDays: Math.max(1, parseInt(frequencyIntervalDays, 10) || 1),
      instructions: reasonForMedication.trim() || undefined,
      notes: medicationNotes.trim() || undefined,
      howAssisted: howAssistedLabel,
      isControlledMedication,
      schedules,
    }
  }

  async function saveMedication() {
    const name = medicationName.trim()
    if (!name) {
      setFormError('Medication name is required.')
      toastError('Cannot save', 'Enter a medication name.')
      return
    }
    const marErr = validateMarFields()
    if (marErr) {
      setFormError(marErr)
      return
    }

    const schedules = buildSchedules()
    setFormError(null)

    setFormSaving(true)
    try {
      const res = await createServiceUserMedication(serviceUserId, {
        medicationName: name,
        ...sharedMedicationPayload(schedules),
      })
      onOpenChange(false)
      resetForm()
      await onSaved()
      const count = res.schedules?.length ?? schedules.length
      toastSuccess(
        'Medication added',
        count > 1
          ? `Saved with ${count} administration times (one MAR row per time for carers).`
          : 'The medication list has been updated.',
      )
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    } finally {
      setFormSaving(false)
    }
  }

  async function saveBlisterPack() {
    const marErr = validateMarFields()
    if (marErr) {
      setFormError(marErr)
      return
    }

    let packId = ''
    let items: { medicationName: string; strength?: string }[] = []

    if (packSource === 'NEW') {
      const name = packName.trim()
      if (!name) {
        setFormError('Blister pack name is required.')
        return
      }
      items = packItems
        .map(p => ({ medicationName: p.medicationName.trim(), strength: p.strength.trim() || undefined }))
        .filter(p => p.medicationName)
      if (items.length === 0) {
        setFormError('Add at least one medication to the blister pack.')
        return
      }
    } else {
      if (!optionalId(existingPackId)) {
        setFormError('Select an existing blister pack.')
        return
      }
      packId = existingPackId
      items = existingPackItems.map(p => ({
        medicationName: p.medicationName,
        strength: p.strength ?? undefined,
      }))
      if (items.length === 0) {
        setFormError('The selected blister pack has no medications. Add items to the pack first.')
        return
      }
    }

    const schedules = buildSchedules()
    setFormError(null)
    setFormSaving(true)

    try {
      if (packSource === 'NEW') {
        const pack = await createMedicationPack(serviceUserId, {
          name: packName.trim(),
          startDate: startDate.trim() || undefined,
          endDate: endDate.trim() || undefined,
          description: medicationNotes.trim() || undefined,
        })
        packId = pack.id
        for (let i = 0; i < items.length; i++) {
          await addMedicationPackItem(serviceUserId, packId, {
            ...items[i],
            sortOrder: i,
          })
        }
      }

      for (const item of items) {
        await createServiceUserMedication(serviceUserId, {
          medicationName: item.medicationName,
          strength: item.strength,
          medicationPackId: packId,
          ...sharedMedicationPayload(schedules),
        })
      }

      onOpenChange(false)
      resetForm()
      await onSaved()
      const slotCount = items.length * schedules.length
      toastSuccess(
        'Blister pack added',
        `${items.length} medication(s) linked to the pack, ${slotCount} MAR row(s) in total (${schedules.length} time(s) each).`,
      )
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    } finally {
      setFormSaving(false)
    }
  }

  async function onSave() {
    if (recordType === 'BLISTER_PACK') await saveBlisterPack()
    else await saveMedication()
  }

  const disabled = formSaving || lookupsLoading || !canSave
  const isBlister = recordType === 'BLISTER_PACK'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-teal-800 dark:text-teal-200">
            {isBlister ? 'Add blister pack' : 'Add medication'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {lookupsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading lookups…
            </div>
          )}
          {lookupsError && (
            <p className="text-sm text-destructive" role="alert">
              {lookupsError}
            </p>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Select</label>
              <Select
                value={recordType}
                onValueChange={v => setRecordType(v as 'MEDICATION' | 'BLISTER_PACK')}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICATION">Medication</SelectItem>
                  <SelectItem value="BLISTER_PACK">Blister pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isBlister && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pack-source"
                    checked={packSource === 'NEW'}
                    onChange={() => setPackSource('NEW')}
                    disabled={disabled}
                  />
                  New blister pack
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pack-source"
                    checked={packSource === 'EXISTING'}
                    onChange={() => setPackSource('EXISTING')}
                    disabled={disabled}
                  />
                  Existing blister pack
                </label>
              </div>

              {packSource === 'NEW' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Blister pack name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={packName}
                      onChange={e => setPackName(e.target.value)}
                      placeholder="e.g. Morning blister pack"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Medications in pack <span className="text-destructive">*</span>
                    </p>
                    <ul className="space-y-2">
                      {packItems.map((item, index) => (
                        <li key={item.id} className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[10rem] flex-1 space-y-1">
                            {index === 0 && (
                              <label className="text-xs text-muted-foreground">Name</label>
                            )}
                            <Input
                              value={item.medicationName}
                              onChange={e =>
                                updatePackItem(item.id, { medicationName: e.target.value })
                              }
                              placeholder="Medication name"
                              disabled={disabled}
                            />
                          </div>
                          <div className="min-w-[6rem] flex-1 space-y-1">
                            {index === 0 && (
                              <label className="text-xs text-muted-foreground">Strength</label>
                            )}
                            <Input
                              value={item.strength}
                              onChange={e => updatePackItem(item.id, { strength: e.target.value })}
                              placeholder="e.g. 5mg"
                              disabled={disabled}
                            />
                          </div>
                          <div className="flex gap-1 pb-0.5">
                            {index === packItems.length - 1 && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 shrink-0"
                                onClick={addPackItem}
                                disabled={disabled}
                                aria-label="Add pack medication"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 shrink-0"
                              onClick={() => removePackItem(item.id)}
                              disabled={disabled || packItems.length <= 1}
                              aria-label="Remove pack medication"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Blister pack <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={existingPackId}
                    onValueChange={setExistingPackId}
                    disabled={disabled || packsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={packsLoading ? 'Loading…' : 'Select blister pack'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value={SELECT_NONE}>—</SelectItem>
                      {packs.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.items.length} meds)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPack && (
                    <ul className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                      {existingPackItems.map(item => (
                        <li key={item.id} className="py-1 text-muted-foreground">
                          {item.medicationName}
                          {item.strength ? ` · ${item.strength}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!packsLoading && packs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No blister packs yet. Create a new pack above.
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Each medication in the pack is added to the MAR with the same route, dose, frequency, and
                administration times below (one row per med per time).
              </p>
            </div>
          )}

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            {!isBlister && (
              <div className="space-y-1 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium">
                    Medication name <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Basic search</span>
                    <NoYesToggle
                      value={basicSearch}
                      onChange={setBasicSearch}
                      disabled={disabled}
                      activeTone="success"
                    />
                  </div>
                </div>
                <Input
                  value={medicationName}
                  onChange={e => setMedicationName(e.target.value)}
                  placeholder="Name"
                  disabled={disabled}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Start date on system <span className="text-destructive">*</span>
              </label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={disabled} />
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1 text-sm font-medium">
                Dose <span className="text-destructive">*</span>
                <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </label>
              <Input value={dose} onChange={e => setDose(e.target.value)} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Route administration <span className="text-destructive">*</span>
              </label>
              <Select value={routeId} onValueChange={setRouteId} disabled={disabled || !lookups}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route administration" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={SELECT_NONE}>—</SelectItem>
                  {lookups?.routes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Controlled medication</label>
              <NoYesToggle
                value={isControlledMedication}
                onChange={setIsControlledMedication}
                disabled={disabled}
                activeTone="success"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                How assisted
              </label>
              <Select value={howAssisted} onValueChange={setHowAssisted} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select how assisted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>—</SelectItem>
                  {HOW_ASSISTED_OPTIONS.map(o => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Medication type <span className="text-destructive">*</span>
              </label>
              <Select value={medicationTypeId} onValueChange={setMedicationTypeId} disabled={disabled || !lookups}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medication type" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={SELECT_NONE}>—</SelectItem>
                  {lookups?.types.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Expiry date</label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} disabled={disabled} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Reason for medication</label>
              <textarea
                value={reasonForMedication}
                onChange={e => setReasonForMedication(e.target.value)}
                rows={3}
                disabled={disabled}
                placeholder="Reason for medication…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Medication notes</label>
              <textarea
                value={medicationNotes}
                onChange={e => setMedicationNotes(e.target.value)}
                rows={3}
                disabled={disabled}
                placeholder="Any medication note…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">
              Frequency <span className="text-destructive">*</span>
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Pattern</label>
                <Select value={frequencyId} onValueChange={setFrequencyId} disabled={disabled || !lookups}>
                  <SelectTrigger>
                    <SelectValue placeholder="Daily" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    {lookups?.frequencies.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <span className="pb-2 text-sm text-muted-foreground">Every:</span>
                <Input
                  type="number"
                  min={1}
                  className="w-16"
                  value={frequencyIntervalDays}
                  onChange={e => setFrequencyIntervalDays(e.target.value)}
                  disabled={disabled}
                />
                <span className="pb-2 text-sm text-muted-foreground">Days</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                at times: <span className="text-destructive">*</span>{' '}
                <span className="text-xs">(each time is saved as its own schedule row for carer check-off)</span>
              </p>
              <ul className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <li key={slot.id} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[7rem] flex-1 space-y-1">
                      {index === 0 && <label className="text-xs text-muted-foreground">Time</label>}
                      <Input
                        type="time"
                        value={slot.dueTime}
                        onChange={e => updateTimeSlot(slot.id, { dueTime: e.target.value })}
                        disabled={disabled}
                        className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>
                    <div className="min-w-[12rem] flex-[2] space-y-1">
                      {index === 0 && (
                        <label className="text-xs text-muted-foreground">Care plan action</label>
                      )}
                      <Input
                        value={slot.carePlanAction}
                        onChange={e => updateTimeSlot(slot.id, { carePlanAction: e.target.value })}
                        placeholder="Select Care Plan Action"
                        disabled={disabled}
                      />
                    </div>
                    <div className="flex gap-1 pb-0.5">
                      {index === timeSlots.length - 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={addTimeSlot}
                          disabled={disabled}
                          aria-label="Add time"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => removeTimeSlot(slot.id)}
                        disabled={disabled || timeSlots.length <= 1}
                        aria-label="Remove time"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-teal-700 text-white hover:bg-teal-800"
            disabled={disabled}
            onClick={() => void onSave()}
          >
            {formSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isBlister ? (
              'Save blister pack'
            ) : (
              'Save medication'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

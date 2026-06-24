import * as React from 'react'
import {
  Loader2,
  Plus,
  Package,
  FileText,
  ChevronDown,
  ChevronRight,
  Send,
  RefreshCw,
  Ban,
  X,
  Truck,
  Clock,
  ClipboardCheck,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type {
  MedicationPackRow,
  MedicationPackStatusValue,
  MedicationPackCompartmentRow,
  MedicationPackMemberRow,
} from '@/features/service-users/types'
import { useMedicationPacks } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import { formatGbDate } from '@/features/service-users/medication/medication-event-display'
import {
  useMedicationPackMembers,
  useAddMedicationPackMember,
  useEndMedicationPackMember,
  usePublishMedicationPack,
  useSupersedeMedicationPack,
  useEndMedicationPack,
  useMedicationPackDeliveries,
  useMedicationPackCompartments,
  useAddMedicationPackCompartment,
  useRemoveMedicationPackCompartment,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'
import { AddBlisterPackWizard } from '@/features/service-users/medication/AddBlisterPackWizard'
import { PackManifestDialog } from '@/features/service-users/medication/PackManifestDialog'
import { PackDeliveryDialog, DeliveryStatusBadge } from '@/features/service-users/medication/PackDeliveryDialog'
import { PackRecordRoundDialog } from '@/features/service-users/medication/PackRecordRoundDialog'
import {
  medMatchesCompartmentDueTime,
  scheduleForCompartment,
} from '@/features/service-users/medication/blister-pack-wizard.utils'

const STATUS_META: Record<MedicationPackStatusValue, { label: string; variant: 'muted' | 'success' | 'secondary' | 'warning' }> = {
  DRAFT: { label: 'Draft', variant: 'muted' },
  ACTIVE: { label: 'Active', variant: 'success' },
  SUPERSEDED: { label: 'Superseded', variant: 'secondary' },
  ENDED: { label: 'Ended', variant: 'warning' },
}

const PACK_TYPE_LABEL: Record<string, string> = {
  BLISTER: 'Blister pack',
  DOSSETTE: 'Dossette box',
  NOMAD: 'Nomad tray',
  OTHER: 'Other',
}

export function MedicationPacksTab({
  serviceUserId,
  serviceUserName,
}: {
  serviceUserId: string
  serviceUserName?: string
}) {
  const permissions = useAuthStore(s => s.user?.permissions) as string[] | undefined
  const can = React.useCallback(
    (...keys: string[]) => {
      const p = permissions ?? []
      return keys.some(k => p.includes(k))
    },
    [permissions],
  )
  const canManage = can(
    'service_users.update',
    'service_users.medications.update',
    'service_users.medications.create',
  )
  const canPublish = can(
    'service_users.medications.packs.publish',
    'service_users.medications.update',
    'service_users.update',
  )
  const canSupersede = can('service_users.medications.packs.supersede', 'service_users.update')
  const canDeliver = can(
    'service_users.medications.packs.deliver',
    'service_users.medications.update',
    'service_users.update',
  )
  const canRecord = can('service_users.medications.administer', 'service_users.update')

  const packsQuery = useMedicationPacks(serviceUserId)
  const packs = packsQuery.data ?? []

  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [manifestPackId, setManifestPackId] = React.useState<string | null>(null)
  const [deliveryPack, setDeliveryPack] = React.useState<{ id: string; cycleNumber: number } | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)

  if (packsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading blister packs…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Blister packs</h2>
          <p className="text-sm text-muted-foreground">
            Pharmacy-prepared monitored dosage systems with versioned MCA contents records.
          </p>
        </div>
        {canManage && (
          <Button size="sm" className="gap-1.5 bg-teal-700 text-white hover:bg-teal-800" onClick={() => setWizardOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add blister pack
          </Button>
        )}
      </div>

      {packsQuery.error instanceof Error && (
        <p className="text-sm text-destructive">{packsQuery.error.message}</p>
      )}

      {packs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <Package className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No blister packs yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Set up a pharmacy-prepared pack to group scheduled medicines and generate the MCA contents
            record.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {packs.map(pack => (
          <PackCard
            key={pack.id}
            pack={pack}
            serviceUserId={serviceUserId}
            expanded={expanded === pack.id}
            onToggleExpand={() => setExpanded(expanded === pack.id ? null : pack.id)}
            onViewManifest={() => setManifestPackId(pack.id)}
            onLogDelivery={() => setDeliveryPack({ id: pack.id, cycleNumber: pack.cycleNumber })}
            canManage={canManage}
            canPublish={canPublish}
            canSupersede={canSupersede}
            canDeliver={canDeliver}
            canRecord={canRecord}
          />
        ))}
      </div>

      <AddBlisterPackWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        serviceUserId={serviceUserId}
        serviceUserName={serviceUserName}
        onCompleted={() => void packsQuery.refetch()}
      />
      <PackManifestDialog
        open={manifestPackId != null}
        onOpenChange={o => !o && setManifestPackId(null)}
        serviceUserId={serviceUserId}
        packId={manifestPackId}
        serviceUserName={serviceUserName}
      />
      <PackDeliveryDialog
        open={deliveryPack != null}
        onOpenChange={o => !o && setDeliveryPack(null)}
        serviceUserId={serviceUserId}
        packId={deliveryPack?.id ?? null}
        cycleNumber={deliveryPack?.cycleNumber}
      />
    </div>
  )
}

function PackCard({
  pack,
  serviceUserId,
  expanded,
  onToggleExpand,
  onViewManifest,
  onLogDelivery,
  canManage,
  canPublish,
  canSupersede,
  canDeliver,
  canRecord,
}: {
  pack: MedicationPackRow
  serviceUserId: string
  expanded: boolean
  onToggleExpand: () => void
  onViewManifest: () => void
  onLogDelivery: () => void
  canManage: boolean
  canPublish: boolean
  canSupersede: boolean
  canDeliver: boolean
  canRecord: boolean
}) {
  const status = STATUS_META[pack.status] ?? STATUS_META.DRAFT
  const publishPack = usePublishMedicationPack(serviceUserId)
  const supersedePack = useSupersedeMedicationPack(serviceUserId)
  const endPack = useEndMedicationPack(serviceUserId)
  const isMutating = publishPack.isPending || supersedePack.isPending || endPack.isPending
  const [recordCompartment, setRecordCompartment] = React.useState<MedicationPackCompartmentRow | null>(null)

  const run = async (fn: () => Promise<unknown>, msg: string, err: string) => {
    try {
      await fn()
      toastSuccess(msg)
    } catch (e) {
      toastApiError(e, err)
    }
  }

  const isLocked = pack.status === 'SUPERSEDED' || pack.status === 'ENDED'

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button type="button" onClick={onToggleExpand} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{pack.name}</span>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
            <Badge variant="outline" size="sm">
              Cycle {pack.cycleNumber}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {PACK_TYPE_LABEL[pack.packType] ?? pack.packType}
            {pack.pharmacyName ? ` · ${pack.pharmacyName}` : ''}
            {pack.roundLabel ? ` · ${pack.roundLabel}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onViewManifest}>
            <FileText className="h-3.5 w-3.5" /> Manifest
          </Button>
          {canDeliver && pack.status === 'ACTIVE' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onLogDelivery}>
              <Truck className="h-3.5 w-3.5" /> Log delivery
            </Button>
          )}
          {canPublish && pack.status === 'DRAFT' && (
            <Button
              size="sm"
              className="gap-1.5 bg-teal-700 text-white hover:bg-teal-800"
              disabled={isMutating}
              onClick={() =>
                void run(
                  () => publishPack.mutateAsync({ packId: pack.id }),
                  'Pack published',
                  'Could not publish pack',
                )
              }
            >
              <Send className="h-3.5 w-3.5" /> Publish
            </Button>
          )}
          {canSupersede && pack.status === 'ACTIVE' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isMutating}
              onClick={() => {
                if (!window.confirm('Start the next cycle? This supersedes the current pack and carries its medicines into a new draft.')) return
                void run(
                  () => supersedePack.mutateAsync({ packId: pack.id }),
                  'New cycle created',
                  'Could not supersede pack',
                )
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> New cycle
            </Button>
          )}
          {canManage && !isLocked && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive"
              disabled={isMutating}
              onClick={() => {
                const reason = window.prompt('Reason for ending this pack?') ?? undefined
                if (reason === undefined) return
                void run(
                  () => endPack.mutateAsync({ packId: pack.id, reason }),
                  'Pack ended',
                  'Could not end pack',
                )
              }}
            >
              <Ban className="h-3.5 w-3.5" /> End
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <>
          <PackCompartments
            serviceUserId={serviceUserId}
            packId={pack.id}
            canManage={canManage && !isLocked}
            canRecord={canRecord && pack.status === 'ACTIVE'}
            onRecord={setRecordCompartment}
          />
          <PackContentsByCompartment serviceUserId={serviceUserId} packId={pack.id} />
          <PackMembers serviceUserId={serviceUserId} pack={pack} canManage={canManage && !isLocked} />
          <PackDeliveries serviceUserId={serviceUserId} packId={pack.id} />
        </>
      )}
      <PackRecordRoundDialog
        open={recordCompartment != null}
        onOpenChange={o => !o && setRecordCompartment(null)}
        serviceUserId={serviceUserId}
        pack={pack}
        compartment={recordCompartment}
      />
    </div>
  )
}

function PackCompartments({
  serviceUserId,
  packId,
  canManage,
  canRecord,
  onRecord,
}: {
  serviceUserId: string
  packId: string
  canManage: boolean
  canRecord: boolean
  onRecord: (compartment: MedicationPackCompartmentRow) => void
}) {
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, packId)
  const addCompartment = useAddMedicationPackCompartment(serviceUserId)
  const removeCompartment = useRemoveMedicationPackCompartment(serviceUserId)
  const [adding, setAdding] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [dueTime, setDueTime] = React.useState('08:00')
  const [windowStart, setWindowStart] = React.useState('')
  const [windowEnd, setWindowEnd] = React.useState('')

  const compartments = compartmentsQuery.data ?? []

  const handleAdd = async () => {
    if (!label.trim() || !dueTime) return
    try {
      await addCompartment.mutateAsync({
        packId,
        body: {
          label: label.trim(),
          dueTime,
          windowStart: windowStart || undefined,
          windowEnd: windowEnd || undefined,
          sortOrder: compartments.length,
        },
      })
      toastSuccess('Compartment added')
      setLabel('')
      setDueTime('08:00')
      setWindowStart('')
      setWindowEnd('')
      setAdding(false)
    } catch (e) {
      toastApiError(e, 'Could not add compartment')
    }
  }

  const handleRemove = async (compartmentId: string, lbl: string) => {
    if (!window.confirm(`Remove the "${lbl}" compartment?`)) return
    try {
      await removeCompartment.mutateAsync({ packId, compartmentId })
      toastSuccess('Compartment removed')
    } catch (e) {
      toastApiError(e, 'Could not remove compartment')
    }
  }

  return (
    <div className="border-t border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Compartments (time slots)</h4>
        {canManage && !adding && (
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>
      {compartmentsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : compartments.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No compartments defined.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {compartments.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{c.label}</span>
              <span className="text-muted-foreground">{c.dueTime}</span>
              {(c.windowStart || c.windowEnd) && (
                <span className="text-xs text-muted-foreground">
                  ({c.windowStart ?? '—'}–{c.windowEnd ?? '—'})
                </span>
              )}
              {canRecord && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
                  onClick={() => onRecord(c)}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" /> Record
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void handleRemove(c.id, c.label)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {adding && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Label</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Morning" />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Due</label>
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Window start</label>
            <Input type="time" value={windowStart} onChange={e => setWindowStart(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Window end</label>
            <Input type="time" value={windowEnd} onChange={e => setWindowEnd(e.target.value)} />
          </div>
          <Button size="sm" disabled={!label.trim() || addCompartment.isPending} onClick={() => void handleAdd()}>
            {addCompartment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

function PackContentsByCompartment({
  serviceUserId,
  packId,
}: {
  serviceUserId: string
  packId: string
}) {
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, packId)
  const membersQuery = useMedicationPackMembers(serviceUserId, packId)

  const compartments = compartmentsQuery.data ?? []
  const members = (membersQuery.data ?? []).filter(m => m.status === 'ACTIVE')
  const loading = compartmentsQuery.isLoading || membersQuery.isLoading

  if (loading) {
    return (
      <div className="border-t border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading contents…
        </div>
      </div>
    )
  }

  if (compartments.length === 0 || members.length === 0) return null

  const unmatched = members.filter(m => {
    const schedules = m.serviceUserMedication?.schedules
    return !compartments.some(c => medMatchesCompartmentDueTime(schedules, c.dueTime))
  })

  return (
    <div className="border-t border-border bg-muted/20 p-4">
      <h4 className="mb-1 text-sm font-semibold">Contents by compartment</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Which medicines are due in each time slot — matched from each medicine&apos;s chart schedule.
      </p>

      <div className="space-y-3">
        {compartments.map(compartment => {
          const inSlot = members.filter(m =>
            medMatchesCompartmentDueTime(m.serviceUserMedication?.schedules, compartment.dueTime),
          )
          return (
            <div
              key={compartment.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-teal-700" />
                <span className="text-sm font-semibold">{compartment.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{compartment.dueTime}</span>
                {(compartment.windowStart || compartment.windowEnd) && (
                  <span className="text-xs text-muted-foreground">
                    ({compartment.windowStart ?? '—'}–{compartment.windowEnd ?? '—'})
                  </span>
                )}
                <Badge variant="secondary" size="sm" className="ml-auto">
                  {inSlot.length} medicine{inSlot.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {inSlot.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No medicines scheduled for this slot.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {inSlot.map(m => {
                    const med = m.serviceUserMedication
                    const sched = scheduleForCompartment(med?.schedules, compartment.dueTime)
                    const dose = sched?.dose ?? med?.dose
                    return (
                      <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <Check className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                        <span className="font-medium">{med?.medicationName ?? 'Medicine'}</span>
                        {med?.strength && (
                          <span className="text-muted-foreground">{med.strength}</span>
                        )}
                        {dose && <span className="text-muted-foreground">· {dose}</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {unmatched.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>Schedule mismatch:</strong>{' '}
            {unmatched.map(m => m.serviceUserMedication?.medicationName).filter(Boolean).join(', ')}{' '}
            {unmatched.length === 1 ? 'has' : 'have'} no administration time matching a pack compartment.
          </div>
        </div>
      )}

      <PackContentsMatrix members={members} compartments={compartments} />
    </div>
  )
}

function PackContentsMatrix({
  members,
  compartments,
}: {
  members: MedicationPackMemberRow[]
  compartments: MedicationPackCompartmentRow[]
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Schedule matrix
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Medicine</th>
                {compartments.map(c => (
                  <th key={c.id} className="px-3 py-2 text-center font-medium">
                    <div>{c.label}</div>
                    <div className="font-mono text-[10px] font-normal text-muted-foreground">{c.dueTime}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const med = m.serviceUserMedication
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{med?.medicationName ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {[med?.strength, med?.dose].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    {compartments.map(c => {
                      const match = medMatchesCompartmentDueTime(med?.schedules, c.dueTime)
                      return (
                        <td key={c.id} className="px-3 py-2 text-center">
                          {match ? (
                            <Check className="mx-auto h-4 w-4 text-teal-600" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PackDeliveries({ serviceUserId, packId }: { serviceUserId: string; packId: string }) {
  const deliveriesQuery = useMedicationPackDeliveries(serviceUserId, packId)
  const deliveries = deliveriesQuery.data ?? []

  if (deliveriesQuery.isLoading) {
    return (
      <div className="border-t border-border bg-muted/10 p-4 text-sm text-muted-foreground">
        <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> Loading deliveries…
      </div>
    )
  }
  if (deliveries.length === 0) return null

  return (
    <div className="border-t border-border bg-muted/10 p-4">
      <h4 className="mb-2 text-sm font-semibold">Delivery history</h4>
      <ul className="space-y-1.5">
        {deliveries.map(d => {
          const flagged = d.lines.filter(l => !l.confirmedPresent).length
          return (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="font-medium">Cycle {d.cycleNumber}</span>
              <span className="text-muted-foreground">
                {formatGbDate(d.receivedAt)}
              </span>
              {d.deliveredBy && <span className="text-muted-foreground">· {d.deliveredBy}</span>}
              {d.condition === 'DAMAGED' && (
                <Badge variant="destructive" size="sm">
                  Damaged
                </Badge>
              )}
              <span className="ml-auto flex items-center gap-2">
                {flagged > 0 && <span className="text-xs text-warning">{flagged} flagged</span>}
                <DeliveryStatusBadge status={d.status} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PackMembers({
  serviceUserId,
  pack,
  canManage,
}: {
  serviceUserId: string
  pack: MedicationPackRow
  canManage: boolean
}) {
  const membersQuery = useMedicationPackMembers(serviceUserId, pack.id)
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, pack.id)
  const medsQuery = useServiceUserMedications(serviceUserId)
  const addMember = useAddMedicationPackMember(serviceUserId)
  const endMember = useEndMedicationPackMember(serviceUserId)
  const [toAdd, setToAdd] = React.useState('')

  const members = (membersQuery.data ?? []).filter(m => m.status === 'ACTIVE')
  const compartments = compartmentsQuery.data ?? []
  const linkedIds = new Set(members.map(m => m.serviceUserMedicationId))
  const eligible = (medsQuery.data?.rows ?? []).filter(
    m =>
      (m.medicationKind ?? 'REGULAR') !== 'PRN' &&
      !m.isControlledMedication &&
      String(m.status) === 'ACTIVE' &&
      !m.medicationPack &&
      !linkedIds.has(m.id),
  )

  const handleAdd = async () => {
    if (!toAdd) return
    try {
      await addMember.mutateAsync({ packId: pack.id, serviceUserMedicationId: toAdd })
      toastSuccess('Medicine linked to pack')
      setToAdd('')
    } catch (e) {
      toastApiError(e, 'Could not link medicine')
    }
  }

  const handleEnd = async (memberId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from this pack?`)) return
    try {
      await endMember.mutateAsync({ packId: pack.id, memberId })
      toastSuccess('Medicine removed from pack')
    } catch (e) {
      toastApiError(e, 'Could not remove medicine')
    }
  }

  return (
    <div className="border-t border-border bg-muted/20 p-4">
      <h4 className="mb-2 text-sm font-semibold">Pack members</h4>
      <p className="mb-2 text-xs text-muted-foreground">
        All medicines in this pack. Administration times are shown per compartment above.
      </p>
      {membersQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medicines linked.</p>
      ) : (
        <ul className="space-y-1.5">
          {members.map(m => {
            const med = m.serviceUserMedication
            const matchedSlots = compartments.filter(c =>
              medMatchesCompartmentDueTime(med?.schedules, c.dueTime),
            )
            return (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{med?.medicationName ?? 'Medicine'}</span>
                    {med?.strength && <span className="text-sm text-muted-foreground">{med.strength}</span>}
                    {med?.dose && <span className="text-sm text-muted-foreground">· {med.dose}</span>}
                  </div>
                  {matchedSlots.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {matchedSlots.map(c => (
                        <Badge key={c.id} variant="secondary" size="sm">
                          {c.label} {c.dueTime}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      No schedule times match pack compartments
                    </p>
                  )}
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-destructive"
                    disabled={endMember.isPending}
                    onClick={() => void handleEnd(m.id, med?.medicationName ?? 'this medicine')}
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canManage && eligible.length > 0 && (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Add a medicine</label>
            <Select value={toAdd} onValueChange={setToAdd}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scheduled medicine…" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.medicationName}
                    {m.strength ? ` ${m.strength}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!toAdd || addMember.isPending} onClick={() => void handleAdd()}>
            {addMember.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Link'}
          </Button>
        </div>
      )}
    </div>
  )
}

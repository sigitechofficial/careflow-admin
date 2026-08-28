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
  Truck,
  Clock,
  ClipboardCheck,
  Check,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import type {
  MedicationPackRow,
  MedicationPackStatusValue,
  MedicationPackCompartmentRow,
} from '@/features/service-users/types'
import { useMedicationPacks } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { formatGbDate } from '@/features/service-users/medication/medication-event-display'
import {
  useMedicationPackMembers,
  usePublishMedicationPack,
  useSupersedeMedicationPack,
  useEndMedicationPack,
  useMedicationPackDeliveries,
  useMedicationPackCompartments,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'
import { AddBlisterPackWizard } from '@/features/service-users/medication/AddBlisterPackWizard'
import { EditBlisterPackDialog } from '@/features/service-users/medication/EditBlisterPackDialog'
import { PackManifestDialog } from '@/features/service-users/medication/PackManifestDialog'
import { PackDeliveryDialog, DeliveryStatusBadge } from '@/features/service-users/medication/PackDeliveryDialog'
import { PackRecordRoundDialog } from '@/features/service-users/medication/PackRecordRoundDialog'
import {
  medMatchesCompartmentDueTime,
  scheduleForCompartment,
} from '@/features/service-users/medication/blister-pack-wizard.utils'

const STATUS_META: Record<MedicationPackStatusValue, { label: string; variant: 'muted' | 'success' | 'secondary' | 'warning' }> = {
  DRAFT: { label: 'Not published', variant: 'muted' },
  ACTIVE: { label: 'In use', variant: 'success' },
  SUPERSEDED: { label: 'Replaced', variant: 'secondary' },
  ENDED: { label: 'Ended', variant: 'warning' },
}

function packNextStep(status: MedicationPackStatusValue): string {
  if (status === 'DRAFT') {
    return 'Not in use yet. Use Edit pack to change times or medicines, then Publish when it matches the pharmacy pack.'
  }
  if (status === 'ACTIVE') {
    return 'In use. Times and medicines are locked. Log a delivery when the next pack arrives.'
  }
  if (status === 'SUPERSEDED') return 'Replaced by a newer cycle.'
  return 'This pack is no longer in use.'
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
  const didAutoExpand = React.useRef(false)

  React.useEffect(() => {
    if (didAutoExpand.current || packs.length === 0) return
    didAutoExpand.current = true
    setExpanded(packs[0]!.id)
  }, [packs])

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
            Pharmacy trays with medicines grouped by time — morning, midday, evening.
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
            Add a pack to group tablets the pharmacy has already put in one tray.
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
  const [editOpen, setEditOpen] = React.useState(false)
  const canEditDraft = canManage && pack.status === 'DRAFT'

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
            {pack.items.length > 0
              ? ` · ${pack.items.map(i => i.medicationName).filter(Boolean).join(', ')}`
              : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{packNextStep(pack.status)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditDraft && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit pack
            </Button>
          )}
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
          <PackContentsByCompartment
            serviceUserId={serviceUserId}
            packId={pack.id}
            canEditDraft={canEditDraft}
            onEdit={() => setEditOpen(true)}
            canRecord={canRecord && pack.status === 'ACTIVE'}
            onRecord={setRecordCompartment}
          />
          <PackDeliveries serviceUserId={serviceUserId} packId={pack.id} />
        </>
      )}
      <EditBlisterPackDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        serviceUserId={serviceUserId}
        pack={pack}
      />
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

function PackContentsByCompartment({
  serviceUserId,
  packId,
  canEditDraft,
  onEdit,
  canRecord,
  onRecord,
}: {
  serviceUserId: string
  packId: string
  canEditDraft: boolean
  onEdit: () => void
  canRecord: boolean
  onRecord: (compartment: MedicationPackCompartmentRow) => void
}) {
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, packId)
  const membersQuery = useMedicationPackMembers(serviceUserId, packId)

  const compartments = compartmentsQuery.data ?? []
  const members = (membersQuery.data ?? []).filter(m => m.status === 'ACTIVE')
  const loading = compartmentsQuery.isLoading || membersQuery.isLoading

  if (loading) {
    return (
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tray…
        </div>
      </div>
    )
  }

  if (compartments.length === 0 || members.length === 0) {
    return (
      <div className="border-t border-border bg-card p-4">
        <h4 className="mb-1 text-sm font-semibold">In the tray</h4>
        <p className="text-sm text-muted-foreground">
          {members.length === 0
            ? 'No medicines in this pack yet.'
            : 'Medicines are on the pack, but there is no time slot yet.'}
          {canEditDraft ? ' Use Edit pack to add them.' : ''}
        </p>
        {canEditDraft && (
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit pack
          </Button>
        )}
      </div>
    )
  }

  const unmatched = members.filter(m => {
    const schedules = m.serviceUserMedication?.schedules
    return !compartments.some(c => medMatchesCompartmentDueTime(schedules, c.dueTime))
  })

  return (
    <div className="border-t border-border bg-card p-4">
      <h4 className="mb-1 text-sm font-semibold">In the tray</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Each time pocket and the tablets that belong in it.
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
                {canRecord && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
                    onClick={() => onRecord(compartment)}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Record
                  </button>
                )}
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
            <strong>Not in a time pocket:</strong>{' '}
            {unmatched.map(m => m.serviceUserMedication?.medicationName).filter(Boolean).join(', ')}{' '}
            {unmatched.length === 1 ? 'has' : 'have'} a chart time that does not match a tray slot.
          </div>
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
      <h4 className="mb-2 text-sm font-semibold">When packs arrived</h4>
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

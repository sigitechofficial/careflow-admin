import * as React from 'react'
import { Pencil, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { ServiceUserMedicationRow, MedicationScheduleSummary } from '@/features/service-users/types'
import { medicationRequiresBodyMapFromRow } from '@/features/service-users/medication/medication-body-map-eligibility'
import { MedicationBodyMapSiteBadge } from '@/features/service-users/medication/MedicationBodyMapSiteBadge'
import { useMedicationBodyMapSiteIndex } from '@/features/service-users/body-map/hooks/useMedicationBodyMapSiteIndex'
import {
  medicationEndSourceLabel,
  medicationEndSourceWhen,
} from '@/features/service-users/medication/medication-status-end-display'

type MedicationSlotTableRow = {
  rowKey: string
  medication: ServiceUserMedicationRow
  schedule: MedicationScheduleSummary | null
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function freqLabel(m: ServiceUserMedicationRow): string {
  return m.frequency?.name?.trim() || m.frequencyText?.trim() || '—'
}

function ChartTextCell({ value }: { value?: string | null }) {
  const text = value?.trim()
  if (!text) {
    return <td className="px-3 py-2 text-muted-foreground">—</td>
  }
  return (
    <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground" title={text}>
      {text}
    </td>
  )
}

function isCurrentMedication(m: ServiceUserMedicationRow): boolean {
  return m.status === 'ACTIVE' || m.status === 'PAUSED'
}

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE') {
    return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
  }
  if (status === 'PAUSED') {
    return 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
  }
  if (status === 'ENDED') {
    return 'bg-slate-500/20 text-slate-700 dark:text-slate-200'
  }
  if (status === 'CANCELLED') {
    return 'bg-red-500/15 text-red-800 dark:text-red-200'
  }
  return 'bg-muted text-muted-foreground'
}

type MedicationPackGroup = {
  key: string
  title: string
  rows: ServiceUserMedicationRow[]
}

function groupMedicationsByPack(rows: ServiceUserMedicationRow[]): MedicationPackGroup[] {
  const standalone: ServiceUserMedicationRow[] = []
  const byPack = new Map<string, { name: string; rows: ServiceUserMedicationRow[] }>()
  for (const row of rows) {
    const pack = row.medicationPack
    if (!pack?.id) {
      standalone.push(row)
      continue
    }
    const existing = byPack.get(pack.id)
    if (existing) {
      existing.rows.push(row)
    } else {
      byPack.set(pack.id, { name: pack.name?.trim() || 'Blister pack', rows: [row] })
    }
  }
  const groups: MedicationPackGroup[] = []
  if (standalone.length > 0) {
    groups.push({ key: 'standalone', title: 'Not in a pack', rows: standalone })
  }
  const packGroups = [...byPack.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([id, group]) => ({ key: id, title: group.name, rows: group.rows }))
  groups.push(...packGroups)
  return groups
}

function expandMedicationsToSlotRows(medications: ServiceUserMedicationRow[]): MedicationSlotTableRow[] {
  const out: MedicationSlotTableRow[] = []
  for (const m of medications) {
    const slots = (m.schedules ?? []).filter(s => s.dueTime)
    if (slots.length === 0) {
      out.push({ rowKey: `${m.id}:none`, medication: m, schedule: null })
      continue
    }
    for (const schedule of slots) {
      out.push({ rowKey: `${m.id}:${schedule.id}`, medication: m, schedule })
    }
  }
  return out.sort((a, b) => {
    const nameCmp = a.medication.medicationName.localeCompare(b.medication.medicationName)
    if (nameCmp !== 0) return nameCmp
    return (a.schedule?.dueTime ?? '').localeCompare(b.schedule?.dueTime ?? '')
  })
}

function sectionTitle(medicationCount: number, slotCount: number): string {
  const slotSuffix =
    slotCount !== medicationCount
      ? ` · ${slotCount} administration ${slotCount === 1 ? 'slot' : 'slots'}`
      : ''
  return `(${medicationCount}${slotSuffix})`
}

function MedicationRecordsTable({
  slotRows,
  canEditMedication,
  onEditMedication,
  muted,
  showEndSource,
  serviceUserId,
  bodyMapSiteByMedId,
}: {
  slotRows: MedicationSlotTableRow[]
  canEditMedication: boolean
  onEditMedication: (medication: ServiceUserMedicationRow) => void
  muted?: boolean
  showEndSource?: boolean
  serviceUserId: string
  bodyMapSiteByMedId: ReturnType<typeof useMedicationBodyMapSiteIndex>['byMedicationId']
}) {
  const firstRowKeyByMedId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of slotRows) {
      if (!map.has(row.medication.id)) map.set(row.medication.id, row.rowKey)
    }
    return map
  }, [slotRows])

  const groups = React.useMemo(() => {
    const source = slotRows.map(r => r.medication)
    const unique = source.filter((m, i) => source.findIndex(x => x.id === m.id) === i)
    const showGroups = unique.some(m => m.medicationPack?.id)
    if (!showGroups) {
      return [{ key: 'all', title: null as string | null, slotRows }]
    }
    return groupMedicationsByPack(unique).map(group => ({
      key: group.key,
      title: group.title,
      slotRows: slotRows.filter(r => group.rows.some(m => m.id === r.medication.id)),
    }))
  }, [slotRows])

  if (slotRows.length === 0) return null

  const colCount =
    13 + (showEndSource ? 1 : 0) + (canEditMedication ? 1 : 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Dose / strength</th>
            <th className="px-3 py-2">Route</th>
            <th className="px-3 py-2">How assisted</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Instructions</th>
            <th className="px-3 py-2">Notes</th>
            <th className="px-3 py-2">Frequency</th>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Body map</th>
            {showEndSource && <th className="px-3 py-2">How ended</th>}
            <th className="px-3 py-2">Start</th>
            <th className="px-3 py-2">End</th>
            {canEditMedication && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className={muted ? 'opacity-80' : undefined}>
          {groups.flatMap(group => {
            const heading =
              group.title != null ? (
                <tr key={`${group.key}-heading`} className="border-b border-border bg-muted/50">
                  <td colSpan={colCount} className="px-3 py-2 text-xs font-semibold text-foreground">
                    {group.title}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      ({new Set(group.slotRows.map(r => r.medication.id)).size})
                    </span>
                  </td>
                </tr>
              ) : null
            const body = group.slotRows.map(({ rowKey, medication: m, schedule }) => {
            const showActions = firstRowKeyByMedId.get(m.id) === rowKey
            return (
              <tr key={rowKey} className="border-b border-border/80 last:border-0">
                <td className="px-3 py-2 font-medium">
                  {m.medicationName}
                  {m.medicationKind === 'PRN' && (
                    <span className="ml-1.5 rounded bg-blue-500/15 px-1.5 py-0.5 text-xs font-normal text-blue-900 dark:text-blue-100">
                      PRN
                    </span>
                  )}
                  {m.isControlledMedication && (
                    <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-normal text-amber-900 dark:text-amber-100">
                      CD
                    </span>
                  )}
                  {m.timeCritical && (
                    <span className="ml-1.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-xs font-normal text-rose-900 dark:text-rose-100">
                      Time-sensitive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {[m.dose, m.strength].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{m.route?.name ?? '—'}</td>
                <ChartTextCell value={m.howAssisted} />
                <ChartTextCell value={m.reasonForMedication} />
                <ChartTextCell value={m.instructions} />
                <ChartTextCell value={m.notes} />
                <td className="px-3 py-2 text-muted-foreground">{freqLabel(m)}</td>
                <td className="px-3 py-2 font-medium tabular-nums text-foreground">
                  {schedule?.dueTime ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      statusBadgeClass(String(m.status)),
                    )}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {showActions ? (
                    <MedicationBodyMapSiteBadge
                      serviceUserId={serviceUserId}
                      medicationId={m.id}
                      siteEntry={bodyMapSiteByMedId.get(m.id)}
                      requiresSite={medicationRequiresBodyMapFromRow(m)}
                      compact
                    />
                  ) : null}
                </td>
                {showEndSource && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {medicationEndSourceLabel(m) ?? '—'}
                    {medicationEndSourceWhen(m) ? (
                      <span className="mt-0.5 block text-xs">{medicationEndSourceWhen(m)}</span>
                    ) : null}
                  </td>
                )}
                <td className="px-3 py-2 text-muted-foreground">{formatShortDate(m.startDate)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatShortDate(m.endDate)}</td>
                {canEditMedication && (
                  <td className="px-3 py-2 text-right">
                    {showActions ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1"
                        onClick={() => onEditMedication(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                  </td>
                )}
              </tr>
            )
            })
            return heading ? [heading, ...body] : body
          })}
        </tbody>
      </table>
    </div>
  )
}

function MedicationRecordsSection({
  title,
  rows,
  canAddMedication,
  canEditMedication,
  onAddClick,
  onEditMedication,
  emptyMessage,
  headerTone = 'primary',
  muted,
  serviceUserId,
  bodyMapSiteByMedId,
}: {
  title: string
  rows: ServiceUserMedicationRow[]
  canAddMedication?: boolean
  canEditMedication: boolean
  onAddClick?: () => void
  onEditMedication: (medication: ServiceUserMedicationRow) => void
  emptyMessage?: string
  headerTone?: 'primary' | 'muted'
  muted?: boolean
  serviceUserId: string
  bodyMapSiteByMedId: ReturnType<typeof useMedicationBodyMapSiteIndex>['byMedicationId']
}) {
  const slotRows = React.useMemo(() => expandMedicationsToSlotRows(rows), [rows])

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm font-semibold',
          headerTone === 'primary'
            ? 'bg-teal-800 text-white dark:bg-teal-900'
            : 'bg-muted/60 text-foreground',
        )}
      >
        <span>
          {title} {sectionTitle(rows.length, slotRows.length)}
        </span>
        {canAddMedication && onAddClick && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn(
              'h-8 gap-1',
              headerTone === 'primary'
                ? 'bg-white/15 text-white hover:bg-white/25'
                : undefined,
            )}
            onClick={onAddClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>
      {slotRows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <MedicationRecordsTable
          slotRows={slotRows}
          canEditMedication={canEditMedication}
          onEditMedication={onEditMedication}
          muted={muted}
          showEndSource={muted}
          serviceUserId={serviceUserId}
          bodyMapSiteByMedId={bodyMapSiteByMedId}
        />
      )}
    </div>
  )
}

function MedicationArchivedSection({
  rows,
  canRestore,
  restoringId,
  onRestore,
}: {
  rows: ServiceUserMedicationRow[]
  canRestore: boolean
  restoringId: string | null
  onRestore: (medication: ServiceUserMedicationRow) => void
}) {
  if (rows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-dashed border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground">
        Archived medications ({rows.length})
      </div>
      <ul className="divide-y divide-border">
        {rows.map(m => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
          >
            <div>
              <div className="font-medium text-foreground">{m.medicationName}</div>
              <div className="text-xs text-muted-foreground">
                {[m.dose, m.strength, m.route?.name].filter(Boolean).join(' · ') || '—'}
                {m.deletedAt ? ` · archived ${formatShortDate(m.deletedAt)}` : ''}
              </div>
            </div>
            {canRestore && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                disabled={restoringId === m.id}
                onClick={() => onRestore(m)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {restoringId === m.id ? 'Restoring…' : 'Restore'}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Restored items return to the medication list and MAR. Administration history is kept.
      </p>
    </div>
  )
}

export function MedicationRecordsTab({
  serviceUserId,
  rows,
  archivedRows = [],
  canAddMedication,
  canEditMedication,
  canRestoreMedication = false,
  restoringMedicationId = null,
  onAddClick,
  onEditMedication,
  onRestoreMedication,
}: {
  serviceUserId: string
  rows: ServiceUserMedicationRow[]
  archivedRows?: ServiceUserMedicationRow[]
  canAddMedication: boolean
  canEditMedication: boolean
  canRestoreMedication?: boolean
  restoringMedicationId?: string | null
  onAddClick: () => void
  onEditMedication: (medication: ServiceUserMedicationRow) => void
  onRestoreMedication?: (medication: ServiceUserMedicationRow) => void
}) {
  const { byMedicationId: bodyMapSiteByMedId } = useMedicationBodyMapSiteIndex(serviceUserId)
  const currentRows = React.useMemo(() => rows.filter(isCurrentMedication), [rows])
  const endedRows = React.useMemo(() => rows.filter(m => !isCurrentMedication(m)), [rows])

  const allEmpty = currentRows.length === 0 && endedRows.length === 0

  if (allEmpty) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-teal-800 px-3 py-2 text-sm font-semibold text-white dark:bg-teal-900">
          <span>Current medications (0)</span>
          {canAddMedication && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1 bg-white/15 text-white hover:bg-white/25"
              onClick={onAddClick}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </div>
        <div className="space-y-2 p-4 text-sm text-muted-foreground">
          <p>No medications recorded for this service user.</p>
          {canAddMedication ? (
            <p>
              Use <span className="font-medium text-foreground">Add medication</span> above to record a
              prescription or MAR item.
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MedicationRecordsSection
        title="Current medications"
        rows={currentRows}
        canAddMedication={canAddMedication}
        canEditMedication={canEditMedication}
        onAddClick={onAddClick}
        onEditMedication={onEditMedication}
        emptyMessage="No active or paused medications. Stopped prescriptions appear below."
        serviceUserId={serviceUserId}
        bodyMapSiteByMedId={bodyMapSiteByMedId}
      />
      {endedRows.length > 0 && (
        <MedicationRecordsSection
          title="Ended / cancelled"
          rows={endedRows}
          canEditMedication={canEditMedication}
          onEditMedication={onEditMedication}
          headerTone="muted"
          muted
          serviceUserId={serviceUserId}
          bodyMapSiteByMedId={bodyMapSiteByMedId}
        />
      )}
      {archivedRows.length > 0 && onRestoreMedication && (
        <MedicationArchivedSection
          rows={archivedRows}
          canRestore={canRestoreMedication}
          restoringId={restoringMedicationId}
          onRestore={onRestoreMedication}
        />
      )}
    </div>
  )
}

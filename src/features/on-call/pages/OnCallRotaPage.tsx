import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2, Pencil, PhoneCall, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { useDeleteOnCallShift, useOnCallNow, useOnCallShifts } from '@/features/on-call/hooks/useOnCall'
import { TIER_LABEL, type OnCallShiftRow } from '@/features/on-call/types'
import { OnCallShiftDialog } from '@/features/on-call/components/OnCallShiftDialog'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import {
  addDaysToOperationalIso,
  combineOperationalDateAndHm,
  operationalTodayIso,
} from '@/shared/lib/operational-day.util'

/** Monday of the week containing `dayIso` ('YYYY-MM-DD'). */
function mondayOf(dayIso: string): string {
  const dow = new Date(`${dayIso}T12:00:00Z`).getUTCDay() // 0 = Sun
  return addDaysToOperationalIso(dayIso, -((dow + 6) % 7))
}

export function useBranchOptions(enabled = true) {
  const { data: tree } = useLocationManagementTree(enabled)
  return React.useMemo(() => {
    const seen = new Map<string, string>()
    for (const z of tree?.zones ?? []) {
      for (const b of z.branches ?? []) {
        if (b.locationId && !seen.has(b.locationId)) seen.set(b.locationId, b.locationName ?? b.name)
      }
    }
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [tree])
}

export default function OnCallRotaPage() {
  const canManage = useAuthStore(s => s.can('on_call.manage'))
  const [weekStart, setWeekStart] = React.useState(() => mondayOf(operationalTodayIso()))
  const [dialog, setDialog] = React.useState<{ open: boolean; shift: OnCallShiftRow | null }>({ open: false, shift: null })
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const branchOptions = useBranchOptions()

  const from = combineOperationalDateAndHm(weekStart, '00:00')
  const to = combineOperationalDateAndHm(addDaysToOperationalIso(weekStart, 7), '00:00')
  const shiftsQuery = useOnCallShifts(from, to)
  const nowQuery = useOnCallNow()
  const deleteMutation = useDeleteOnCallShift()
  const removeShift = (id: string) =>
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toastSuccess('On-call shift removed')
        setConfirmDeleteId(null)
      },
      onError: e => toastApiError(e, 'Could not remove the shift'),
    })

  const rows = shiftsQuery.data ?? []
  const now = nowQuery.data ?? []
  const nowLine = (tier: OnCallShiftRow['tier']) =>
    now.filter(s => s.tier === tier).map(s => s.employeeName ?? 'Unknown').join(', ') || 'Nobody'

  return (
    <div className="flex flex-col gap-4" data-testid="on-call-rota-page">
      <PageHeader
        title="On-call rota"
        description="Who answers calls in the evenings, at night, at weekends and on bank holidays while the office is closed."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PhoneCall className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'On-call rota' }]}
      />

      <ContentCard className="grid gap-3 p-4 sm:grid-cols-2" data-testid="on-call-now">
        <div>
          <p className="text-xs font-medium text-muted-foreground">On call now — first line</p>
          <p className="text-base font-semibold text-foreground">{nowQuery.isLoading ? '—' : nowLine('FIRST_LINE')}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">On call now — second line (escalation)</p>
          <p className="text-base font-semibold text-foreground">{nowQuery.isLoading ? '—' : nowLine('SECOND_LINE')}</p>
        </div>
      </ContentCard>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setWeekStart(w => addDaysToOperationalIso(w, -7))} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium" data-testid="on-call-week">
          Week of {formatOrganisationDateTime(from).split(' ')[0]}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => setWeekStart(w => addDaysToOperationalIso(w, 7))} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setWeekStart(mondayOf(operationalTodayIso()))}>
          This week
        </Button>
        {canManage ? (
          <Button type="button" size="sm" className="ml-auto" onClick={() => setDialog({ open: true, shift: null })} data-testid="on-call-add-shift">
            <Plus className="mr-1.5 h-4 w-4" />
            Add on-call shift
          </Button>
        ) : null}
      </div>

      <ContentCard className="overflow-hidden p-0">
        {shiftsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : shiftsQuery.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load the on-call rota.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No on-call shifts this week.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/95">
                <tr className="border-b border-border">
                  {['Starts', 'Ends', 'Line', 'Staff member', 'Branch', 'Notes', ''].map(h => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border align-top last:border-0" data-testid={`on-call-shift-${row.id}`}>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatOrganisationDateTime(row.startsAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatOrganisationDateTime(row.endsAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{TIER_LABEL[row.tier]}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.employeeName ?? '—'}</td>
                    <td className="px-3 py-2.5">{row.locationName ?? 'All branches'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.notes ?? ''}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {canManage ? (
                        confirmDeleteId === row.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Button type="button" size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => removeShift(row.id)}>
                              Remove
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                              Keep
                            </Button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-1">
                            <Button type="button" size="sm" variant="ghost" aria-label="Change shift" onClick={() => setDialog({ open: true, shift: row })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" aria-label="Remove shift" onClick={() => setConfirmDeleteId(row.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <OnCallShiftDialog
        open={dialog.open}
        shift={dialog.shift}
        onClose={() => setDialog({ open: false, shift: null })}
        defaultDay={operationalTodayIso()}
        branchOptions={branchOptions}
      />
    </div>
  )
}

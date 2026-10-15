import * as React from 'react'
import { Baby, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchParentalLeave } from '@/features/parental-leave/api'
import { MAX_PARENTAL_LEAVE_WEEKS } from '@/features/parental-leave/constants'
import { PARENTAL_LEAVE_QUERY_KEY } from '@/features/parental-leave/query-key'
import { ParentalLeaveFormDialog } from '@/features/parental-leave/components/ParentalLeaveFormDialog'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatDate(iso: string): string {
  return DATE_FMT.format(new Date(iso))
}

function statusVariant(status: string): 'success' | 'warning' | 'secondary' {
  if (status === 'Authorised') return 'success'
  if (status === 'Pending') return 'warning'
  return 'secondary'
}

export default function ParentalLeavePage() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const query = useQuery({
    queryKey: PARENTAL_LEAVE_QUERY_KEY,
    queryFn: fetchParentalLeave,
  })
  const rows = query.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parental leave"
        description={`Maternity and paternity leave, approved up to ${MAX_PARENTAL_LEAVE_WEEKS} weeks.`}
        icon={<Baby className="h-4 w-4 text-muted-foreground" aria-hidden />}
        actions={[
          {
            label: 'Record leave',
            onClick: () => setDialogOpen(true),
            icon: <Plus className="h-4 w-4" />,
          },
        ]}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {query.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading parental leave…</p>
        ) : query.isError ? (
          <p className="p-6 text-sm text-destructive">Could not load parental leave records.</p>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Baby className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">No parental leave recorded yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use “Record leave” to add a maternity or paternity leave.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">From</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">To</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Days</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.employeeName}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="info">{row.absenceType}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.fromDateTime)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.toDateTime)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.durationDays}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={statusVariant(row.permissionStatus)}>{row.permissionStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ParentalLeaveFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}

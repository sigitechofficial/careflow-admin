import * as React from 'react'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-elements'
import { getAuditBuffer } from '@/auth/audit'
import { Input } from '@/components/ui/input'

export default function AuditLogPage() {
  const [q, setQ] = React.useState('')
  const rows = React.useMemo(() => {
    const all = getAuditBuffer()
    if (!q.trim()) return all
    const s = q.toLowerCase()
    return all.filter(
      e =>
        e.action.toLowerCase().includes(s) ||
        (e.actorEmail?.toLowerCase().includes(s) ?? false) ||
        e.ip.includes(s)
    )
  }, [q])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Immutable-style activity trail for authentication and security events (client-side demo buffer)."
        icon={<FileText className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Admin' },
          { label: 'Audit' },
        ]}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Input
          placeholder="Filter by action, email, or IP…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="max-w-md h-9"
        />
        <div className="mt-4 max-h-[min(70vh,640px)] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Time</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actor</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{format(e.at, 'dd/MM/yyyy HH:mm:ss')}</td>
                  <td className="px-3 py-2 text-xs">{e.actorEmail ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

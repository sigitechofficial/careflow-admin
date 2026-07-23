import * as React from 'react'
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn, formatDateTime } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserPortalAccounts } from '@/features/service-user-portal/hooks/useServiceUserPortalAdmin'
import type {
  PortalAccountStatusFilter,
  ServiceUserPortalAccountRow,
} from '@/features/service-user-portal/api/portal.api'
import { ServiceUserPortalAccessSection } from '@/features/service-users/components/ServiceUserPortalAccessSection'

function displayName(row: ServiceUserPortalAccountRow): string {
  const legal = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  if (row.preferredName?.trim()) {
    return legal ? `${legal} (${row.preferredName.trim()})` : row.preferredName.trim()
  }
  return legal || '—'
}

function portalStatusBadge(row: ServiceUserPortalAccountRow) {
  if (!row.configured) {
    return <Badge variant="muted">Not configured</Badge>
  }
  if (row.isEnabled) {
    return <Badge variant="success">Enabled</Badge>
  }
  return <Badge variant="secondary">Disabled</Badge>
}

const STATUS_FILTER_OPTIONS: { value: PortalAccountStatusFilter; label: string }[] = [
  { value: 'all', label: 'All active service users' },
  { value: 'configured', label: 'Portal configured' },
  { value: 'not_configured', label: 'Not configured' },
  { value: 'enabled', label: 'Portal enabled' },
  { value: 'disabled', label: 'Portal disabled' },
]

export default function ServiceUserPortalAdminPage() {
  const canManage = useAuthStore(s => s.can('service_users.portal.manage'))
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [portalStatus, setPortalStatus] = React.useState<PortalAccountStatusFilter>('all')
  const [page, setPage] = React.useState(1)
  const [manageRow, setManageRow] = React.useState<ServiceUserPortalAccountRow | null>(null)

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [search])

  const query = useServiceUserPortalAccounts({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    portalStatus,
  })

  const rows = query.data?.data ?? []
  const meta = query.data?.meta
  const summary = query.data?.meta?.summary

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Globe className="h-5 w-5 text-primary" />}
        title="Service user portal"
        description="Provision portal login, manage portal emails, and review sign-in activity for service users."
        actions={[
          {
            label: 'Open portal login',
            icon: <ExternalLink className="h-4 w-4" />,
            onClick: () => window.open('/portal/login', '_blank', 'noopener,noreferrer'),
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
          <Globe className="h-3.5 w-3.5" aria-hidden />
          Self-service hub
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          Login &amp; access
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Sign-in activity
        </span>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Active service users"
            value={summary.totalActive}
            icon={Users}
            tone="sky"
          />
          <SummaryCard
            label="Portal configured"
            value={summary.configured}
            icon={Settings2}
            tone="violet"
          />
          <SummaryCard
            label="Portal enabled"
            value={summary.enabled}
            icon={CheckCircle2}
            tone="emerald"
          />
          <SummaryCard
            label="Never signed in"
            value={summary.neverLoggedIn}
            icon={UserRound}
            tone="amber"
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-4 border-b border-border bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Portal accounts</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Sign in at <code className="rounded bg-muted px-1">/portal/login</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Name, email, or portal login…"
                  className="pl-9"
                  data-testid="portal-admin-search"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Portal status</span>
              <Select
                value={portalStatus}
                onValueChange={v => {
                  setPortalStatus(v as PortalAccountStatusFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger data-testid="portal-admin-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading portal accounts…
          </div>
        ) : query.error ? (
          <p className="p-6 text-sm text-destructive">Could not load portal accounts.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No service users match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Service user</th>
                  <th className="px-4 py-3 font-medium">Portal email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last sign-in</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.serviceUserId} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{displayName(row)}</div>
                      {row.serviceUserEmail ? (
                        <div className="text-xs text-muted-foreground">{row.serviceUserEmail}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.portalEmail ?? '—'}</td>
                    <td className="px-4 py-3">{portalStatusBadge(row)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link
                            to="/service-users/$serviceUserId"
                            params={{ serviceUserId: row.serviceUserId }}
                            search={{ tab: 'personal' }}
                          >
                            View record
                          </Link>
                        </Button>
                        {canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setManageRow(row)}
                            data-testid={`portal-admin-manage-${row.serviceUserId}`}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Manage
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages} · {meta.total} service users
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!meta.hasNextPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={Boolean(manageRow)} onOpenChange={open => !open && setManageRow(null)}>
        <DialogContent size="md" className="gap-0 p-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings2 className="h-4 w-4" aria-hidden />
              </span>
              Manage portal access
            </DialogTitle>
            <DialogDescription>
              {manageRow ? displayName(manageRow) : 'Service user portal settings'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {manageRow ? (
              <ServiceUserPortalAccessSection
                serviceUserId={manageRow.serviceUserId}
                defaultEmail={manageRow.portalEmail ?? manageRow.serviceUserEmail}
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const SUMMARY_TONES = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
} as const

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: keyof typeof SUMMARY_TONES
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            SUMMARY_TONES[tone],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

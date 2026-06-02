import * as React from 'react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { Shield } from 'lucide-react'
import type { IpRule } from '@/features/auth/types'

export default function SecurityAdminPage() {
  const ipAllowlistEnabled = useAuthStore(s => s.ipAllowlistEnabled)
  const setIpAllowlistEnabled = useAuthStore(s => s.setIpAllowlistEnabled)
  const ipRules = useAuthStore(s => s.ipRules)
  const upsertIpRule = useAuthStore(s => s.upsertIpRule)
  const removeIpRule = useAuthStore(s => s.removeIpRule)
  const simulatedClientIp = useAuthStore(s => s.simulatedClientIp)
  const setSimulatedClientIp = useAuthStore(s => s.setSimulatedClientIp)
  const ssoProviders = useAuthStore(s => s.ssoProviders)
  const setSsoEnabled = useAuthStore(s => s.setSsoEnabled)
  const lockedAccounts = useAuthStore(s => s.lockedAccounts)
  const unlockAccount = useAuthStore(s => s.unlockAccount)

  const [cidr, setCidr] = React.useState('203.0.113.0/24')
  const [note, setNote] = React.useState('')

  const addRule = () => {
    if (!cidr.trim()) return
    upsertIpRule({
      id: `ip_${Date.now()}`,
      cidr: cidr.trim(),
      note: note.trim() || undefined,
      enabled: true,
    })
    setNote('')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Security administration"
        description="IP allowlists, single sign-on, and locked accounts. Requires the security.admin permission."
        icon={<Shield className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Admin' },
          { label: 'Security' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">IP restriction</h2>
            <button
              type="button"
              onClick={() => setIpAllowlistEnabled(!ipAllowlistEnabled)}
              className={`h-8 rounded-full border px-3 text-xs font-semibold ${ipAllowlistEnabled ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border bg-muted'}`}
            >
              {ipAllowlistEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, only sign-ins from matching CIDR ranges succeed. Demo client IP is simulated below.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Simulated client IP</label>
            <input
              value={simulatedClientIp}
              onChange={e => setSimulatedClientIp(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-mono"
            />
          </div>
          <div className="flex gap-2">
            <input
              placeholder="CIDR e.g. 10.0.0.0/8"
              value={cidr}
              onChange={e => setCidr(e.target.value)}
              className="h-9 flex-1 rounded-md border border-border px-2 text-sm font-mono"
            />
            <input
              placeholder="Note"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="h-9 flex-1 rounded-md border border-border px-2 text-sm"
            />
            <Button type="button" size="sm" onClick={addRule}>Add</Button>
          </div>
          <ul className="space-y-2 text-sm">
            {ipRules.map((r: IpRule) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <span className="font-mono text-xs">{r.cidr}</span>
                <span className="text-muted-foreground text-xs truncate">{r.note}</span>
                <Button size="sm" variant="ghost" className="shrink-0 text-destructive" onClick={() => removeIpRule(r.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold">Single sign-on</h2>
          <p className="text-xs text-muted-foreground">Toggle IdP connections (demo only — no OAuth round-trip).</p>
          <ul className="space-y-2">
            {ssoProviders.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Client ID {p.clientIdMasked}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSsoEnabled(p.id, !p.enabled)}
                  className={`h-8 rounded-full border px-3 text-xs font-semibold ${p.enabled ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted'}`}
                >
                  {p.enabled ? 'On' : 'Off'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Account lockout</h2>
        <p className="mt-1 text-xs text-muted-foreground">Accounts blocked after repeated failed sign-ins (demo).</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Attempts</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Locked until</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {lockedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No locked accounts.</td>
                </tr>
              ) : (
                lockedAccounts.map(l => (
                  <tr key={l.userId} className="border-b border-border">
                    <td className="px-3 py-2">{l.email}</td>
                    <td className="px-3 py-2">{l.failedAttempts}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {l.lockedUntil ? new Date(l.lockedUntil).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => unlockAccount(l.userId)}>Unlock</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

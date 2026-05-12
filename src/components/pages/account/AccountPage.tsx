import * as React from 'react'
import { format } from 'date-fns'
import { Trash2, User } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-elements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { getAuditBuffer } from '@/auth/audit'
import { cn } from '@/lib/utils'

export default function AccountPage() {
  const user = useAuthStore(s => s.user)
  const updateProfile = useAuthStore(s => s.updateProfile)
  const changePassword = useAuthStore(s => s.changePassword)
  const twoFactorEnabled = useAuthStore(s => s.twoFactorEnabled)
  const setTwoFactorEnabled = useAuthStore(s => s.setTwoFactorEnabled)
  const verifyTwoFactor = useAuthStore(s => s.verifyTwoFactor)
  const devices = useAuthStore(s => s.devices)
  const revokeDevice = useAuthStore(s => s.revokeDevice)
  const trustDevice = useAuthStore(s => s.trustDevice)

  const [name, setName] = React.useState(user?.displayName ?? '')
  const [title, setTitle] = React.useState(user?.jobTitle ?? '')
  const [curPw, setCurPw] = React.useState('')
  const [newPw, setNewPw] = React.useState('')
  const [newPw2, setNewPw2] = React.useState('')
  const [pwMsg, setPwMsg] = React.useState<string | null>(null)
  const [pwErr, setPwErr] = React.useState<string | null>(null)
  const [code, setCode] = React.useState('')
  const [twoFaMsg, setTwoFaMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    setName(user?.displayName ?? '')
    setTitle(user?.jobTitle ?? '')
  }, [user?.displayName, user?.jobTitle])

  const myAudit = React.useMemo(() => {
    if (!user) return []
    return getAuditBuffer().filter(e => e.actorId === user.id || e.actorEmail === user.email)
  }, [user])

  if (!user) return null

  return (
    <div className="space-y-4">
      <PageHeader
        title="My account"
        description="Profile, password, two-factor authentication, trusted devices, and your recent security activity."
        icon={<User className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Account' },
        ]}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Tabs defaultValue="profile" className="p-5">
          <TabsList variant="underline" className="w-full justify-start">
            <TabsTrigger variant="underline" value="profile">Profile</TabsTrigger>
            <TabsTrigger variant="underline" value="password">Password</TabsTrigger>
            <TabsTrigger variant="underline" value="2fa">Two-factor</TabsTrigger>
            <TabsTrigger variant="underline" value="devices">Devices</TabsTrigger>
            <TabsTrigger variant="underline" value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-4 outline-none">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Display name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Job title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input readOnly value={user.email} className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <input readOnly value={user.role.replace('_', ' ')} className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm capitalize text-muted-foreground" />
              </div>
            </div>
            <Button
              onClick={() => {
                updateProfile({ displayName: name, jobTitle: title })
              }}
            >
              Save profile
            </Button>
          </TabsContent>

          <TabsContent value="password" className="mt-6 max-w-md space-y-4 outline-none">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Current password</label>
              <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">New password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Confirm new password</label>
              <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
            {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
            {pwMsg && <p className="text-sm text-success">{pwMsg}</p>}
            <Button
              onClick={() => {
                setPwErr(null)
                setPwMsg(null)
                if (newPw !== newPw2) {
                  setPwErr('New passwords do not match.')
                  return
                }
                const r = changePassword(curPw, newPw)
                if (!r.ok) setPwErr(r.error ?? 'Failed')
                else {
                  setPwMsg('Password updated.')
                  setCurPw('')
                  setNewPw('')
                  setNewPw2('')
                }
              }}
            >
              Change password
            </Button>
          </TabsContent>

          <TabsContent value="2fa" className="mt-6 max-w-lg space-y-4 outline-none">
            <p className="text-sm text-muted-foreground">
              Demo authenticator: enter <span className="font-mono font-medium text-foreground">123456</span> then enable. Disabling turns 2FA off immediately.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Status: {twoFactorEnabled ? 'On' : 'Off'}</span>
              {!twoFactorEnabled && (
                <input
                  placeholder="123456"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="h-9 w-36 rounded-md border border-border px-3 text-sm font-mono"
                />
              )}
              <Button
                size="sm"
                variant={twoFactorEnabled ? 'outline' : 'default'}
                onClick={() => {
                  if (!twoFactorEnabled) {
                    if (verifyTwoFactor(code)) {
                      setTwoFactorEnabled(true)
                      setTwoFaMsg('Two-factor is now on.')
                      setCode('')
                    } else setTwoFaMsg('Invalid code. Use 123456 for this demo.')
                  } else {
                    setTwoFactorEnabled(false)
                    setTwoFaMsg('Two-factor disabled.')
                  }
                }}
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            </div>
            {twoFaMsg && <p className="text-sm text-muted-foreground">{twoFaMsg}</p>}
          </TabsContent>

          <TabsContent value="devices" className="mt-6 outline-none">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Device</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Trusted</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{d.name} · {d.browser}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{d.ip}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className={cn('text-xs underline', d.trusted ? 'text-success' : 'text-muted-foreground')}
                          onClick={() => trustDevice(d.id, !d.trusted)}
                        >
                          {d.trusted ? 'Trusted' : 'Not trusted'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => revokeDevice(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6 outline-none">
            <div className="overflow-x-auto rounded-lg border border-border max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {myAudit.map(a => (
                    <tr key={a.id} className="border-b border-border">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{format(a.at, 'dd/MM/yyyy HH:mm')}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{a.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

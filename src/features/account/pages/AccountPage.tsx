import * as React from 'react'
import { formatDateTime } from '@/shared/lib/utils'
import { Loader2, Trash2, User } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { useAuthStore } from '@/features/auth/store'
import { getAuditBuffer } from '@/features/auth/audit'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { type LoginHistoryRow } from '@/features/auth/types'
import { useLoginHistory, useMe } from '@/features/auth/hooks/useAccount'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'

const hasApi = !!getApiBaseUrl()

export default function AccountPage() {
  const user = useAuthStore(s => s.user)
  const updateProfile = useAuthStore(s => s.updateProfile)
  const changePassword = useAuthStore(s => s.changePassword)
  const applyMeUser = useAuthStore(s => s.applyMeUser)
  const twoFactorEnabled = useAuthStore(s => s.twoFactorEnabled)
  const setTwoFactorEnabled = useAuthStore(s => s.setTwoFactorEnabled)
  const verifyTwoFactor = useAuthStore(s => s.verifyTwoFactor)
  const devices = useAuthStore(s => s.devices)
  const revokeDevice = useAuthStore(s => s.revokeDevice)
  const trustDevice = useAuthStore(s => s.trustDevice)

  const [firstName, setFirstName] = React.useState(user?.firstName ?? '')
  const [lastName, setLastName] = React.useState(user?.lastName ?? '')
  const [name, setName] = React.useState(user?.displayName ?? '')
  const [title, setTitle] = React.useState(user?.jobTitle ?? '')
  const [profileSaving, setProfileSaving] = React.useState(false)

  const meQuery = useMe(hasApi && !!user)
  const profileLoading = hasApi && !!user && meQuery.isLoading
  const loginHistoryQuery = useLoginHistory(hasApi && !!user)
  const loginHistory: LoginHistoryRow[] = loginHistoryQuery.data ?? []
  const activityLoading = loginHistoryQuery.isLoading
  const activityError = loginHistoryQuery.error instanceof Error ? loginHistoryQuery.error.message : null

  React.useEffect(() => {
    setFirstName(user?.firstName ?? '')
    setLastName(user?.lastName ?? '')
    setName(user?.displayName ?? '')
    setTitle(user?.jobTitle ?? '')
  }, [user?.firstName, user?.lastName, user?.displayName, user?.jobTitle])

  React.useEffect(() => {
    if (meQuery.data) applyMeUser(meQuery.data)
  }, [meQuery.data, applyMeUser])

  const [curPw, setCurPw] = React.useState('')
  const [newPw, setNewPw] = React.useState('')
  const [newPw2, setNewPw2] = React.useState('')
  const [pwSaving, setPwSaving] = React.useState(false)
  const [pwMsg, setPwMsg] = React.useState<string | null>(null)
  const [pwErr, setPwErr] = React.useState<string | null>(null)

  const [code, setCode] = React.useState('')
  const [twoFaMsg, setTwoFaMsg] = React.useState<string | null>(null)

  const localAudit = React.useMemo(() => {
    if (!user || hasApi) return []
    return getAuditBuffer().filter(e => e.actorId === user.id || e.actorEmail === user.email)
  }, [user])

  if (!user) return null

  const isTemporaryInspector = user.role === 'temporary_inspector'

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const r = await updateProfile(
        hasApi
          ? { firstName: firstName.trim(), lastName: lastName.trim() }
          : { displayName: name.trim(), jobTitle: title.trim() },
      )
      if (!r.ok) {
        toastApiError(new Error(r.error), 'Could not save profile')
      } else {
        toastSuccess('Profile saved', 'Your account details were updated.')
      }
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwErr(null)
    setPwMsg(null)
    if (newPw !== newPw2) {
      setPwErr('New passwords do not match.')
      return
    }
    setPwSaving(true)
    try {
      const r = await changePassword(curPw, newPw)
      if (!r.ok) setPwErr(r.error ?? 'Failed')
      else {
        setPwMsg('Password updated.')
        setCurPw('')
        setNewPw('')
        setNewPw2('')
        toastSuccess('Password changed', 'Use your new password next time you sign in.')
      }
    } finally {
      setPwSaving(false)
    }
  }

  const activityRows = hasApi
    ? loginHistory.map(row => ({
        id: row.id,
        at: new Date(row.createdAt),
        action: row.event,
        ip: row.ipAddress ?? '—',
        status: row.status,
      }))
    : localAudit.map(a => ({
        id: a.id,
        at: new Date(a.at),
        action: a.action,
        ip: a.ip,
        status: 'local',
      }))

  return (
    <div className="space-y-4">
      <PageHeader
        title="My account"
        description={
          hasApi
            ? 'Update your profile and password. View recent sign-in activity from the server.'
            : 'Profile, password, two-factor authentication, trusted devices, and your recent security activity (demo mode).'
        }
        icon={<User className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Account' },
        ]}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Tabs defaultValue="profile" className="p-5">
          <TabsList variant="underline" className="w-full justify-start">
            <TabsTrigger variant="underline" value="profile">
              Profile
            </TabsTrigger>
            <TabsTrigger variant="underline" value="password" disabled={isTemporaryInspector}>
              Password
            </TabsTrigger>
            {!hasApi ? (
              <>
                <TabsTrigger variant="underline" value="2fa">
                  Two-factor
                </TabsTrigger>
                <TabsTrigger variant="underline" value="devices">
                  Devices
                </TabsTrigger>
              </>
            ) : null}
            <TabsTrigger variant="underline" value="activity">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-4 outline-none">
            {profileLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading profile…
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {hasApi ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="account-first-name">First name</Label>
                        <Input
                          id="account-first-name"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          disabled={isTemporaryInspector}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="account-last-name">Last name</Label>
                        <Input
                          id="account-last-name"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          disabled={isTemporaryInspector}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="account-display-name">Display name</Label>
                        <Input
                          id="account-display-name"
                          value={name}
                          onChange={e => setName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="account-job-title">Job title</Label>
                        <Input
                          id="account-job-title"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="account-email">Email</Label>
                    <Input
                      id="account-email"
                      readOnly
                      value={user.email}
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Role</Label>
                    <Input
                      readOnly
                      value={user.role.replace(/_/g, ' ')}
                      className="bg-muted capitalize text-muted-foreground"
                    />
                  </div>
                </div>
                {!isTemporaryInspector ? (
                  <Button type="button" onClick={() => void handleSaveProfile()} disabled={profileSaving}>
                    {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save profile
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Temporary inspector accounts cannot change profile details here.
                  </p>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="password" className="mt-6 max-w-md space-y-4 outline-none">
            <div className="space-y-1.5">
              <Label htmlFor="account-current-pw">Current password</Label>
              <Input
                id="account-current-pw"
                type="password"
                autoComplete="current-password"
                value={curPw}
                onChange={e => setCurPw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-new-pw">New password</Label>
              <Input
                id="account-new-pw"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-new-pw2">Confirm new password</Label>
              <Input
                id="account-new-pw2"
                type="password"
                autoComplete="new-password"
                value={newPw2}
                onChange={e => setNewPw2(e.target.value)}
              />
            </div>
            {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
            {pwMsg && <p className="text-sm text-teal-700 dark:text-teal-400">{pwMsg}</p>}
            <Button type="button" onClick={() => void handleChangePassword()} disabled={pwSaving}>
              {pwSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Change password
            </Button>
          </TabsContent>

          {!hasApi ? (
            <>
              <TabsContent value="2fa" className="mt-6 max-w-lg space-y-4 outline-none">
                <p className="text-sm text-muted-foreground">
                  Demo authenticator: enter <span className="font-mono font-medium text-foreground">123456</span>{' '}
                  then enable. Disabling turns 2FA off immediately.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Status: {twoFactorEnabled ? 'On' : 'Off'}</span>
                  {!twoFactorEnabled && (
                    <Input
                      placeholder="123456"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      className="h-9 w-36 font-mono"
                    />
                  )}
                  <Button
                    type="button"
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
                          <td className="px-3 py-2">
                            {d.name} · {d.browser}
                          </td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{d.ip}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className={cn('text-xs underline', d.trusted ? 'text-teal-700' : 'text-muted-foreground')}
                              onClick={() => trustDevice(d.id, !d.trusted)}
                            >
                              {d.trusted ? 'Trusted' : 'Not trusted'}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => revokeDevice(d.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </>
          ) : null}

          <TabsContent value="activity" className="mt-6 outline-none">
            {activityLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sign-in history…
              </div>
            ) : activityError ? (
              <p className="text-sm text-destructive">{activityError}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Event</th>
                      {hasApi ? (
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      ) : null}
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityRows.length === 0 ? (
                      <tr>
                        <td colSpan={hasApi ? 4 : 3} className="px-3 py-8 text-center text-muted-foreground">
                          No activity recorded yet.
                        </td>
                      </tr>
                    ) : (
                      activityRows.map(a => (
                        <tr key={a.id} className="border-b border-border">
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(a.at)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
                          {hasApi ? (
                            <td className="px-3 py-2 text-xs capitalize">{a.status}</td>
                          ) : null}
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{a.ip}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {hasApi ? (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loginHistoryQuery.refetch()}>
                Refresh activity
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

import * as React from 'react'
import { Globe, KeyRound, Loader2, LogOut, Mail, Smartphone } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDateTimeGb } from '@/shared/lib/time-format'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import {
  fetchSignInAccess,
  resendSignInLink,
  setSignInAccess,
  setStaffPassword,
  signOutEverywhere,
  type SignInAccessChange,
  type SignInAccessStatus,
  type SignInState,
} from '@/features/employees/api/staff-sign-in-access.api'
import { PasswordChoiceForm, type PasswordChoice } from '@/features/employees/components/PasswordChoiceForm'

const STATE_BADGE: Record<SignInState, { label: string; variant: 'muted' | 'warning' | 'success' | 'outline' }> = {
  none: { label: 'Not given', variant: 'muted' },
  invited: { label: 'Waiting for password', variant: 'warning' },
  active: { label: 'On', variant: 'success' },
  off: { label: 'Switched off', variant: 'outline' },
}

const isOn = (s: SignInState) => s === 'invited' || s === 'active'

export const signInAccessKey = (employeeId: string) => ['employee-sign-in-access', employeeId] as const

/** "Suggested for Carer/Domestic: Care app." from the RBAC level. */
export function suggestionText(status: Pick<SignInAccessStatus, 'rbacLevel' | 'suggested'>): string {
  if (!status.rbacLevel) return 'Choose an RBAC level on the Employment tab and we’ll suggest what they need.'
  const parts = [status.suggested.website ? 'office login' : null, status.suggested.app ? 'Care app' : null].filter(Boolean)
  return `Suggested for ${status.rbacLevel}: ${parts.join(' and ') || 'nothing'}. Both are possible.`
}

function AccessRow({
  icon,
  title,
  description,
  state,
  suggested,
  details,
  canChange,
  cannotChangeReason,
  offConfirmText,
  busy,
  onStart,
  onOff,
  testId,
}: {
  icon: React.ReactNode
  title: string
  description: string
  state: SignInState
  suggested: boolean
  details: React.ReactNode
  canChange: boolean
  cannotChangeReason: string | null
  offConfirmText: string
  busy: boolean
  onStart: () => void
  onOff: () => void
  testId: string
}) {
  const badge = STATE_BADGE[state]
  const on = isOn(state)
  return (
    <div className="rounded-lg border border-border p-3" data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {icon}
            {title}
            <Badge variant={badge.variant} size="sm" data-testid={`${testId}-state`}>
              {badge.label}
            </Badge>
            {suggested && !on ? (
              <Badge variant="info" size="sm">
                Suggested
              </Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {details}
        </div>
        {canChange ? (
          on ? (
            <InlineConfirm title={`Switch off ${title.toLowerCase()}?`} description={offConfirmText} confirmLabel="Switch off" destructive onConfirm={onOff}>
              <Button type="button" size="sm" variant="outline" disabled={busy} data-testid={`${testId}-off`}>
                Switch off
              </Button>
            </InlineConfirm>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={onStart} data-testid={`${testId}-on`}>
              Switch on
            </Button>
          )
        ) : cannotChangeReason ? (
          <p className="max-w-[16rem] text-xs text-muted-foreground">{cannotChangeReason}</p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Staff record › Sign-in access: the office login (CareFlow website) and the Care app, each switched on or off.
 * Switching on emails the person a link to choose a password, or the office sets one now; one password works for both.
 */
export function StaffSignInAccessSection({ employeeId }: { employeeId: string }) {
  const canRead = useAuthStore(s => s.can('employees.read'))
  const canManage = useAuthStore(s => s.can('employees.update'))
  const qc = useQueryClient()
  const key = signInAccessKey(employeeId)
  /** Switching on (which) or setting a password: the panel under the rows. */
  const [panel, setPanel] = React.useState<'website' | 'app' | 'both' | 'password' | null>(null)
  const [choice, setChoice] = React.useState<PasswordChoice | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => fetchSignInAccess(employeeId),
    enabled: canRead && Boolean(employeeId),
  })

  const onDone = (r: SignInAccessChange) => {
    qc.setQueryData(key, r.status)
    setPanel(null)
    toastSuccess(r.message || 'Saved')
  }
  const setMutation = useMutation({
    mutationFn: (body: { website?: boolean; app?: boolean; password?: string }) => setSignInAccess(employeeId, body),
    onSuccess: onDone,
    onError: e => toastApiError(e, 'Sign-in access not changed'),
  })
  const resendMutation = useMutation({
    mutationFn: () => resendSignInLink(employeeId),
    onSuccess: onDone,
    onError: e => toastApiError(e, 'Link not sent'),
  })
  const passwordMutation = useMutation({
    mutationFn: (password: string) => setStaffPassword(employeeId, password),
    onSuccess: onDone,
    onError: e => toastApiError(e, 'Password not set'),
  })
  const signOutMutation = useMutation({
    mutationFn: () => signOutEverywhere(employeeId),
    onSuccess: onDone,
    onError: e => toastApiError(e, 'Could not sign them out'),
  })

  if (!canRead) return null

  const name = data?.firstName?.trim() || 'this person'
  const busy = setMutation.isPending
  const website = data?.website
  const app = data?.app
  const anyOn = Boolean(website && app && (isOn(website.state) || isOn(app.state)))
  const devices = (website?.signedInDevices ?? 0) + (app?.signedInDevices ?? 0)
  const waiting = website?.state === 'invited' || app?.state === 'invited'
  const blockedReason = data && !data.canHaveAccess ? `${data.blockedReason}, so access can’t be switched on.` : null
  const noEmail = data && !data.email ? `Add ${name}’s email on this tab first. The welcome email goes there.` : null

  const lastSeen = (at: string | null, devicesNow: number) =>
    at || devicesNow ? (
      <p className="text-xs text-muted-foreground">
        {at ? `Last signed in ${formatDateTimeGb(at)}` : null}
        {at && devicesNow ? ' · ' : null}
        {devicesNow ? `Signed in on ${devicesNow} device${devicesNow === 1 ? '' : 's'} now` : null}
      </p>
    ) : null

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="staff-sign-in-access">
      <h2 className="text-sm font-semibold text-foreground">Sign-in access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        What {name} can sign in to. We email {name} a link to choose a password, or you can set one now and give it to them. One password works for both.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading sign-in access…</p>
      ) : isError || !data || !website || !app ? (
        <p className="mt-4 text-sm text-destructive">Sign-in access couldn’t be loaded. Try reloading the page.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground" data-testid="sign-in-suggestion">
            {suggestionText(data)}
          </p>
          {blockedReason ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground" role="status">
              {blockedReason}
            </p>
          ) : null}

          <AccessRow
            testId="sign-in-website"
            icon={<Globe className="h-4 w-4 text-primary" aria-hidden />}
            title="Office login (website)"
            description="CareFlow in a web browser, for office work. What they can see follows their RBAC level."
            state={website.state}
            suggested={data.suggested.website}
            details={
              <>
                {website.email ? <p className="text-xs text-muted-foreground">Signs in with {website.email}</p> : null}
                {website.state === 'invited' && website.linkSentAt ? (
                  <p className="text-xs text-muted-foreground">Link emailed {formatDateTimeGb(website.linkSentAt)}</p>
                ) : null}
                {lastSeen(website.lastSignInAt, website.signedInDevices)}
              </>
            }
            canChange={canManage && data.canManageWebsite && (isOn(website.state) || (data.canHaveAccess && Boolean(data.email || website.email))) && !website.isSuperAdmin}
            cannotChangeReason={
              website.isSuperAdmin
                ? 'Super Admin logins are managed in Roles & permissions.'
                : !data.canManageWebsite
                  ? 'You need permission to add office users to change this.'
                  : !isOn(website.state)
                    ? blockedReason ?? (website.email ? null : noEmail)
                    : null
            }
            offConfirmText={`${name} won’t be able to sign in to CareFlow, and is signed out straight away.`}
            busy={busy}
            onStart={() => setPanel('website')}
            onOff={() => setMutation.mutate({ website: false })}
          />

          <AccessRow
            testId="sign-in-app"
            icon={<Smartphone className="h-4 w-4 text-primary" aria-hidden />}
            title="Care app"
            description="The phone app for visits, care plans and messages from the office."
            state={app.state}
            suggested={data.suggested.app}
            details={
              <>
                {app.email ? <p className="text-xs text-muted-foreground">Signs in with {app.email}</p> : null}
                {app.state === 'invited' && app.linkSentAt ? (
                  <p className="text-xs text-muted-foreground">Link emailed {formatDateTimeGb(app.linkSentAt)}</p>
                ) : null}
                {lastSeen(app.lastSignInAt, app.signedInDevices)}
              </>
            }
            canChange={canManage && (isOn(app.state) || (data.canHaveAccess && Boolean(data.email || app.email)))}
            cannotChangeReason={!isOn(app.state) ? blockedReason ?? (app.email ? null : noEmail) : null}
            offConfirmText={`${name} won’t be able to sign in to the Care app, and is signed out on their phone straight away.`}
            busy={busy}
            onStart={() => setPanel('app')}
            onOff={() => setMutation.mutate({ app: false })}
          />

          {canManage &&
          data.canManageWebsite &&
          data.canHaveAccess &&
          data.email &&
          !website.isSuperAdmin &&
          !isOn(website.state) &&
          !isOn(app.state) ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Needs both? Switch them on together: one email, one password.</p>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setPanel('both')} data-testid="sign-in-both-on">
                Switch on both
              </Button>
            </div>
          ) : null}

          {panel ? (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3" data-testid="sign-in-panel">
              <p className="text-sm font-medium text-foreground">
                {panel === 'website'
                  ? `Give ${name} an office login`
                  : panel === 'app'
                    ? `Switch on the Care app for ${name}`
                    : panel === 'both'
                      ? `Give ${name} an office login and the Care app`
                      : `Set a new password for ${name}`}
              </p>
              {panel === 'website' && data.rbacLevel ? (
                <p className="text-xs text-muted-foreground">They’ll see what the {data.rbacLevel} level allows.</p>
              ) : null}
              {panel === 'password' ? (
                <p className="text-xs text-muted-foreground">
                  It replaces their current password on {isOn(website.state) && isOn(app.state) ? 'the website and the Care app' : isOn(website.state) ? 'the website' : 'the Care app'}, and signs them out everywhere. Nothing is emailed.
                </p>
              ) : null}
              <PasswordChoiceForm key={panel} name={name} idPrefix="sign-in" allowLink={panel !== 'password'} onChange={setChoice} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!choice || busy || passwordMutation.isPending}
                  data-testid="sign-in-panel-confirm"
                  onClick={() => {
                    if (!choice) return
                    if (panel === 'password') {
                      if (choice.mode === 'password') passwordMutation.mutate(choice.password)
                      return
                    }
                    const which = panel === 'both' ? { website: true, app: true } : panel === 'website' ? { website: true } : { app: true }
                    setMutation.mutate(choice.mode === 'password' ? { ...which, password: choice.password } : which)
                  }}
                >
                  {busy || passwordMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
                  {panel === 'password' ? 'Set password' : choice?.mode === 'password' ? 'Switch on and email them' : 'Switch on and email the link'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {isOn(website.state) && isOn(app.state) ? (
            <p className="text-xs text-muted-foreground" data-testid="sign-in-one-password">
              {data.onePassword
                ? `${name} uses one password for both. Changing it on the website or in the app changes both.`
                : `The next password ${name} chooses will work for both.`}
            </p>
          ) : null}

          {canManage && (anyOn || devices > 0) ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {anyOn ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={resendMutation.isPending}
                  onClick={() => resendMutation.mutate()}
                  data-testid="sign-in-send-link"
                >
                  {resendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
                  {waiting ? 'Send the link again' : 'Email a password reset link'}
                </Button>
              ) : null}
              {anyOn && (data.canManageWebsite || !isOn(website.state)) ? (
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setPanel('password')} data-testid="sign-in-set-password">
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Set a password
                </Button>
              ) : null}
              {devices > 0 ? (
                <InlineConfirm
                  title="Sign out everywhere?"
                  description={`${name} is signed out of the website and the app on every device. Their access stays on.`}
                  confirmLabel="Sign out"
                  onConfirm={() => signOutMutation.mutate()}
                >
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={signOutMutation.isPending} data-testid="sign-in-sign-out">
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out everywhere
                  </Button>
                </InlineConfirm>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

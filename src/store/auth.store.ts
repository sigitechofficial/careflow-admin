import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { appendAuditEvent, loadAuditFromStorage } from '@/auth/audit'
import { hasPermission as checkPerm, permissionsForRole } from '@/auth/roles'
import { getApiBaseUrl } from '@/lib/api-base'
import { accessTokenExpiryMs, backendLogin, backendMe, backendRefresh, backendTemporaryInspectorLogin } from '@/lib/auth-api'
import type {
  AuditEvent,
  AuthSession,
  AuthUser,
  IpRule,
  LockedAccount,
  Permission,
  RoleId,
  SsoProvider,
  TrustedDevice,
} from '@/auth/types'

const ACCESS_MS = 60 * 60 * 1000
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000
const DEMO_PASSWORD = 'CareAdmin1!'

const MOCK_USERS: Record<
  string,
  { password: string; user: Omit<AuthUser, 'permissions'> & { role: RoleId } }
> = {
  'admin@care.local': {
    password: DEMO_PASSWORD,
    user: {
      id: 'u_admin',
      email: 'admin@care.local',
      displayName: 'Sarah Mitchell',
      role: 'super_admin',
      jobTitle: 'System Administrator',
    },
  },
  'manager@care.local': {
    password: DEMO_PASSWORD,
    user: {
      id: 'u_mgr',
      email: 'manager@care.local',
      displayName: 'James Carter',
      role: 'manager',
      jobTitle: 'Care Manager',
    },
  },
  'staff@care.local': {
    password: DEMO_PASSWORD,
    user: {
      id: 'u_staff',
      email: 'staff@care.local',
      displayName: 'Priya Patel',
      role: 'staff',
      jobTitle: 'Care Worker',
    },
  },
}

function nowIp(): string {
  return typeof window !== 'undefined' && (window as unknown as { __MOCK_IP__?: string }).__MOCK_IP__
    ? String((window as unknown as { __MOCK_IP__: string }).__MOCK_IP__)
    : '192.168.0.10'
}

function parseUa(): string {
  if (typeof navigator === 'undefined') return 'Unknown client'
  return navigator.userAgent.slice(0, 120)
}

function buildUser(row: (typeof MOCK_USERS)[string]): AuthUser {
  const perms = permissionsForRole(row.user.role)
  return { ...row.user, permissions: perms }
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  accessExpiresAt: number
  refreshExpiresAt: number
  user: AuthUser | null
  sessions: AuthSession[]
  devices: TrustedDevice[]
  twoFactorEnabled: boolean
  twoFactorVerifiedAt: number | null
  ipAllowlistEnabled: boolean
  ipRules: IpRule[]
  simulatedClientIp: string
  ssoProviders: SsoProvider[]
  lockedAccounts: LockedAccount[]
  failedByEmail: Record<string, number>
  forgotMessage: string | null

  isAuthenticated: () => boolean
  can: (p: Permission | Permission[]) => boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  /** API mode only: `POST /auth/login/temporary-inspector` with username + password. */
  loginAsTemporaryInspector: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: (reason?: string) => void
  refreshTokens: () => Promise<boolean>
  forgotPassword: (email: string) => void
  resetPassword: (token: string, password: string) => { ok: boolean; error?: string }
  changePassword: (current: string, next: string) => { ok: boolean; error?: string }
  updateProfile: (patch: Partial<Pick<AuthUser, 'displayName' | 'jobTitle'>>) => void
  setTwoFactorEnabled: (on: boolean) => void
  verifyTwoFactor: (code: string) => boolean
  revokeDevice: (id: string) => void
  trustDevice: (id: string, trusted: boolean) => void
  setIpAllowlistEnabled: (on: boolean) => void
  setSimulatedClientIp: (ip: string) => void
  upsertIpRule: (rule: IpRule) => void
  removeIpRule: (id: string) => void
  setSsoEnabled: (id: SsoProvider['id'], enabled: boolean) => void
  unlockAccount: (userId: string) => void
  appendLocalAudit: (e: Omit<AuditEvent, 'id'>) => AuditEvent
  ipAllowedForCurrent: () => boolean
}

function tokenPair() {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
  return { at: `acc_${id}`, rt: `rfs_${id}r` }
}

/** Map Nest role names (e.g. "Super Admin") to UI RoleId for default permission merge. */
function backendRolesToRoleId(roles: string[], accountKind?: string): RoleId {
  if (accountKind === 'temporary_inspector') return 'temporary_inspector'
  const lower = roles.map(r => r.toLowerCase())
  if (lower.some(r => r.includes('super') && r.includes('admin'))) return 'super_admin'
  if (lower.some(r => r === 'admin')) return 'admin'
  if (lower.some(r => r.includes('manager'))) return 'manager'
  if (lower.some(r => r.includes('auditor'))) return 'auditor'
  return 'staff'
}

function seedSso(): SsoProvider[] {
  return [
    { id: 'microsoft', name: 'Microsoft Entra ID', enabled: false, clientIdMasked: '••••••••' },
    { id: 'google', name: 'Google Workspace', enabled: false, clientIdMasked: '••••••••' },
    { id: 'okta', name: 'Okta', enabled: false, clientIdMasked: '••••••••' },
  ]
}

function defaultIpRules(): IpRule[] {
  return [
    { id: 'ip1', cidr: '192.168.0.0/16', note: 'Office LAN', enabled: true },
    { id: 'ip2', cidr: '10.0.0.0/8', note: 'VPN', enabled: true },
  ]
}

function cidrMatch(ip: string, cidr: string): boolean {
  const [base, raw] = cidr.split('/')
  const bits = parseInt(raw ?? '32', 10)
  if (!base) return ip === cidr
  const a = ip.split('.')
  const b = base.split('.')
  if (a.length !== 4 || b.length !== 4) return ip === base
  const fullOctets = Math.floor(bits / 8)
  for (let i = 0; i < fullOctets; i++) if (a[i] !== b[i]) return false
  return true
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: 0,
      refreshExpiresAt: 0,
      user: null,
      sessions: [],
      devices: [],
      twoFactorEnabled: false,
      twoFactorVerifiedAt: null,
      ipAllowlistEnabled: false,
      ipRules: defaultIpRules(),
      simulatedClientIp: '192.168.0.10',
      ssoProviders: seedSso(),
      lockedAccounts: [],
      failedByEmail: {},
      forgotMessage: null,

      isAuthenticated: () => {
        const s = get()
        return !!s.accessToken && Date.now() < s.accessExpiresAt
      },

      can: (p) => {
        const u = get().user
        if (!u) return false
        return checkPerm(u.permissions, p)
      },

      appendLocalAudit: e => appendAuditEvent(e),

      ipAllowedForCurrent: () => {
        const s = get()
        if (!s.ipAllowlistEnabled) return true
        const ip = s.simulatedClientIp
        return s.ipRules.filter(r => r.enabled).some(r => cidrMatch(ip, r.cidr))
      },

      login: async (email, password) => {
        const key = email.trim().toLowerCase()

        if (getApiBaseUrl()) {
          const fails = get().failedByEmail[key] ?? 0
          if (fails >= 5) {
            return { ok: false, error: 'Account temporarily locked. Try again later or contact an administrator.' }
          }
          if (!get().ipAllowedForCurrent()) {
            get().appendLocalAudit({
              at: Date.now(),
              actorId: null,
              actorEmail: key,
              action: 'auth.login.denied_ip',
              ip: nowIp(),
            })
            return { ok: false, error: 'Sign-in blocked from this IP address (allowlist enabled).' }
          }
          try {
            const { accessToken, refreshToken } = await backendLogin(key, password)
            const me = await backendMe(accessToken)
            const mappedRole = backendRolesToRoleId(me.roles, me.accountKind)
            const mergedPerms = Array.from(
              new Set([...permissionsForRole(mappedRole), ...(me.permissions as unknown as Permission[])])
            )
            const displayName =
              me.accountKind === 'temporary_inspector'
                ? [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username || 'Temporary inspector'
                : me.email.split('@')[0] || me.email
            const user: AuthUser = {
              id: me.id,
              email: me.email,
              displayName,
              role: mappedRole,
              permissions: mergedPerms,
            }
            const t = Date.now()
            const accessExpiresAt = accessTokenExpiryMs(accessToken) ?? t + ACCESS_MS
            const refreshExpiresAt = accessTokenExpiryMs(refreshToken) ?? t + REFRESH_MS
            const session: AuthSession = {
              id: `ses_${t}`,
              startedAt: t,
              lastSeenAt: t,
              ip: nowIp(),
              userAgent: parseUa(),
              label: 'This device',
              current: true,
            }
            const device: TrustedDevice = {
              id: `dev_${t}`,
              name: 'Current browser',
              browser: /Chrome/.test(parseUa()) ? 'Chrome' : 'Browser',
              os: /Win/.test(parseUa()) ? 'Windows' : 'OS',
              ip: nowIp(),
              lastSeenAt: t,
              trusted: true,
            }
            set({
              accessToken,
              refreshToken,
              accessExpiresAt,
              refreshExpiresAt,
              user,
              sessions: [session],
              devices: [device],
              failedByEmail: { ...get().failedByEmail, [key]: 0 },
              forgotMessage: null,
            })
            get().appendLocalAudit({
              at: Date.now(),
              actorId: user.id,
              actorEmail: user.email,
              action: 'auth.login.success',
              ip: nowIp(),
              meta: { mode: 'api' },
            })
            return { ok: true }
          } catch (e) {
            set(state => ({
              failedByEmail: { ...state.failedByEmail, [key]: (state.failedByEmail[key] ?? 0) + 1 },
            }))
            get().appendLocalAudit({
              at: Date.now(),
              actorId: null,
              actorEmail: key,
              action: 'auth.login.failed',
              ip: nowIp(),
              meta: { mode: 'api' },
            })
            const msg = e instanceof Error ? e.message : 'Sign-in failed.'
            return { ok: false, error: msg }
          }
        }

        const row = MOCK_USERS[key]
        const fails = get().failedByEmail[key] ?? 0
        if (fails >= 5) {
          const lock: LockedAccount = {
            userId: row?.user.id ?? 'unknown',
            email: key,
            failedAttempts: fails,
            lockedUntil: Date.now() + 15 * 60 * 1000,
            reason: 'Too many failed attempts',
          }
          set(state => ({
            lockedAccounts: [
              lock,
              ...state.lockedAccounts.filter(l => l.email !== key),
            ],
          }))
          get().appendLocalAudit({
            at: Date.now(),
            actorId: null,
            actorEmail: key,
            action: 'auth.lockout.triggered',
            ip: nowIp(),
            meta: { email: key },
          })
          return { ok: false, error: 'Account temporarily locked. Try again later or contact an administrator.' }
        }
        if (!row || row.password !== password) {
          set(state => ({
            failedByEmail: { ...state.failedByEmail, [key]: fails + 1 },
          }))
          get().appendLocalAudit({
            at: Date.now(),
            actorId: null,
            actorEmail: key,
            action: 'auth.login.failed',
            ip: nowIp(),
          })
          return { ok: false, error: 'Invalid email or password.' }
        }
        if (!get().ipAllowedForCurrent()) {
          get().appendLocalAudit({
            at: Date.now(),
            actorId: null,
            actorEmail: key,
            action: 'auth.login.denied_ip',
            ip: nowIp(),
          })
          return { ok: false, error: 'Sign-in blocked from this IP address (allowlist enabled).' }
        }
        const { at, rt } = tokenPair()
        const t = Date.now()
        const user = buildUser(row)
        const session: AuthSession = {
          id: `ses_${t}`,
          startedAt: t,
          lastSeenAt: t,
          ip: nowIp(),
          userAgent: parseUa(),
          label: 'This device',
          current: true,
        }
        const device: TrustedDevice = {
          id: `dev_${t}`,
          name: 'Current browser',
          browser: /Chrome/.test(parseUa()) ? 'Chrome' : 'Browser',
          os: /Win/.test(parseUa()) ? 'Windows' : 'OS',
          ip: nowIp(),
          lastSeenAt: t,
          trusted: true,
        }
        set({
          accessToken: at,
          refreshToken: rt,
          accessExpiresAt: t + ACCESS_MS,
          refreshExpiresAt: t + REFRESH_MS,
          user,
          sessions: [session],
          devices: [device],
          failedByEmail: { ...get().failedByEmail, [key]: 0 },
          forgotMessage: null,
        })
        get().appendLocalAudit({
          at: Date.now(),
          actorId: user.id,
          actorEmail: user.email,
          action: 'auth.login.success',
          ip: nowIp(),
        })
        return { ok: true }
      },

      loginAsTemporaryInspector: async (username, password) => {
        const key = `ti:${username.trim().toLowerCase()}`
        if (!getApiBaseUrl()) {
          return { ok: false, error: 'Temporary inspector sign-in requires VITE_API_BASE_URL (API mode).' }
        }
        const fails = get().failedByEmail[key] ?? 0
        if (fails >= 5) {
          return { ok: false, error: 'Too many failed attempts. Try again later or contact an administrator.' }
        }
        if (!get().ipAllowedForCurrent()) {
          get().appendLocalAudit({
            at: Date.now(),
            actorId: null,
            actorEmail: key,
            action: 'auth.login.denied_ip',
            ip: nowIp(),
          })
          return { ok: false, error: 'Sign-in blocked from this IP address (allowlist enabled).' }
        }
        try {
          const { accessToken, refreshToken } = await backendTemporaryInspectorLogin(username, password)
          const me = await backendMe(accessToken)
          const mappedRole = backendRolesToRoleId(me.roles, me.accountKind)
          const mergedPerms = Array.from(
            new Set([...permissionsForRole(mappedRole), ...(me.permissions as unknown as Permission[])]),
          )
          const displayName =
            me.accountKind === 'temporary_inspector'
              ? [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username || 'Temporary inspector'
              : me.email.split('@')[0] || me.email
          const user: AuthUser = {
            id: me.id,
            email: me.email,
            displayName,
            role: mappedRole,
            permissions: mergedPerms,
          }
          const t = Date.now()
          const accessExpiresAt = accessTokenExpiryMs(accessToken) ?? t + ACCESS_MS
          const refreshExpiresAt = accessTokenExpiryMs(refreshToken) ?? t + REFRESH_MS
          const session: AuthSession = {
            id: `ses_${t}`,
            startedAt: t,
            lastSeenAt: t,
            ip: nowIp(),
            userAgent: parseUa(),
            label: 'This device',
            current: true,
          }
          const device: TrustedDevice = {
            id: `dev_${t}`,
            name: 'Current browser',
            browser: /Chrome/.test(parseUa()) ? 'Chrome' : 'Browser',
            os: /Win/.test(parseUa()) ? 'Windows' : 'OS',
            ip: nowIp(),
            lastSeenAt: t,
            trusted: true,
          }
          set({
            accessToken,
            refreshToken,
            accessExpiresAt,
            refreshExpiresAt,
            user,
            sessions: [session],
            devices: [device],
            failedByEmail: { ...get().failedByEmail, [key]: 0 },
            forgotMessage: null,
          })
          get().appendLocalAudit({
            at: Date.now(),
            actorId: user.id,
            actorEmail: key,
            action: 'auth.login.success',
            ip: nowIp(),
            meta: { mode: 'api', temporaryInspector: true },
          })
          return { ok: true }
        } catch (e) {
          set(state => ({
            failedByEmail: { ...state.failedByEmail, [key]: (state.failedByEmail[key] ?? 0) + 1 },
          }))
          get().appendLocalAudit({
            at: Date.now(),
            actorId: null,
            actorEmail: key,
            action: 'auth.login.failed',
            ip: nowIp(),
            meta: { mode: 'api', temporaryInspector: true },
          })
          const msg = e instanceof Error ? e.message : 'Sign-in failed.'
          return { ok: false, error: msg }
        }
      },

      logout: (reason = 'user') => {
        const u = get().user
        get().appendLocalAudit({
          at: Date.now(),
          actorId: u?.id ?? null,
          actorEmail: u?.email ?? null,
          action: 'auth.logout',
          ip: nowIp(),
          meta: { reason },
        })
        set({
          accessToken: null,
          refreshToken: null,
          accessExpiresAt: 0,
          refreshExpiresAt: 0,
          user: null,
          sessions: [],
          devices: [],
          twoFactorVerifiedAt: null,
        })
      },

      refreshTokens: async () => {
        const s = get()
        if (!s.refreshToken || Date.now() > s.refreshExpiresAt) return false
        const t = Date.now()

        if (getApiBaseUrl() && s.refreshToken.includes('.')) {
          try {
            const { accessToken, refreshToken } = await backendRefresh(s.refreshToken)
            const accessExpiresAt = accessTokenExpiryMs(accessToken) ?? t + ACCESS_MS
            const refreshExpiresAt = accessTokenExpiryMs(refreshToken) ?? t + REFRESH_MS
            set({
              accessToken,
              refreshToken,
              accessExpiresAt,
              refreshExpiresAt,
            })
            get().appendLocalAudit({
              at: t,
              actorId: s.user?.id ?? null,
              actorEmail: s.user?.email ?? null,
              action: 'auth.token.refreshed',
              ip: nowIp(),
              meta: { mode: 'api' },
            })
            return true
          } catch {
            return false
          }
        }

        const { at, rt } = tokenPair()
        set({
          accessToken: at,
          refreshToken: rt,
          accessExpiresAt: t + ACCESS_MS,
          refreshExpiresAt: t + REFRESH_MS,
        })
        get().appendLocalAudit({
          at: t,
          actorId: s.user?.id ?? null,
          actorEmail: s.user?.email ?? null,
          action: 'auth.token.refreshed',
          ip: nowIp(),
        })
        return true
      },

      forgotPassword: (email) => {
        get().appendLocalAudit({
          at: Date.now(),
          actorId: null,
          actorEmail: email.trim().toLowerCase(),
          action: 'auth.password.forgot_requested',
          ip: nowIp(),
        })
        set({
          forgotMessage:
            'If an account exists for that email, a reset link has been queued (demo: no email is sent).',
        })
      },

      resetPassword: (_token, password) => {
        if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
        get().appendLocalAudit({
          at: Date.now(),
          actorId: get().user?.id ?? null,
          actorEmail: get().user?.email ?? null,
          action: 'auth.password.reset_completed',
          ip: nowIp(),
        })
        return { ok: true }
      },

      changePassword: (current, next) => {
        const u = get().user
        if (!u) return { ok: false, error: 'Not signed in.' }
        const row = MOCK_USERS[u.email.toLowerCase()]
        if (!row || row.password !== current) return { ok: false, error: 'Current password is incorrect.' }
        if (next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' }
        MOCK_USERS[u.email.toLowerCase()] = { ...row, password: next }
        get().appendLocalAudit({
          at: Date.now(),
          actorId: u.id,
          actorEmail: u.email,
          action: 'auth.password.changed',
          ip: nowIp(),
        })
        return { ok: true }
      },

      updateProfile: patch => {
        const u = get().user
        if (!u) return
        set({ user: { ...u, ...patch } })
        get().appendLocalAudit({
          at: Date.now(),
          actorId: u.id,
          actorEmail: u.email,
          action: 'profile.updated',
          ip: nowIp(),
          meta: patch as Record<string, unknown>,
        })
      },

      setTwoFactorEnabled: on => {
        set({ twoFactorEnabled: on, twoFactorVerifiedAt: on ? Date.now() : null })
        get().appendLocalAudit({
          at: Date.now(),
          actorId: get().user?.id ?? null,
          actorEmail: get().user?.email ?? null,
          action: on ? 'auth.2fa.enabled' : 'auth.2fa.disabled',
          ip: nowIp(),
        })
      },

      verifyTwoFactor: code => {
        if (code === '123456') {
          set({ twoFactorVerifiedAt: Date.now() })
          return true
        }
        return false
      },

      revokeDevice: id => {
        set(state => ({ devices: state.devices.filter(d => d.id !== id) }))
        get().appendLocalAudit({
          at: Date.now(),
          actorId: get().user?.id ?? null,
          actorEmail: get().user?.email ?? null,
          action: 'device.revoked',
          ip: nowIp(),
          meta: { deviceId: id },
        })
      },

      trustDevice: (id, trusted) => {
        set(state => ({
          devices: state.devices.map(d => (d.id === id ? { ...d, trusted } : d)),
        }))
      },

      setIpAllowlistEnabled: on => {
        set({ ipAllowlistEnabled: on })
        get().appendLocalAudit({
          at: Date.now(),
          actorId: get().user?.id ?? null,
          actorEmail: get().user?.email ?? null,
          action: on ? 'security.ip_allowlist.enabled' : 'security.ip_allowlist.disabled',
          ip: nowIp(),
        })
      },

      setSimulatedClientIp: ip => {
        set({ simulatedClientIp: ip })
      },

      upsertIpRule: rule => {
        set(state => ({
          ipRules: [rule, ...state.ipRules.filter(r => r.id !== rule.id)],
        }))
      },

      removeIpRule: id => {
        set(state => ({ ipRules: state.ipRules.filter(r => r.id !== id) }))
      },

      setSsoEnabled: (id, enabled) => {
        set(state => ({
          ssoProviders: state.ssoProviders.map(p => (p.id === id ? { ...p, enabled } : p)),
        }))
        get().appendLocalAudit({
          at: Date.now(),
          actorId: get().user?.id ?? null,
          actorEmail: get().user?.email ?? null,
          action: 'sso.toggled',
          ip: nowIp(),
          meta: { id, enabled },
        })
      },

      unlockAccount: userId => {
        const acc = get().lockedAccounts.find(l => l.userId === userId)
        set(state => ({
          lockedAccounts: state.lockedAccounts.filter(l => l.userId !== userId),
          failedByEmail: acc
            ? { ...state.failedByEmail, [acc.email]: 0 }
            : state.failedByEmail,
        }))
        get().appendLocalAudit({
          at: Date.now(),
          actorId: get().user?.id ?? null,
          actorEmail: get().user?.email ?? null,
          action: 'security.account.unlocked',
          ip: nowIp(),
          meta: { userId },
        })
      },
    }),
    {
      name: 'care-admin-auth',
      partialize: state => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessExpiresAt: state.accessExpiresAt,
        refreshExpiresAt: state.refreshExpiresAt,
        user: state.user,
        twoFactorEnabled: state.twoFactorEnabled,
        ipAllowlistEnabled: state.ipAllowlistEnabled,
        ipRules: state.ipRules,
        simulatedClientIp: state.simulatedClientIp,
        ssoProviders: state.ssoProviders,
        lockedAccounts: state.lockedAccounts,
        failedByEmail: state.failedByEmail,
        devices: state.devices,
        sessions: state.sessions,
      }),
      onRehydrateStorage: () => () => {
        loadAuditFromStorage()
      },
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { appendAuditEvent, loadAuditFromStorage } from '@/features/auth/audit'
import { hasPermission as checkPerm, permissionsForRole } from '@/features/auth/roles'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import {
  accessTokenExpiryMs,
  backendChangePassword,
  backendLogin,
  backendMe,
  backendRefresh,
  backendServiceUserPortalLogin,
  backendTemporaryInspectorLogin,
  backendUpdateProfile,
  type BackendMeUser,
} from '@/features/auth/api'
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
} from '@/features/auth/types'

const ACCESS_MS = 60 * 60 * 1000
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000
const DEMO_PASSWORD = 'CareAdmin1!'
const MAX_FAILED_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000
const LOGIN_LOCKOUT_MESSAGE =
  'Account temporarily locked. Try again later or contact an administrator.'

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

function loginFailureCountsTowardLockout(error: unknown): boolean {
  if (error instanceof TypeError) return false
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  if (!msg) return false
  if (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('econnrefused') ||
    msg.includes('not set')
  ) {
    return false
  }
  return msg.includes('invalid credentials') || msg.includes('unauthorized')
}

function pruneExpiredLoginLocks(lockedAccounts: LockedAccount[], now = Date.now()): LockedAccount[] {
  // A null `lockedUntil` is a permanent lock (no auto-expiry) and is never pruned.
  return lockedAccounts.filter(l => l.lockedUntil === null || l.lockedUntil > now)
}

function resolveLoginLockState(
  email: string,
  failedByEmail: Record<string, number>,
  lockedAccounts: LockedAccount[],
): { locked: boolean; failedByEmail: Record<string, number>; lockedAccounts: LockedAccount[] } {
  const now = Date.now()
  const prunedLocks = pruneExpiredLoginLocks(lockedAccounts, now)
  const fails = failedByEmail[email] ?? 0
  if (fails < MAX_FAILED_LOGIN_ATTEMPTS) {
    return { locked: false, failedByEmail, lockedAccounts: prunedLocks }
  }
  const lock = prunedLocks.find(l => l.email === email)
  // No lock, or a time-limited lock whose expiry has passed → clear it. A null (permanent) lock stays locked.
  if (!lock || (lock.lockedUntil !== null && now >= lock.lockedUntil)) {
    return {
      locked: false,
      failedByEmail: { ...failedByEmail, [email]: 0 },
      lockedAccounts: prunedLocks.filter(l => l.email !== email),
    }
  }
  return { locked: true, failedByEmail, lockedAccounts: prunedLocks }
}

function registerLoginFailure(
  email: string,
  userId: string,
  state: Pick<AuthState, 'failedByEmail' | 'lockedAccounts'>,
): Pick<AuthState, 'failedByEmail' | 'lockedAccounts'> {
  const fails = (state.failedByEmail[email] ?? 0) + 1
  const failedByEmail = { ...state.failedByEmail, [email]: fails }
  if (fails < MAX_FAILED_LOGIN_ATTEMPTS) {
    return { failedByEmail, lockedAccounts: state.lockedAccounts }
  }
  const lock: LockedAccount = {
    userId,
    email,
    failedAttempts: fails,
    lockedUntil: Date.now() + LOGIN_LOCKOUT_MS,
    reason: 'Too many failed attempts',
  }
  return {
    failedByEmail,
    lockedAccounts: [lock, ...state.lockedAccounts.filter(l => l.email !== email)],
  }
}

function clearLoginFailures(
  email: string,
  state: Pick<AuthState, 'failedByEmail' | 'lockedAccounts'>,
): Pick<AuthState, 'failedByEmail' | 'lockedAccounts'> {
  return {
    failedByEmail: { ...state.failedByEmail, [email]: 0 },
    lockedAccounts: state.lockedAccounts.filter(l => l.email !== email),
  }
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
  isServiceUser: () => boolean
  can: (p: Permission | Permission[]) => boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  /** API mode only: `POST /auth/login/temporary-inspector` with username + password. */
  loginAsTemporaryInspector: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  /** API mode only: `POST /auth/service-user/login` with email + password. */
  loginAsServiceUser: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: (reason?: string) => void
  refreshTokens: () => Promise<boolean>
  forgotPassword: (email: string) => void
  resetPassword: (token: string, password: string) => { ok: boolean; error?: string }
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>
  updateProfile: (
    patch: Partial<Pick<AuthUser, 'displayName' | 'jobTitle' | 'firstName' | 'lastName'>>,
  ) => Promise<{ ok: boolean; error?: string }>
  applyMeUser: (me: BackendMeUser) => void
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
  if (accountKind === 'service_user') return 'service_user'
  const lower = roles.map(r => r.toLowerCase())
  if (lower.some(r => r.includes('super') && r.includes('admin'))) return 'super_admin'
  if (lower.some(r => r === 'admin' || r === 'administrator' || r === 'system admin')) return 'admin'
  if (lower.some(r => r.includes('manager'))) return 'manager'
  if (lower.some(r => r.includes('auditor'))) return 'auditor'
  return 'staff'
}

function mergeBackendPermissions(mappedRole: RoleId, apiPermissions: string[]): Permission[] {
  return Array.from(
    new Set([...permissionsForRole(mappedRole), ...(apiPermissions as unknown as Permission[])]),
  )
}

function userFromMe(me: BackendMeUser, prev?: AuthUser | null): AuthUser {
  const mappedRole = backendRolesToRoleId(me.roles, me.accountKind)
  const mergedPerms = mergeBackendPermissions(mappedRole, me.permissions)
  const displayName =
    me.accountKind === 'temporary_inspector'
      ? [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username || 'Temporary inspector'
      : me.accountKind === 'service_user'
        ? me.preferredName?.trim() ||
          [me.firstName, me.lastName].filter(Boolean).join(' ') ||
          me.email.split('@')[0] ||
          me.email
        : [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email.split('@')[0] || me.email
  return {
    id: me.id,
    email: me.email,
    displayName,
    firstName: me.firstName,
    lastName: me.lastName,
    role: mappedRole,
    permissions: mergedPerms,
    accountKind: me.accountKind,
    serviceUserId: me.serviceUserId,
    preferredName: me.preferredName,
    profilePhotoUrl: me.profilePhotoUrl,
    jobTitle: prev?.jobTitle,
    assignedLocationIds: me.assignedLocationIds ?? null,
  }
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

      isServiceUser: () => get().user?.accountKind === 'service_user' || get().user?.role === 'service_user',

      can: (p) => {
        const u = get().user
        if (!u) return false
        if (u.role === 'super_admin') return true
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
          const lockState = resolveLoginLockState(key, get().failedByEmail, get().lockedAccounts)
          if (
            lockState.failedByEmail !== get().failedByEmail ||
            lockState.lockedAccounts !== get().lockedAccounts
          ) {
            set({
              failedByEmail: lockState.failedByEmail,
              lockedAccounts: lockState.lockedAccounts,
            })
          }
          if (lockState.locked) {
            return { ok: false, error: LOGIN_LOCKOUT_MESSAGE }
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
            const user = userFromMe(me)
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
              ...clearLoginFailures(key, get()),
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
            if (loginFailureCountsTowardLockout(e)) {
              const next = registerLoginFailure(key, 'unknown', get())
              set(next)
              if ((next.failedByEmail[key] ?? 0) >= MAX_FAILED_LOGIN_ATTEMPTS) {
                get().appendLocalAudit({
                  at: Date.now(),
                  actorId: null,
                  actorEmail: key,
                  action: 'auth.lockout.triggered',
                  ip: nowIp(),
                  meta: { email: key, mode: 'api' },
                })
              }
            }
            get().appendLocalAudit({
              at: Date.now(),
              actorId: null,
              actorEmail: key,
              action: 'auth.login.failed',
              ip: nowIp(),
              meta: { mode: 'api' },
            })
            const msg = e instanceof Error ? e.message : 'Sign-in failed.'
            if ((get().failedByEmail[key] ?? 0) >= MAX_FAILED_LOGIN_ATTEMPTS) {
              return { ok: false, error: LOGIN_LOCKOUT_MESSAGE }
            }
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
          const user = userFromMe(me)
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

      loginAsServiceUser: async (email, password) => {
        const key = email.trim().toLowerCase()
        if (!getApiBaseUrl()) {
          return { ok: false, error: 'Service user sign-in requires VITE_API_BASE_URL (API mode).' }
        }
        const fails = get().failedByEmail[key] ?? 0
        if (fails >= 5) {
          return { ok: false, error: 'Too many failed attempts. Try again later or contact your care team.' }
        }
        if (!get().ipAllowedForCurrent()) {
          return { ok: false, error: 'Sign-in blocked from this IP address (allowlist enabled).' }
        }
        try {
          const { accessToken, refreshToken } = await backendServiceUserPortalLogin(key, password)
          const me = await backendMe(accessToken)
          const user = userFromMe(me)
          const t = Date.now()
          const accessExpiresAt = accessTokenExpiryMs(accessToken) ?? t + ACCESS_MS
          const refreshExpiresAt = accessTokenExpiryMs(refreshToken) ?? t + REFRESH_MS
          set({
            accessToken,
            refreshToken,
            accessExpiresAt,
            refreshExpiresAt,
            user,
            sessions: [],
            devices: [],
            failedByEmail: { ...get().failedByEmail, [key]: 0 },
            forgotMessage: null,
          })
          return { ok: true }
        } catch (e) {
          set(state => ({
            failedByEmail: { ...state.failedByEmail, [key]: (state.failedByEmail[key] ?? 0) + 1 },
          }))
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
            let userPatch: Partial<Pick<AuthState, 'user'>> = {}
            if (s.user) {
              try {
                const me = await backendMe(accessToken)
                userPatch = { user: userFromMe(me, s.user) }
              } catch {
                // Keep existing user on transient /me failure after refresh
              }
            }
            set({
              accessToken,
              refreshToken,
              accessExpiresAt,
              refreshExpiresAt,
              ...userPatch,
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

      changePassword: async (current, next) => {
        const u = get().user
        if (!u) return { ok: false, error: 'Not signed in.' }
        if (next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' }

        if (getApiBaseUrl()) {
          try {
            await backendChangePassword(current, next)
            get().appendLocalAudit({
              at: Date.now(),
              actorId: u.id,
              actorEmail: u.email,
              action: 'auth.password.changed',
              ip: nowIp(),
              meta: { mode: 'api' },
            })
            return { ok: true }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Password change failed.'
            return { ok: false, error: msg }
          }
        }

        const row = MOCK_USERS[u.email.toLowerCase()]
        if (!row || row.password !== current) return { ok: false, error: 'Current password is incorrect.' }
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

      applyMeUser: me => {
        const prev = get().user
        if (!prev || prev.id !== me.id) return
        set({ user: userFromMe(me, prev) })
      },

      updateProfile: async patch => {
        const u = get().user
        if (!u) return { ok: false, error: 'Not signed in.' }

        if (getApiBaseUrl()) {
          try {
            const me = await backendUpdateProfile({
              firstName: patch.firstName ?? patch.displayName?.split(/\s+/)[0],
              lastName: patch.lastName ?? patch.displayName?.split(/\s+/).slice(1).join(' '),
            })
            set({ user: userFromMe(me, { ...u, jobTitle: patch.jobTitle ?? u.jobTitle }) })
            get().appendLocalAudit({
              at: Date.now(),
              actorId: u.id,
              actorEmail: u.email,
              action: 'profile.updated',
              ip: nowIp(),
              meta: { mode: 'api', ...patch },
            })
            return { ok: true }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Profile update failed.'
            return { ok: false, error: msg }
          }
        }

        const displayName = patch.displayName ?? u.displayName
        set({
          user: {
            ...u,
            displayName,
            jobTitle: patch.jobTitle ?? u.jobTitle,
            firstName: patch.firstName ?? u.firstName,
            lastName: patch.lastName ?? u.lastName,
          },
        })
        get().appendLocalAudit({
          at: Date.now(),
          actorId: u.id,
          actorEmail: u.email,
          action: 'profile.updated',
          ip: nowIp(),
          meta: patch as Record<string, unknown>,
        })
        return { ok: true }
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
      version: 2,
      migrate: (persisted) => {
        const state = persisted as AuthState
        return {
          ...state,
          failedByEmail: {},
          lockedAccounts: [],
        }
      },
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
      onRehydrateStorage: () => state => {
        loadAuditFromStorage()
        if (!state) return
        const prunedLocks = pruneExpiredLoginLocks(state.lockedAccounts)
        const failedByEmail = { ...state.failedByEmail }
        for (const email of Object.keys(failedByEmail)) {
          if ((failedByEmail[email] ?? 0) >= MAX_FAILED_LOGIN_ATTEMPTS) {
            const lock = prunedLocks.find(l => l.email === email)
            if (!lock) failedByEmail[email] = 0
          }
        }
        state.lockedAccounts = prunedLocks
        state.failedByEmail = failedByEmail
      },
    }
  )
)

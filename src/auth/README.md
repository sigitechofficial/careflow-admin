# Auth module (care-admin)

Client-side authentication, authorization, and security UX for the Care Admin SPA. This layer is **independent of the NestJS backend** in this repo: it uses a persisted Zustand store with mock users for local development and can be pointed at a real API later.

## Layout

| Path | Role |
|------|------|
| `types.ts` | TypeScript types: users, roles, permissions, sessions, devices, SSO, IP rules, audit events |
| `roles.ts` | Role → permission mapping (`permissionsForRole`, `hasPermission`) |
| `guard.ts` | TanStack Router `beforeLoad` helper: public routes, login redirect, IP block check |
| `audit.ts` | In-memory / localStorage audit buffer (`appendAuditEvent`, `loadAuditFromStorage`) |
| `../store/auth.store.ts` | Zustand store: login/logout, tokens, lockout, 2FA flags, devices, SSO toggles |

## Store (`auth.store.ts`)

- **Persist**: access/refresh expiry, user, sessions, devices, and security settings are persisted (mind what you store in production).
- **API mode** (`VITE_API_BASE_URL` set in `.env`): `login()` calls the Nest `POST /auth/login`, then `GET /auth/me`, stores real JWTs, and `refreshTokens()` calls `POST /auth/refresh`. Use the same origin you use in the browser (include correct port). Restart Vite after changing env.
- **Demo mode** (no API URL): `admin@care.local`, `manager@care.local`, `staff@care.local` with password `CareAdmin1!` (see `MOCK_USERS`); tokens are mock strings and **will not** work with the backend.
- **Tokens**: In demo mode, access lifetime ~1 hour and refresh ~7 days (constants at top of file). In API mode, expiry is taken from JWT `exp` when present.
- **IP simulation**: `window.__MOCK_IP__` overrides the client IP used for IP allow-list checks when set in devtools.
- **Permissions**: After login, permissions are derived from `roles.ts` and exposed on `AuthUser` for UI and route guards.

## Route guard

Import `rootAuthBeforeLoad` from `@/auth/guard` into the root or layout route’s `beforeLoad`. It:

1. Rehydrates the persisted store.
2. Allows `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` without a session.
3. Redirects unauthenticated users to login with `redirect` search param.
4. Sends authenticated users away from login to `/`.
5. Redirects to `/auth/blocked-ip` when the simulated IP is not allowed (when rules are enabled).

## Audit buffer (`audit.ts`)

Security-sensitive UI actions can call `appendAuditEvent` to record structured events (login, permission denial, settings change, etc.). Events are capped and optionally synced to `localStorage` for the Account → Security → Audit UI. This is **not** a substitute for server-side audit logs; the Nest backend `audit-logs` module owns authoritative trails.

## Extending

- **Backend permissions**: Nest returns keys such as `employees.read`, `employees.create`, `audit_logs.read`. They are merged with `ROLE_PERMISSIONS` on login (`auth.store`). `Permission` in `types.ts` includes these keys; route guards and sidebar use `employees.*` where the API enforces them. Legacy `employee.read` / `employee.write` remain for demo-only roles without a JWT.
- **New permissions**: Add to `types.ts` and map in `roles.ts`; gate routes or nav with `hasPermission` / store selectors.

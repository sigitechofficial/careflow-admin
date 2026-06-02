# Care Admin (frontend)

React + Vite SPA for the Care Admin platform. Talks to [`careadmin-backend`](../careadmin-backend/) over REST (JWT).

**Local setup (full stack):** see the [root README](../README.md).

---

## Quick start

```powershell
cd care-admin
pnpm install
copy .env.example .env
```

Set in `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Start the API first (`careadmin-backend` → `pnpm run start:dev`), then:

```powershell
pnpm run dev
```

Open http://localhost:5173 — login: `admin@careadmin.local` / `Admin@12345` (seeded).

---

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Dev server (default port **5173**) |
| `pnpm run build` | `tsc -b` + Vite production build |
| `pnpm run preview` | Serve `dist/` locally |
| `pnpm run lint` | ESLint |
| `pnpm run test` | Vitest unit tests |
| `pnpm run test:e2e` | Playwright (requires `.env` `E2E_*` vars) |
| `pnpm run sync:care-plan-icons` | Sync standard icons from backend `uploads/` to `public/` |

### E2E (optional)

In `.env`:

```env
E2E_API_BASE_URL=http://localhost:3000
E2E_LOGIN_EMAIL=admin@careadmin.local
E2E_LOGIN_PASSWORD=Admin@12345
```

```powershell
pnpm run test:e2e
```

---

## Key routes

| Path | Purpose |
|------|---------|
| `/auth/login` | Sign in |
| `/employees` | Staff management |
| `/service-users` | Service users |
| `/settings/care-pathway` | Care pathway tabs (gallery, form builder, checklists, …) |
| `/settings/care-pathway?tab=gallery` | Standard / uploaded picture gallery |
| `/settings/care-pathway?tab=form-builder` | Create / edit care forms |

---

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes (local) | Backend origin, no trailing slash, e.g. `http://localhost:3000` |
| `E2E_API_BASE_URL` | E2E only | Passed to dev server during Playwright runs |
| `E2E_LOGIN_EMAIL` / `E2E_LOGIN_PASSWORD` | E2E only | Test user credentials |
| `FIGMA_ACCESS_TOKEN` | Optional | For `fetch:figma-*` icon export scripts |

---

## Deployment

See [README_DEPLOYMENT_AND_ROLLBACK.md](./README_DEPLOYMENT_AND_ROLLBACK.md).

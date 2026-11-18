import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Search, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { apiJson } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDay } from '@/shared/lib/organisation-display-format.store'
import { listServiceUsers } from '@/features/service-users/api/service-users.api'
import { listEmployees } from '@/features/employees/api/employees.api'

export const DELETE_RECORD_TABS = [
  { id: 'service-user', label: 'Delete service user' },
  { id: 'employee', label: 'Delete employee' },
] as const

export type DeleteRecordTab = (typeof DELETE_RECORD_TABS)[number]['id']

type Person = { id: string; name: string; detail: string }

const COPY: Record<DeleteRecordTab, { kind: string; permission: 'service_users.delete' | 'employees.delete'; what: string[]; searchHint: string }> = {
  'service-user': {
    kind: 'service user',
    permission: 'service_users.delete',
    searchHint: 'Name, preferred name or NHS number',
    what: [
      'They leave the service user list, the rota and reports.',
      'Visits that have not started yet are cancelled, and their visit plan ends.',
      'Their portal access is switched off.',
      'Their records (care notes, visits, medicines, invoices) are kept for audit and CQC.',
    ],
  },
  employee: {
    kind: 'employee',
    permission: 'employees.delete',
    searchHint: 'Name, email or employee number',
    what: [
      'They leave the staff list, and are taken off future visits (those visits need a new carer).',
      'Their office login and Care app access are switched off, and they are signed out everywhere.',
      'They are left out of payroll from now on.',
      'Their records (visits, hours, training, documents) are kept for audit.',
    ],
  },
}

async function findPeople(tab: DeleteRecordTab, q: string, signal?: AbortSignal): Promise<Person[]> {
  if (tab === 'service-user') {
    const { rows } = await listServiceUsers({ search: q, limit: 10, showInactive: true }, { signal })
    return rows.map((r) => ({
      id: r.id,
      name: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Service user',
      detail: [r.preferredName ? `Known as ${r.preferredName}` : null, r.dateOfBirth ? `Born ${formatOrganisationDay(r.dateOfBirth)}` : null, r.status?.name ?? null]
        .filter(Boolean)
        .join(' · '),
    }))
  }
  const { rows } = await listEmployees({ search: q, limit: 10 }, { signal })
  return rows.map((r) => ({
    id: r.id,
    name: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Employee',
    detail: [r.jobTitle?.name ?? r.role?.name ?? null, r.username ? `@${r.username}` : null, r.status?.name ?? null].filter(Boolean).join(' · '),
  }))
}

async function deletePerson(tab: DeleteRecordTab, id: string, reason: string) {
  const path = tab === 'service-user' ? 'service-users' : 'employees'
  return apiJson(`/${path}/${id}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' })
}

/**
 * Settings › Delete records. The only place service users and employees are deleted, so it never happens by
 * accident: find the person, read what happens, give a reason, and type their name to confirm.
 */
export default function DeleteRecordsPage() {
  const search = useSearch({ strict: false }) as { tab?: DeleteRecordTab }
  const navigate = useNavigate()
  const can = useAuthStore((s) => s.can)
  const tabs = DELETE_RECORD_TABS.filter((t) => can(COPY[t.id].permission))
  const tab: DeleteRecordTab = tabs.some((t) => t.id === search.tab) ? (search.tab as DeleteRecordTab) : (tabs[0]?.id ?? 'service-user')

  if (!tabs.length) {
    return <p className="p-6 text-sm text-muted-foreground">Your role cannot delete service users or employees.</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Delete records</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Remove a service user or an employee who should not be on CareFlow, for example a record added by mistake or a
          duplicate. Someone who has simply left should be ended, not deleted: set their status or leaving date instead.
        </p>
      </div>
      <div role="tablist" aria-label="What to delete" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => void navigate({ to: '/settings/delete-records', search: { tab: t.id } })}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <DeletePanel key={tab} tab={tab} />
    </div>
  )
}

function DeletePanel({ tab }: { tab: DeleteRecordTab }) {
  const copy = COPY[tab]
  const qc = useQueryClient()
  const [q, setQ] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [picked, setPicked] = React.useState<Person | null>(null)
  const [reason, setReason] = React.useState('')
  const [typed, setTyped] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const results = useQuery({
    queryKey: ['delete-records', tab, debounced],
    queryFn: ({ signal }) => findPeople(tab, debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 15_000,
  })

  const nameMatches = picked ? typed.trim().toLowerCase() === picked.name.trim().toLowerCase() : false
  const canDelete = Boolean(picked && reason.trim().length >= 5 && nameMatches && !busy)

  const run = async () => {
    if (!picked || !canDelete) return
    setBusy(true)
    try {
      await deletePerson(tab, picked.id, reason.trim())
      toastSuccess(`${picked.name} deleted`, `The ${copy.kind} was removed. The reason is in the audit log.`)
      void qc.invalidateQueries()
      setPicked(null)
      setReason('')
      setTyped('')
      setQ('')
    } catch (e) {
      toastApiError(e, `Could not delete this ${copy.kind}.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">
      <section>
        <Label htmlFor="delete-records-search" className="text-sm font-medium">
          1. Find the {copy.kind}
        </Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="delete-records-search"
            className="pl-9"
            placeholder={copy.searchHint}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPicked(null)
              setTyped('')
            }}
            autoComplete="off"
          />
        </div>
        {debounced.length >= 2 && !picked ? (
          <ul className="mt-2 max-h-72 overflow-auto rounded-md border border-border" aria-label="Matching people">
            {results.isLoading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
            ) : (results.data ?? []).length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nobody matches “{debounced}”.</li>
            ) : (
              results.data!.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full border-b border-border/60 px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                    onClick={() => setPicked(p)}
                  >
                    <span className="block text-sm font-medium">{p.name}</span>
                    {p.detail ? <span className="block text-xs text-muted-foreground">{p.detail}</span> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </section>

      {picked ? (
        <>
          <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Deleting {picked.name}
            </p>
            {picked.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{picked.detail}</p> : null}
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {copy.what.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <Button type="button" variant="link" size="sm" className="mt-1 h-auto px-0" onClick={() => setPicked(null)}>
              Choose someone else
            </Button>
          </section>

          <section>
            <Label htmlFor="delete-records-reason" className="text-sm font-medium">
              2. Why are they being deleted?
            </Label>
            <Textarea
              id="delete-records-reason"
              className="mt-1.5"
              rows={2}
              maxLength={500}
              placeholder="e.g. Added twice by mistake; the correct record is Devon Glocal (Hounslow)."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Kept in the audit log with your name and the time.</p>
          </section>

          <section>
            <Label htmlFor="delete-records-confirm" className="text-sm font-medium">
              3. Type <span className="font-semibold">{picked.name}</span> to confirm
            </Label>
            <Input
              id="delete-records-confirm"
              className="mt-1.5"
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={typed.length > 0 && !nameMatches}
            />
          </section>

          <div className="flex justify-end">
            <Button type="button" variant="destructive" disabled={!canDelete} onClick={() => void run()} data-testid="delete-records-confirm">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="mr-2 h-4 w-4" aria-hidden />}
              Delete {copy.kind}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

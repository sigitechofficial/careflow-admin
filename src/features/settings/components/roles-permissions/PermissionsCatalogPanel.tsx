import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { usePermissionsCatalog } from '@/features/settings/hooks/useRolesPermissions'
import { useAuthStore } from '@/features/auth/store'

function permissionGroup(key: string): string {
  const i = key.indexOf('.')
  return i === -1 ? key : key.slice(0, i)
}

export function PermissionsCatalogPanel() {
  const canView = useAuthStore(s => s.can('permissions.manage') || s.can('roles.manage'))
  const catalogQuery = usePermissionsCatalog(canView)
  const [filter, setFilter] = React.useState('')

  const grouped = React.useMemo(() => {
    const rows = catalogQuery.data ?? []
    const q = filter.trim().toLowerCase()
    const map = new Map<string, typeof rows>()
    for (const p of rows) {
      if (q && !p.key.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) {
        continue
      }
      const g = permissionGroup(p.key)
      const list = map.get(g) ?? []
      list.push(p)
      map.set(g, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [catalogQuery.data, filter])

  if (!canView) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        You need roles.manage or permissions.manage to view the permissions catalog.
      </p>
    )
  }

  return (
    <div className="space-y-4" data-testid="permissions-catalog-panel">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Permissions catalog</h2>
            <p className="text-xs text-muted-foreground">
              All permission keys in the system. Assign them to roles on the Roles tab.
            </p>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Filter permissions…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {catalogQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : catalogQuery.isError ? (
          <p className="text-sm text-destructive">
            Could not load permissions. Ensure you have permissions.manage.
          </p>
        ) : (
          <div className="max-h-[70vh] space-y-5 overflow-auto">
            {grouped.map(([group, perms]) => (
              <section key={group} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group} · {perms.length}
                </h3>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {perms.map(p => (
                    <li key={p.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <code className="text-xs font-mono text-foreground">{p.key}</code>
                      <span className="text-xs text-muted-foreground">
                        {p.description || '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions match this filter.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

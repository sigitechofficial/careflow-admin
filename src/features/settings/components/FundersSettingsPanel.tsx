import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { serviceUserKeys } from '@/features/service-users/keys'
import { deleteEnterpriseFunder, type EnterpriseFunderRow } from '@/features/service-users/api/service-users.api'
import { useEnterpriseFunders } from '@/features/service-users/hooks/useServiceUserTabs'
import { FunderFormDialog } from '@/features/settings/components/FunderFormDialog'

/**
 * Funders: the organisations that pay for care (councils, NHS bodies, charities), plus general entries for
 * people who pay themselves or whose family pays. Each funder has a billing type, which decides which funding
 * routes can be chosen with it on a funding line.
 */
export function FundersSettingsPanel() {
  const canCreate = useAuthStore(s => s.can('funders.create'))
  const canUpdate = useAuthStore(s => s.can('funders.update'))
  const canDelete = useAuthStore(s => s.can('funders.delete'))
  const qc = useQueryClient()
  const fundersQuery = useEnterpriseFunders()
  const rows = React.useMemo(
    () => [...(fundersQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [fundersQuery.data],
  )

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EnterpriseFunderRow | null>(null)
  const [filter, setFilter] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEnterpriseFunder(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: serviceUserKeys.funders() }),
    onError: e => setError(e instanceof ApiError ? e.message : 'Could not delete the funder.'),
  })

  const q = filter.trim().toLowerCase()
  const shown = q
    ? rows.filter(r => r.name.toLowerCase().includes(q) || (r.fundingType?.name ?? '').toLowerCase().includes(q))
    : rows

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Funders</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The organisations that pay for care — councils, NHS bodies, charities — and general entries for people
          who pay themselves or whose family pays. Pick the funder on each funding line (Funding tab). Its{' '}
          <strong>type</strong> decides which funding routes can be chosen with it, and invoices go to its billing
          contact and address.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Filter</label>
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search…" className="w-64" />
        </div>
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            data-testid="funder-add"
            onClick={() => {
              setError(null)
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add funder
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Billing contact</th>
              <th className="px-3 py-2 font-medium">Standard rates</th>
              <th className="px-3 py-2 font-medium">Payment terms</th>
              {canUpdate || canDelete ? <th className="w-24 px-3 py-2 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {fundersQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  {rows.length === 0 ? 'No funders yet.' : 'No matches.'}
                </td>
              </tr>
            ) : (
              shown.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0" data-testid="funder-row">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">
                    {r.fundingType?.name ?? <span className="text-amber-700 dark:text-amber-400">Not set</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {[r.contactName, r.email].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.defaultChargeCard?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.paymentTerms || '—'}</td>
                  {canUpdate || canDelete ? (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {canUpdate ? (
                          <button
                            type="button"
                            title="Edit"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => {
                              setError(null)
                              setEditing(r)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            title="Delete"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              if (window.confirm(`Delete ${r.name}?`)) {
                                setError(null)
                                deleteMut.mutate(r.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FunderFormDialog open={dialogOpen} onOpenChange={setDialogOpen} funder={editing} />
    </div>
  )
}

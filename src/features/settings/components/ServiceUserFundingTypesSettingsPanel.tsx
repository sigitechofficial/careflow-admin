import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { ServiceUserFundingTypeRow } from '@/features/settings/api/lookups-admin-api'
import {
  useCreateServiceUserFundingType,
  useDeleteServiceUserFundingType,
  useServiceUserFundingTypes,
  useUpdateServiceUserFundingType,
} from '@/features/settings/hooks/useLookupsAdmin'
import { FundingTypesSourceInfo } from '@/features/settings/components/FundingTypesSourceInfo'
import { SettingsTablePagination } from '@/features/settings/components/SettingsTablePagination'
import { useClientPagination } from '@/features/settings/hooks/useClientPagination'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { useEnterpriseFundingTypes } from '@/features/service-users/hooks/useServiceUserTabs'

const SELECT_CLS = 'h-8 w-full rounded-md border border-input bg-background px-2 text-sm'

/** Billing type picker: the broad type a funding line uses on the Funding tab. */
function BillingTypeSelect({
  value,
  onChange,
  options,
  disabled,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ id: string; name: string }>
  disabled?: boolean
  label: string
}) {
  return (
    <select
      aria-label={label}
      className={SELECT_CLS}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">— Not set —</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

function slugCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function ServiceUserFundingTypesSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useServiceUserFundingTypes()
  const createMutation = useCreateServiceUserFundingType()
  const updateMutation = useUpdateServiceUserFundingType()
  const deleteMutation = useDeleteServiceUserFundingType()
  const billingTypesQuery = useEnterpriseFundingTypes()
  const billingTypes = billingTypesQuery.data ?? []

  const rows = listQuery.data ?? []
  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load funding types.'
        : null

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [billingId, setBillingId] = React.useState('')
  const [filter, setFilter] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editBillingId, setEditBillingId] = React.useState('')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    )
  }, [filter, rows])

  const pagination = useClientPagination(filtered, { resetDeps: [filter] })

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditCode('')
    setEditBillingId('')
  }

  const startEdit = (row: ServiceUserFundingTypeRow) => {
    setEditingId(row.id)
    setEditName(row.name)
    setEditCode(row.code)
    setEditBillingId(row.billingFundingTypeId ?? '')
  }

  const onAdd = async () => {
    const n = name.trim()
    const c = (code.trim() || slugCode(n)).toUpperCase()
    if (!n || !c || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({ name: n, code: c, billingFundingTypeId: billingId || null })
      setName('')
      setCode('')
      setBillingId('')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add funding type.')
    }
  }

  const onSaveEdit = async () => {
    if (!editingId || !canManage) return
    const n = editName.trim()
    const c = editCode.trim().toUpperCase()
    if (!n || !c) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: { name: n, code: c, billingFundingTypeId: editBillingId || null },
      })
      cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save changes.')
    }
  }

  const onDelete = async (row: ServiceUserFundingTypeRow) => {
    if (!canManage) return
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone from the UI.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete funding type.')
    }
  }

  const displayError = actionError ?? error

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Funding routes</h2>
          <FundingTypesSourceInfo />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length > 0
            ? `${rows.length.toLocaleString()} funding routes for service user profiles — NHS CHC, local authority, direct payments, self-funding, and mixed packages. Use the info icon for official references.`
            : 'Used on service user personal details and initial assessment funding type fields.'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          These are the detailed funding routes chosen in Personal Details. <strong>Billed as</strong> links each
          one to the broad type used on funding lines (Funding tab), which drives invoices and cancellation
          charging. On the Funding tab, only the routes under the chosen funder's type are offered.
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (!code.trim()) setCode(slugCode(e.target.value))
              }}
              placeholder="e.g. Local Authority"
              disabled={saving}
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Code</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LOCAL_AUTHORITY"
              disabled={saving}
            />
          </div>
          <div className="min-w-[160px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Billed as</label>
            <BillingTypeSelect
              label="Billed as"
              value={billingId}
              onChange={setBillingId}
              options={billingTypes}
              disabled={saving}
            />
          </div>
          <Button type="button" size="sm" disabled={saving || !name.trim()} onClick={() => void onAdd()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Filter</label>
        <Input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search…"
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Billed as</th>
                {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {rows.length === 0 ? 'No funding types yet.' : 'No matches.'}
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map(row =>
                  editingId === row.id ? (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={editCode}
                          onChange={e => setEditCode(e.target.value.toUpperCase())}
                          className="h-8 font-mono text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <BillingTypeSelect
                          label={`Billed as for ${row.name}`}
                          value={editBillingId}
                          onChange={setEditBillingId}
                          options={billingTypes}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => void onSaveEdit()}
                          >
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.code}</td>
                      <td className="px-3 py-2" data-testid="funding-route-billed-as">
                        {row.billingFundingType?.name ?? (
                          <span className="text-amber-700 dark:text-amber-400">Not set</span>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Edit"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void onDelete(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
          </div>
          <SettingsTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      )}
    </div>
  )
}

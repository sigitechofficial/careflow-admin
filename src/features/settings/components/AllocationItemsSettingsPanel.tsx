import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import type { AllocationItemCategory, AllocationItemTypeRow } from '@/features/employees/types'
import {
  useAllocationItemTypes,
  useCreateAllocationItemType,
  useDeleteAllocationItemType,
  useUpdateAllocationItemType,
} from '@/features/employees/hooks/useEmployeeAllocations'
import {
  ALLOCATION_CATEGORIES,
  ALLOCATION_CATEGORY_LABEL,
} from '@/features/employees/components/employee-allocations/allocation-labels'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const selectClass =
  'h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function CategorySelect({
  value,
  onChange,
  disabled,
  testId,
}: {
  value: AllocationItemCategory
  onChange: (v: AllocationItemCategory) => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <select
      className={selectClass}
      value={value}
      disabled={disabled}
      data-testid={testId}
      onChange={e => onChange(e.target.value as AllocationItemCategory)}
    >
      {ALLOCATION_CATEGORIES.map(c => (
        <option key={c} value={c}>
          {ALLOCATION_CATEGORY_LABEL[c]}
        </option>
      ))}
    </select>
  )
}

/** Settings → Allocation items: what can be issued to staff (Employee → Allocation). */
export function AllocationItemsSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useAllocationItemTypes()
  const createMutation = useCreateAllocationItemType()
  const updateMutation = useUpdateAllocationItemType()
  const deleteMutation = useDeleteAllocationItemType()
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const [name, setName] = React.useState('')
  const [category, setCategory] = React.useState<AllocationItemCategory>('EQUIPMENT')
  const [returnable, setReturnable] = React.useState(true)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editCategory, setEditCategory] = React.useState<AllocationItemCategory>('EQUIPMENT')
  const [editReturnable, setEditReturnable] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const rows = listQuery.data ?? []
  const loadError =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load allocation items.'
        : null

  const onAdd = async () => {
    setActionError(null)
    try {
      await createMutation.mutateAsync({ name: name.trim(), category, returnable })
      setName('')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add item.')
    }
  }

  const onSave = async (id: string) => {
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id,
        body: { name: editName.trim(), category: editCategory, returnable: editReturnable },
      })
      setEditingId(null)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not update item.')
    }
  }

  const onDelete = async (row: AllocationItemTypeRow) => {
    if (!window.confirm(`Remove “${row.name}” from the list? Existing allocations keep it.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not remove item.')
    }
  }

  const displayError = actionError ?? loadError

  return (
    <div className="space-y-6" data-testid="allocation-items-settings">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Allocation items</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Equipment, PPE and uniform the organisation issues to staff. Used on the employee Allocation tab.
          Returnable items (laptop, phone, badge) are listed as outstanding until they are handed back.
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Item</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Car charger"
              disabled={saving}
              data-testid="allocation-item-name"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-muted-foreground">Category</label>
            <CategorySelect
              value={category}
              onChange={c => {
                setCategory(c)
                setReturnable(c === 'EQUIPMENT')
              }}
              disabled={saving}
              testId="allocation-item-category"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={returnable}
              onChange={e => setReturnable(e.target.checked)}
              disabled={saving}
            />
            Returnable
          </label>
          <Button
            type="button"
            size="sm"
            disabled={saving || !name.trim()}
            onClick={() => void onAdd()}
            data-testid="allocation-item-add"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Returnable</th>
                  {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="px-3 py-6 text-center text-muted-foreground">
                      No items yet.
                    </td>
                  </tr>
                ) : (
                  rows.map(row =>
                    editingId === row.id ? (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <Input value={editName} onChange={e => setEditName(e.target.value)} disabled={saving} />
                        </td>
                        <td className="px-3 py-2">
                          <CategorySelect value={editCategory} onChange={setEditCategory} disabled={saving} />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={editReturnable}
                            onChange={e => setEditReturnable(e.target.checked)}
                            disabled={saving}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving || !editName.trim()}
                              onClick={() => void onSave(row.id)}
                            >
                              Save
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{ALLOCATION_CATEGORY_LABEL[row.category]}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.returnable ? 'Yes' : '—'}</td>
                        {canManage ? (
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                title="Edit"
                                onClick={() => {
                                  setEditingId(row.id)
                                  setEditName(row.name)
                                  setEditCategory(row.category)
                                  setEditReturnable(row.returnable)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                title="Remove"
                                disabled={saving}
                                onClick={() => void onDelete(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
        </div>
      )}
    </div>
  )
}

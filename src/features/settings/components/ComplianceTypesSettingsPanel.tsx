import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  COMPLIANCE_CATEGORIES,
} from '@/features/settings/constants/compliance-categories'
import type {
  ComplianceCategory,
  ComplianceTypeRow,
} from '@/features/settings/types'
import {
  useComplianceTypes,
  useCreateComplianceType,
  useDeleteComplianceType,
  useUpdateComplianceType,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/toggle-controls'
import { useAuthStore } from '@/features/auth/store'

export function ComplianceTypesSettingsPanel() {
  const canCreate = useAuthStore(s => s.can('compliance_types.create'))
  const canUpdate = useAuthStore(s => s.can('compliance_types.update'))
  const canDelete = useAuthStore(s => s.can('compliance_types.delete'))
  const [filter, setFilter] = React.useState('')
  const [debouncedFilter, setDebouncedFilter] = React.useState('')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [category, setCategory] = React.useState<ComplianceCategory>('EMPLOYMENT')
  const [mandatory, setMandatory] = React.useState(false)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<ComplianceTypeRow | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editCategory, setEditCategory] = React.useState<ComplianceCategory>('EMPLOYMENT')
  const [editMandatory, setEditMandatory] = React.useState(false)

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilter(filter), 200)
    return () => window.clearTimeout(t)
  }, [filter])

  const {
    data: rows = [],
    isLoading: loading,
    error: queryError,
  } = useComplianceTypes({ search: debouncedFilter || undefined, limit: 500 })

  const createMutation = useCreateComplianceType()
  const updateMutation = useUpdateComplianceType()
  const deleteMutation = useDeleteComplianceType()
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    actionError ??
    (queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load compliance types.'
        : null)

  const onAdd = async () => {
    if (!canCreate) return
    const n = name.trim()
    const c = code.trim().toUpperCase().replace(/\s+/g, '_')
    if (!n || !c) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        name: n,
        code: c,
        category,
        isMandatoryByDefault: mandatory,
      })
      setName('')
      setCode('')
      setMandatory(false)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not create compliance type.')
    }
  }

  const openEdit = (row: ComplianceTypeRow) => {
    setEditRow(row)
    setEditName(row.name)
    setEditCode(row.code ?? '')
    setEditCategory(row.category as ComplianceCategory)
    setEditMandatory(row.isMandatoryByDefault)
    setEditOpen(true)
  }

  const onSaveEdit = async () => {
    if (!editRow || !canUpdate) return
    const n = editName.trim()
    const c = editCode.trim().toUpperCase().replace(/\s+/g, '_')
    if (!n || !c) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editRow.id,
        body: {
          name: n,
          code: c,
          category: editCategory,
          isMandatoryByDefault: editMandatory,
        },
      })
      setEditOpen(false)
      setEditRow(null)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not update compliance type.')
    }
  }

  const onDelete = async (row: ComplianceTypeRow) => {
    if (!canDelete) return
    if (!window.confirm(`Delete "${row.name}"? Existing employee compliance records may still reference it.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete compliance type.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Compliance documents</h3>
        <p className="text-xs text-muted-foreground">
          Define compliance document types used when recording employee compliance.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Filter by name or code…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {canCreate ? (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
          <Input
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={saving}
          />
          <Input
            placeholder="Code"
            value={code}
            onChange={e => setCode(e.target.value)}
            disabled={saving}
          />
          <Select
            value={category}
            onValueChange={v => setCategory(v as ComplianceCategory)}
            disabled={saving}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={mandatory} onCheckedChange={setMandatory} disabled={saving} />
            Mandatory
          </label>
          <Button type="button" size="sm" onClick={() => void onAdd()} disabled={saving}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No compliance types found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Mandatory</th>
                {(canUpdate || canDelete) && <th className="px-3 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">{row.isMandatoryByDefault ? 'Yes' : 'No'}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {canUpdate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${row.name}`}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            aria-label={`Delete ${row.name}`}
                            onClick={() => void onDelete(row)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit compliance type</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Input
              placeholder="Name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              disabled={saving}
            />
            <Input
              placeholder="Code"
              value={editCode}
              onChange={e => setEditCode(e.target.value)}
              disabled={saving}
            />
            <Select
              value={editCategory}
              onValueChange={v => setEditCategory(v as ComplianceCategory)}
              disabled={saving}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPLIANCE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={editMandatory} onCheckedChange={setEditMandatory} disabled={saving} />
              Mandatory by default
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSaveEdit()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

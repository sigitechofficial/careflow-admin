import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  COMPLIANCE_CATEGORIES,
  createComplianceType,
  deleteComplianceType,
  fetchComplianceTypesList,
  updateComplianceType,
  type ComplianceCategory,
  type ComplianceTypeRow,
} from '@/lib/lookups-admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/toggle-controls'
import { useAuthStore } from '@/store/auth.store'

export function ComplianceTypesSettingsPanel() {
  const canCreate = useAuthStore(s => s.can('compliance_types.create'))
  const canUpdate = useAuthStore(s => s.can('compliance_types.update'))
  const canDelete = useAuthStore(s => s.can('compliance_types.delete'))
  const [rows, setRows] = React.useState<ComplianceTypeRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState('')
  const [saving, setSaving] = React.useState(false)

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

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchComplianceTypesList({ search: filter || undefined, limit: 500 })
      setRows(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load compliance types.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  React.useEffect(() => {
    const t = window.setTimeout(() => void load(), 200)
    return () => window.clearTimeout(t)
  }, [load])

  const onAdd = async () => {
    if (!canCreate) return
    const n = name.trim()
    const c = code.trim().toUpperCase().replace(/\s+/g, '_')
    if (!n || !c) return
    setSaving(true)
    setError(null)
    try {
      await createComplianceType({
        name: n,
        code: c,
        category,
        isMandatoryByDefault: mandatory,
      })
      setName('')
      setCode('')
      setMandatory(false)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create compliance type.')
    } finally {
      setSaving(false)
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
    setSaving(true)
    setError(null)
    try {
      await updateComplianceType(editRow.id, {
        name: n,
        code: c,
        category: editCategory,
        isMandatoryByDefault: editMandatory,
      })
      setEditOpen(false)
      setEditRow(null)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update compliance type.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row: ComplianceTypeRow) => {
    if (!canDelete) return
    if (!window.confirm(`Delete "${row.name}"? Existing employee compliance records may still reference it.`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteComplianceType(row.id)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete compliance type.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Compliance documents</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Types shown on the employee Employment Compliance tab. Add new document types here; assign them to work areas
          via compliance requirements (seed or admin tools).
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Input
        placeholder="Search by name or code…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="h-9 max-w-md"
      />

      {canCreate ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add new type</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <label className="text-xs text-muted-foreground">Display name</label>
              <Input className="h-9" value={name} onChange={e => setName(e.target.value)} disabled={saving} />
            </div>
            <div className="w-full space-y-1.5 sm:w-[10rem]">
              <label className="text-xs text-muted-foreground">Code</label>
              <Input
                className="h-9 font-mono text-xs"
                value={code}
                placeholder="e.g. DBS"
                onChange={e => setCode(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-[11rem]">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={v => setCategory(v as ComplianceCategory)}>
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
            </div>
            <label className="flex h-9 items-center gap-2 pb-0.5 text-sm">
              <Switch checked={mandatory} onCheckedChange={setMandatory} disabled={saving} />
              Mandatory by default
            </label>
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              disabled={saving || !name.trim() || !code.trim()}
              onClick={() => void onAdd()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          You need <span className="font-mono">compliance_types.create</span> to add types.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="max-h-[min(50vh,480px)] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mandatory</th>
                {(canUpdate || canDelete) && (
                  <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canDelete ? 5 : 4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No compliance types found.
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.code ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.category.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">{row.isMandatoryByDefault ? 'Yes' : 'No'}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          {canUpdate ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Edit"
                              disabled={saving}
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Delete"
                              disabled={saving}
                              onClick={() => void onDelete(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={open => !open && setEditOpen(false)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Edit compliance type</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Display name</label>
              <Input className="h-9" value={editName} onChange={e => setEditName(e.target.value)} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Code</label>
              <Input
                className="h-9 font-mono text-xs"
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={editCategory} onValueChange={v => setEditCategory(v as ComplianceCategory)}>
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
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={editMandatory} onCheckedChange={setEditMandatory} disabled={saving} />
              Mandatory by default
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving || !editName.trim() || !editCode.trim()} onClick={() => void onSaveEdit()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { BodyMapRecordTypeRow } from '@/features/settings/api/lookups-admin-api'
import {
  useBodyMapRecordTypes,
  useCreateBodyMapRecordType,
  useDeleteBodyMapRecordType,
  useUpdateBodyMapRecordType,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'

function slugCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

type DisplayRow = BodyMapRecordTypeRow & { depth: number; parentName?: string }

function buildDisplayRows(rows: BodyMapRecordTypeRow[]): DisplayRow[] {
  const parents = rows
    .filter(r => !r.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  const childrenByParent = new Map<string, BodyMapRecordTypeRow[]>()
  for (const row of rows) {
    if (!row.parentId) continue
    const list = childrenByParent.get(row.parentId) ?? []
    list.push(row)
    childrenByParent.set(row.parentId, list)
  }
  const out: DisplayRow[] = []
  for (const parent of parents) {
    out.push({ ...parent, depth: 0 })
    const children = (childrenByParent.get(parent.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    )
    for (const child of children) {
      out.push({ ...child, depth: 1, parentName: parent.name })
    }
  }
  return out
}

export function BodyMapRecordTypesSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useBodyMapRecordTypes()
  const createMutation = useCreateBodyMapRecordType()
  const updateMutation = useUpdateBodyMapRecordType()
  const deleteMutation = useDeleteBodyMapRecordType()

  const rows = listQuery.data ?? []
  const parents = React.useMemo(() => rows.filter(r => !r.parentId), [rows])
  const displayRows = React.useMemo(() => buildDisplayRows(rows), [rows])

  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load record types.'
        : null

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [parentId, setParentId] = React.useState<string>('__top__')
  const [sortOrder, setSortOrder] = React.useState('0')
  const [woundType, setWoundType] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<BodyMapRecordTypeRow | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editSortOrder, setEditSortOrder] = React.useState('0')
  const [editWoundType, setEditWoundType] = React.useState(false)

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return displayRows
    return displayRows.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.parentName?.toLowerCase().includes(q) ?? false),
    )
  }, [displayRows, filter])

  const onAdd = async () => {
    const n = name.trim()
    const c = (code.trim() || slugCode(n)).toLowerCase()
    if (!n || !c || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        name: n,
        code: c,
        parentId: parentId === '__top__' ? undefined : parentId,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        initialAssessmentWoundType: parentId !== '__top__' ? woundType : false,
      })
      setName('')
      setCode('')
      setSortOrder('0')
      setWoundType(false)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add record type.')
    }
  }

  const openEdit = (row: BodyMapRecordTypeRow) => {
    setEditRow(row)
    setEditName(row.name)
    setEditCode(row.code)
    setEditSortOrder(String(row.sortOrder))
    setEditWoundType(row.initialAssessmentWoundType)
    setEditOpen(true)
  }

  const onSaveEdit = async () => {
    if (!editRow || !canManage) return
    const n = editName.trim()
    const c = editCode.trim().toLowerCase()
    if (!n || !c) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editRow.id,
        body: {
          name: n,
          code: c,
          sortOrder: Number.parseInt(editSortOrder, 10) || 0,
          initialAssessmentWoundType: editRow.parentId ? editWoundType : false,
        },
      })
      setEditOpen(false)
      setEditRow(null)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save changes.')
    }
  }

  const onDelete = async (row: DisplayRow) => {
    if (!canManage) return
    const label = row.depth === 0 ? `"${row.name}" and its sub-types` : `"${row.name}"`
    if (!window.confirm(`Delete ${label}? This cannot be undone from the UI.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete record type.')
    }
  }

  const displayError = actionError ?? error
  const isSubType = parentId !== '__top__'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Body map record types</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Top-level record types (e.g. Wound, Pressure Area) and their sub-types used on the body map
          wizard and initial assessment wound type field.
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {canManage ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Add record type or sub-type</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Parent record type</label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__top__">Top-level record type</SelectItem>
                  {parents.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sort order</label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  if (!code.trim()) setCode(slugCode(e.target.value))
                }}
                placeholder={isSubType ? 'e.g. Bruise' : 'e.g. Injury or Mark'}
                disabled={saving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Code</label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toLowerCase())}
                placeholder={isSubType ? 'e.g. bruise' : 'e.g. INJURY'}
                disabled={saving}
                className="font-mono text-xs"
              />
            </div>
          </div>
          {isSubType ? (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={woundType} onCheckedChange={setWoundType} disabled={saving} />
              Include in initial assessment wound type options
            </label>
          ) : null}
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
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Parent</th>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">IA wound</th>
                {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 6 : 5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {rows.length === 0 ? 'No record types yet.' : 'No matches.'}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <span style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                        {row.depth > 0 ? '↳ ' : null}
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.parentName ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{row.sortOrder}</td>
                    <td className="px-3 py-2">{row.initialAssessmentWoundType ? 'Yes' : '—'}</td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Edit"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => openEdit(row)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit record type</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Code</label>
              <Input
                value={editCode}
                onChange={e => setEditCode(e.target.value.toLowerCase())}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sort order</label>
              <Input
                type="number"
                min={0}
                value={editSortOrder}
                onChange={e => setEditSortOrder(e.target.value)}
              />
            </div>
            {editRow?.parentId ? (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={editWoundType} onCheckedChange={setEditWoundType} />
                Include in initial assessment wound type options
              </label>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void onSaveEdit()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

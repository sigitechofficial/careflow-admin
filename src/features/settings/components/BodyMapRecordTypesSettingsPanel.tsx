import * as React from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

function slugCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

type RecordTypeGroup = {
  parent: BodyMapRecordTypeRow
  children: BodyMapRecordTypeRow[]
}

function groupRecordTypes(rows: BodyMapRecordTypeRow[]): RecordTypeGroup[] {
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
  return parents.map(parent => ({
    parent,
    children: (childrenByParent.get(parent.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    ),
  }))
}

function nextSortOrder(siblings: BodyMapRecordTypeRow[]): number {
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map(s => s.sortOrder)) + 1
}

function PinSwatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block size-4 shrink-0 rounded-full border border-white shadow-sm', className)}
      style={{ backgroundColor: color }}
    />
  )
}

function PinColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <input
      type="color"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className="h-9 w-10 cursor-pointer rounded border border-input bg-background p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Pin colour"
      title="Pin colour on body map"
    />
  )
}

export function BodyMapRecordTypesSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useBodyMapRecordTypes()
  const createMutation = useCreateBodyMapRecordType()
  const updateMutation = useUpdateBodyMapRecordType()
  const deleteMutation = useDeleteBodyMapRecordType()

  const rows = listQuery.data ?? []
  const groups = React.useMemo(() => groupRecordTypes(rows), [rows])

  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load record types.'
        : null

  const [filter, setFilter] = React.useState('')
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())

  const [newName, setNewName] = React.useState('')
  const [newColor, setNewColor] = React.useState('#dc2626')

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editColor, setEditColor] = React.useState('#dc2626')
  const [editWoundType, setEditWoundType] = React.useState(false)

  const [addingSubTypeTo, setAddingSubTypeTo] = React.useState<string | null>(null)
  const [subTypeName, setSubTypeName] = React.useState('')
  const [subTypeWound, setSubTypeWound] = React.useState(false)

  const filteredGroups = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      g =>
        g.parent.name.toLowerCase().includes(q) ||
        g.children.some(c => c.name.toLowerCase().includes(q)),
    )
  }, [filter, groups])

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('#dc2626')
    setEditWoundType(false)
  }

  const startEdit = (row: BodyMapRecordTypeRow) => {
    setAddingSubTypeTo(null)
    setEditingId(row.id)
    setEditName(row.name)
    setEditColor(row.markerColorHex ?? '#64748b')
    setEditWoundType(row.initialAssessmentWoundType)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onAddTopLevel = async () => {
    const n = newName.trim()
    if (!n || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        name: n,
        code: slugCode(n),
        sortOrder: nextSortOrder(groups.map(g => g.parent)),
        markerColorHex: newColor,
      })
      setNewName('')
      setNewColor('#dc2626')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add record type.')
    }
  }

  const onAddSubType = async (parent: BodyMapRecordTypeRow, siblings: BodyMapRecordTypeRow[]) => {
    const n = subTypeName.trim()
    if (!n || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        name: n,
        code: slugCode(n),
        parentId: parent.id,
        sortOrder: nextSortOrder(siblings),
        initialAssessmentWoundType: subTypeWound,
        markerColorHex: parent.markerColorHex ?? undefined,
      })
      setSubTypeName('')
      setSubTypeWound(false)
      setAddingSubTypeTo(null)
      setExpandedIds(prev => {
        const next = new Set(prev)
        next.add(parent.id)
        return next
      })
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add sub-type.')
    }
  }

  const onSaveEdit = async (row: BodyMapRecordTypeRow) => {
    if (!canManage) return
    const n = editName.trim()
    if (!n) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: row.id,
        body: {
          name: n,
          markerColorHex: editColor,
          initialAssessmentWoundType: row.parentId ? editWoundType : false,
        },
      })
      cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save changes.')
    }
  }

  const onDelete = async (row: BodyMapRecordTypeRow, childCount = 0) => {
    if (!canManage) return
    const label =
      childCount > 0
        ? `"${row.name}" and its ${childCount} sub-type${childCount === 1 ? '' : 's'}`
        : `"${row.name}"`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (editingId === row.id) cancelEdit()
      if (addingSubTypeTo === row.id) setAddingSubTypeTo(null)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete.')
    }
  }

  const displayError = actionError ?? error

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Body map record types</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Each record type has a pin colour on the body map. Expand a type to manage its sub-types
          (e.g. Bruise under Injury).
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      <Input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search record types…"
        className="max-w-sm"
      />

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New record type</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Wound"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Pin colour</label>
            <PinColorPicker value={newColor} onChange={setNewColor} disabled={saving} />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saving || !newName.trim()}
            onClick={() => void onAddTopLevel()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filteredGroups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {groups.length === 0 ? 'No record types yet.' : 'No matches.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(({ parent, children }) => {
            const expanded = expandedIds.has(parent.id)
            const isEditingParent = editingId === parent.id
            const isAddingSubType = addingSubTypeTo === parent.id
            const parentColor = parent.markerColorHex ?? '#64748b'

            return (
              <section
                key={parent.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                {isEditingParent ? (
                  <div className="space-y-3 border-b border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Edit record type</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Name</label>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Pin colour</label>
                        <PinColorPicker
                          value={editColor}
                          onChange={setEditColor}
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || !editName.trim()}
                        onClick={() => void onSaveEdit(parent)}
                      >
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => toggleExpanded(parent.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Collapse sub-types' : 'Expand sub-types'}
                    >
                      {expanded ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <PinSwatch color={parentColor} className="size-5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{parent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {children.length === 0
                          ? 'No sub-types'
                          : `${children.length} sub-type${children.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="Edit"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => startEdit(parent)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void onDelete(parent, children.length)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {expanded && !isEditingParent ? (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    {children.length > 0 ? (
                      <ul className="space-y-1">
                        {children.map(child => {
                          const isEditingChild = editingId === child.id
                          const childColor = child.markerColorHex ?? parentColor

                          if (isEditingChild) {
                            return (
                              <li
                                key={child.id}
                                className="space-y-2 rounded-md border border-border bg-background p-3"
                              >
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="min-w-[160px] flex-1 space-y-1">
                                    <label className="text-xs text-muted-foreground">Name</label>
                                    <Input
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      autoFocus
                                      disabled={saving}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Pin colour</label>
                                    <PinColorPicker
                                      value={editColor}
                                      onChange={setEditColor}
                                      disabled={saving}
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Switch
                                    checked={editWoundType}
                                    onCheckedChange={setEditWoundType}
                                    disabled={saving}
                                  />
                                  Show in initial assessment wound options
                                </label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={saving || !editName.trim()}
                                    onClick={() => void onSaveEdit(child)}
                                  >
                                    Save
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                </div>
                              </li>
                            )
                          }

                          return (
                            <li
                              key={child.id}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                            >
                              <PinSwatch color={childColor} />
                              <span className="min-w-0 flex-1 text-sm">{child.name}</span>
                              {child.initialAssessmentWoundType ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  IA wound
                                </span>
                              ) : null}
                              {canManage ? (
                                <div className="flex shrink-0 gap-0.5">
                                  <button
                                    type="button"
                                    title="Edit"
                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => startEdit(child)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete"
                                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => void onDelete(child)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No sub-types yet.</p>
                    )}

                    {canManage ? (
                      isAddingSubType ? (
                        <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[160px] flex-1 space-y-1">
                              <label className="text-xs text-muted-foreground">Sub-type name</label>
                              <Input
                                value={subTypeName}
                                onChange={e => setSubTypeName(e.target.value)}
                                placeholder="e.g. Bruise"
                                disabled={saving}
                                className="h-8"
                                autoFocus
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving || !subTypeName.trim()}
                              onClick={() => void onAddSubType(parent, children)}
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddingSubTypeTo(null)
                                setSubTypeName('')
                                setSubTypeWound(false)
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={subTypeWound}
                              onCheckedChange={setSubTypeWound}
                              disabled={saving}
                            />
                            Show in initial assessment wound options
                          </label>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-8 px-2 text-xs"
                          onClick={() => {
                            cancelEdit()
                            setAddingSubTypeTo(parent.id)
                          }}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add sub-type
                        </Button>
                      )
                    ) : null}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { PathwayChecklistRow } from '@/features/care-pathway/types/care-pathway.types'
import {
  useCreatePathwayChecklist,
  useDeletePathwayChecklist,
  useUpdatePathwayChecklist,
} from '@/features/care-pathway/hooks/useCarePathwayMutations'
import { usePathwayChecklists } from '@/features/care-pathway/hooks/useCarePathwayTabs'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-table'
import { Switch } from '@/shared/ui/toggle-controls'
import { useAuthStore } from '@/features/auth/store'
import { toastError, toastSuccess } from '@/shared/lib/toast'

export function PathwayChecklistsTab() {
  const canCreate = useAuthStore(s => s.can('pathway_checklists.create'))
  const canUpdate = useAuthStore(s => s.can('pathway_checklists.update'))
  const canDelete = useAuthStore(s => s.can('pathway_checklists.delete'))
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<PathwayChecklistRow | null>(null)
  const [name, setName] = React.useState('')
  const [observationEnabled, setObservationEnabled] = React.useState(false)
  const [recordPhoto, setRecordPhoto] = React.useState(false)
  const [familyShare, setFamilyShare] = React.useState(false)
  const [groupAction, setGroupAction] = React.useState(false)

  const createMutation = useCreatePathwayChecklist()
  const updateMutation = useUpdatePathwayChecklist()
  const deleteMutation = useDeletePathwayChecklist()
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(t)
  }, [search])

  const { data, isLoading: loading } = usePathwayChecklists({
    search: debouncedSearch || undefined,
    limit: 100,
  })
  const rows = data?.rows ?? []

  const openCreate = () => {
    setEditRow(null)
    setName('')
    setObservationEnabled(false)
    setRecordPhoto(false)
    setFamilyShare(false)
    setGroupAction(false)
    setDialogOpen(true)
  }

  const openEdit = (row: PathwayChecklistRow) => {
    setEditRow(row)
    setName(row.name)
    setObservationEnabled(row.observationEnabled)
    setRecordPhoto(row.recordPhoto)
    setFamilyShare(row.familyShare)
    setGroupAction(row.groupAction)
    setDialogOpen(true)
  }

  const onSave = async () => {
    const n = name.trim()
    if (!n || n.length > 45) {
      toastError('Name is required (max 45 characters).')
      return
    }
    const payload = {
      name: n,
      observationEnabled,
      recordPhoto: observationEnabled ? recordPhoto : false,
      familyShare,
      groupAction,
    }
    try {
      if (editRow) {
        await updateMutation.mutateAsync({ id: editRow.id, body: payload })
        toastSuccess('Checklist updated.')
      } else {
        await createMutation.mutateAsync(payload)
        toastSuccess('Checklist created.')
      }
      setDialogOpen(false)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  const onDelete = async (row: PathwayChecklistRow) => {
    if (!canDelete || !window.confirm(`Delete "${row.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(row.id)
      toastSuccess('Checklist deleted.')
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Delete failed.')
    }
  }

  return (
    <div className="space-y-4" data-testid="pathway-checklists-tab">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Checklists</h2>
        {canCreate && (
          <Button type="button" size="sm" onClick={openCreate} data-testid="checklist-add">
            <Plus className="mr-1 h-4 w-4" />
            Add checklist
          </Button>
        )}
        <Input
          className="ml-auto max-w-xs"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Observation</TableHead>
            <TableHead>Photo</TableHead>
            <TableHead>Family share</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            rows.map(row => (
              <TableRow key={row.id} data-testid={`checklist-row-${row.id}`}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.observationEnabled ? 'Yes' : 'No'}</TableCell>
                <TableCell>{row.recordPhoto ? 'Yes' : 'No'}</TableCell>
                <TableCell>{row.familyShare ? 'Yes' : 'No'}</TableCell>
                <TableCell>{row.groupAction ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => void onDelete(row)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRow ? 'Edit checklist' : 'New checklist'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={45} />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={observationEnabled} onCheckedChange={setObservationEnabled} />
              Observation enabled
            </label>
            {observationEnabled && (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={recordPhoto} onCheckedChange={setRecordPhoto} />
                Record photo
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={familyShare} onCheckedChange={setFamilyShare} />
              Family share
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={groupAction} onCheckedChange={setGroupAction} />
              Group action
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { PathwayActionType } from '@/features/care-pathway/types/care-pathway.types'
import {
  useCreatePathwayAction,
  useDeletePathwayAction,
} from '@/features/care-pathway/hooks/useCarePathwayMutations'
import { usePathwayActions, usePathwayChecklistsBrief } from '@/features/care-pathway/hooks/useCarePathwayTabs'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-table'
import { useAuthStore } from '@/features/auth/store'
import { toastError, toastSuccess } from '@/shared/lib/toast'

export function PathwayActionsTab() {
  const canCreate = useAuthStore(s => s.can('pathway_actions.create'))
  const canDelete = useAuthStore(s => s.can('pathway_actions.delete'))
  const actionsQuery = usePathwayActions({ limit: 100 })
  const checklistsQuery = usePathwayChecklistsBrief()
  const createMutation = useCreatePathwayAction()
  const deleteMutation = useDeletePathwayAction()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [actionName, setActionName] = React.useState('')
  const [actionIcon, setActionIcon] = React.useState('default')
  const [actionType, setActionType] = React.useState<PathwayActionType>('CHECKLIST')
  const [carersCount, setCarersCount] = React.useState('1')
  const [checklistId, setChecklistId] = React.useState('')

  const loading = actionsQuery.isLoading || checklistsQuery.isLoading
  const rows = actionsQuery.data?.rows ?? []
  const checklists = checklistsQuery.data ?? []
  const saving = createMutation.isPending || deleteMutation.isPending

  const onCreate = async () => {
    const name = actionName.trim()
    if (!name) {
      toastError('Action name is required.')
      return
    }
    const count = Number(carersCount)
    if (count < 1 || count > 9) {
      toastError('Staff count must be between 1 and 9.')
      return
    }
    try {
      await createMutation.mutateAsync({
        actionName: name,
        actionIcon: actionIcon.trim() || 'default',
        actionType,
        carersCount: count,
        checklistIds: checklistId ? [checklistId] : undefined,
      })
      toastSuccess('Action created.')
      setDialogOpen(false)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Create failed.')
    }
  }

  const onDelete = async (row: { id: string; actionName: string }) => {
    if (!canDelete || !window.confirm(`Delete "${row.actionName}"?`)) return
    try {
      await deleteMutation.mutateAsync(row.id)
      toastSuccess('Action deleted.')
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Delete failed.')
    }
  }

  return (
    <div className="space-y-4" data-testid="pathway-actions-tab">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Actions</h2>
        {canCreate && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setActionName('')
              setActionIcon('default')
              setActionType('CHECKLIST')
              setCarersCount('1')
              setChecklistId('')
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add action
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Checklists</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={5}>Loading…</TableCell>
            </TableRow>
          )}
          {!loading &&
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.actionName}</TableCell>
                <TableCell>{row.actionType}</TableCell>
                <TableCell>{row.carersCount}</TableCell>
                <TableCell>{row.checklists.map(c => c.name).join(', ') || '—'}</TableCell>
                <TableCell>
                  {canDelete && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => void onDelete(row)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New action</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Input value={actionName} onChange={e => setActionName(e.target.value)} placeholder="Action name" />
            <Input value={actionIcon} onChange={e => setActionIcon(e.target.value)} placeholder="Icon key" />
            <Select value={actionType} onValueChange={v => setActionType(v as PathwayActionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECKLIST">Checklist</SelectItem>
                <SelectItem value="OBSERVATION">Observation</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              max={9}
              value={carersCount}
              onChange={e => setCarersCount(e.target.value)}
              placeholder="Staff count (1–9)"
            />
            <Select value={checklistId || '_none'} onValueChange={v => setChecklistId(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Link checklist (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {checklists.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

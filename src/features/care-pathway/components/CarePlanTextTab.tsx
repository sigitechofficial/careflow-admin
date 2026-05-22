import * as React from 'react'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  createCarePlanTextTemplate,
  deleteCarePlanTextTemplate,
  listCarePlanTextCategories,
  listCarePlanTextTemplates,
  previewCarePlanText,
  type CarePlanTextTemplate,
} from '../api/care-plan-text.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/form-field'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-table'
import { useAuthStore } from '@/store/auth.store'
import { toastError, toastSuccess } from '@/lib/toast'

export function CarePlanTextTab() {
  const canCreate = useAuthStore(s => s.can('care_plan_text.create'))
  const canDelete = useAuthStore(s => s.can('care_plan_text.delete'))
  const canPreview = useAuthStore(s => s.can('care_plan_text.preview'))
  const [rows, setRows] = React.useState<CarePlanTextTemplate[]>([])
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewHtml, setPreviewHtml] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [contentHtml, setContentHtml] = React.useState('')
  const [previewName, setPreviewName] = React.useState('Alex')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [templates, cats] = await Promise.all([
        listCarePlanTextTemplates(),
        listCarePlanTextCategories(),
      ])
      setRows(templates)
      setCategories(cats)
      if (cats[0] && !categoryId) setCategoryId(cats[0].id)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not load care plan text.')
    } finally {
      setLoading(false)
    }
  }, [categoryId])

  React.useEffect(() => {
    void load()
  }, [load])

  const onCreate = async () => {
    if (!canCreate) return
    if (!title.trim() || !contentHtml.trim()) {
      toastError('Title and content are required.')
      return
    }
    setSaving(true)
    try {
      await createCarePlanTextTemplate({
        title: title.trim(),
        categoryId: categoryId || undefined,
        contentHtml: contentHtml.trim(),
      })
      toastSuccess('Template created.')
      setDialogOpen(false)
      setTitle('')
      setContentHtml('')
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  const onPreview = async (row: CarePlanTextTemplate) => {
    if (!canPreview) return
    try {
      const result = await previewCarePlanText(row.id, previewName.trim() || 'Service user')
      setPreviewHtml(result.contentHtml)
      setPreviewOpen(true)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Preview failed.')
    }
  }

  const onDelete = async (row: CarePlanTextTemplate) => {
    if (!canDelete || !window.confirm(`Delete "${row.title}"?`)) return
    try {
      await deleteCarePlanTextTemplate(row.id)
      toastSuccess('Template deleted.')
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Delete failed.')
    }
  }

  return (
    <div className="space-y-4" data-testid="care-plan-text-tab">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Care Plan Text</h2>
        {canCreate && (
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add template
          </Button>
        )}
        <Input
          className="ml-auto max-w-[10rem]"
          value={previewName}
          onChange={e => setPreviewName(e.target.value)}
          placeholder="Preview name for @"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Use <code>@</code> in templates for the service user name. Preview replaces it with the name above.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={3}>Loading…</TableCell>
            </TableRow>
          )}
          {!loading &&
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.category?.name ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canPreview && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => void onPreview(row)}>
                        <Eye className="h-4 w-4" />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={8}
              value={contentHtml}
              onChange={e => setContentHtml(e.target.value)}
              placeholder="HTML content (use @ for name)"
            />
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

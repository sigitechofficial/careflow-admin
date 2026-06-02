import * as React from 'react'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { CarePlanTextTemplate } from '@/features/care-pathway/types/care-pathway.types'
import {
  useCreateCarePlanTextTemplate,
  useDeleteCarePlanTextTemplate,
  usePreviewCarePlanText,
} from '@/features/care-pathway/hooks/useCarePathwayMutations'
import {
  useCarePlanTextCategories,
  useCarePlanTextTemplates,
} from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
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

export function CarePlanTextTab() {
  const canCreate = useAuthStore(s => s.can('care_plan_text.create'))
  const canDelete = useAuthStore(s => s.can('care_plan_text.delete'))
  const canPreview = useAuthStore(s => s.can('care_plan_text.preview'))

  const templatesQuery = useCarePlanTextTemplates()
  const categoriesQuery = useCarePlanTextCategories()
  const createMutation = useCreateCarePlanTextTemplate()
  const deleteMutation = useDeleteCarePlanTextTemplate()
  const previewMutation = usePreviewCarePlanText()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewHtml, setPreviewHtml] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [contentHtml, setContentHtml] = React.useState('')
  const [previewName, setPreviewName] = React.useState('Alex')

  const loading = templatesQuery.isLoading || categoriesQuery.isLoading
  const rows = templatesQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const saving = createMutation.isPending || deleteMutation.isPending || previewMutation.isPending

  React.useEffect(() => {
    if (categories[0] && !categoryId) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  const onCreate = async () => {
    if (!canCreate) return
    if (!title.trim() || !contentHtml.trim()) {
      toastError('Title and content are required.')
      return
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        categoryId: categoryId || undefined,
        contentHtml: contentHtml.trim(),
      })
      toastSuccess('Template created.')
      setDialogOpen(false)
      setTitle('')
      setContentHtml('')
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Create failed.')
    }
  }

  const onPreview = async (row: CarePlanTextTemplate) => {
    if (!canPreview) return
    try {
      const result = await previewMutation.mutateAsync({
        id: row.id,
        serviceUserName: previewName.trim() || 'Service user',
      })
      setPreviewHtml(result.contentHtml)
      setPreviewOpen(true)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Preview failed.')
    }
  }

  const onDelete = async (row: CarePlanTextTemplate) => {
    if (!canDelete || !window.confirm(`Delete "${row.title}"?`)) return
    try {
      await deleteMutation.mutateAsync(row.id)
      toastSuccess('Template deleted.')
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

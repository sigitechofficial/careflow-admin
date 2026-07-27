import * as React from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningCategory,
  useDeleteLearningCategory,
  useLearningCategories,
  useUpdateLearningCategory,
} from '@/features/learning/hooks/useLearning'
import type { LearningCategory, LearningCategoryInput } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: LearningCategory | null
}) {
  const createMut = useCreateLearningCategory()
  const updateMut = useUpdateLearningCategory()
  const [form, setForm] = React.useState<LearningCategoryInput>({
    name: '',
    code: '',
    description: '',
    displayOrder: 0,
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        name: category?.name ?? '',
        code: category?.code ?? '',
        description: category?.description ?? '',
        displayOrder: category?.displayOrder ?? 0,
        isActive: category?.isActive ?? true,
      })
    }
  }, [open, category])

  const saving = createMut.isPending || updateMut.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (category) {
        await updateMut.mutateAsync({ id: category.id, body: form })
        toastSuccess('Category updated')
      } else {
        await createMut.mutateAsync(form)
        toastSuccess('Category created')
      }
      onOpenChange(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormField label="Name" required>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Code" required>
              <Input
                value={form.code}
                onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                required
              />
            </FormField>
            <FormField label="Description">
              <Input
                value={form.description ?? ''}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CategoriesPanel() {
  const canManage = useAuthStore(s => s.can('learning.categories.manage'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editCategory, setEditCategory] = React.useState<LearningCategory | null>(null)
  const deleteMut = useDeleteLearningCategory()

  const query = useLearningCategories({ page, limit: 20, search: search || undefined })
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  const onDelete = async (category: LearningCategory) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    try {
      await deleteMut.mutateAsync(category.id)
      toastSuccess('Category deleted')
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Delete failed'))
    }
  }

  return (
    <div className="space-y-4" data-testid="learning-categories-panel">
      <ContentSectionHeader
        title="Categories"
        description="Organise courses into categories for reporting and browsing."
        action={
          canManage ? (
            <Button
              size="sm"
              onClick={() => {
                setEditCategory(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add category
            </Button>
          ) : undefined
        }
      />

      <Input
        placeholder="Search categories…"
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No categories found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Status</th>
                {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">
                    <LearningStatusBadge status={row.isActive === false ? 'ARCHIVED' : 'ACTIVE'} />
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit"
                          onClick={() => {
                            setEditCategory(row)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Delete"
                          onClick={() => void onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <CategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editCategory} />
    </div>
  )
}

import * as React from 'react'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  createCareForm,
  deleteCareForm,
  getCareForm,
  listCareForms,
  publishCareForm,
  saveCareFormSchema,
  updateCareForm,
  uploadCareFormIcon,
} from '../api/form-builder.api'
import { FormIconPicker } from './FormIconPicker'
import type {
  CareFormDetail,
  CareFormListRow,
  CareFormSectionRow,
  CarePathwayFormType,
  FormFieldType,
} from '../types/care-pathway.types'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-table'
import { Checkbox } from '@/components/ui/toggle-controls'
import { useAuthStore } from '@/store/auth.store'
import { toastError, toastSuccess } from '@/lib/toast'

const FORM_TYPES: { value: CarePathwayFormType; label: string }[] = [
  { value: 'CARE_PLAN', label: 'Care plan' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'SERVICE_FORM', label: 'Service form' },
  { value: 'STAFF_FORM', label: 'Staff form' },
]

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Time' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'RICH_TEXT', label: 'Rich text' },
]

function formTypeLabel(t: CarePathwayFormType) {
  return FORM_TYPES.find(f => f.value === t)?.label ?? t
}

const descriptionTextareaClass =
  'min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

function emptySection(sortOrder: number): CareFormSectionRow {
  return {
    id: `new-${sortOrder}`,
    title: '',
    description: null,
    sortOrder,
    fields: [],
  }
}

function emptyField(sortOrder: number) {
  return {
    id: `new-field-${sortOrder}`,
    label: '',
    fieldType: 'TEXT' as FormFieldType,
    placeholder: null,
    helpText: null,
    required: false,
    optionsJson: null,
    validationJson: null,
    sortOrder,
  }
}

export function FormBuilderTab() {
  const canCreate = useAuthStore(s => s.can('form_builder.create'))
  const canUpdate = useAuthStore(s => s.can('form_builder.update'))
  const canDelete = useAuthStore(s => s.can('form_builder.delete'))
  const canPublish = useAuthStore(s => s.can('form_builder.publish'))

  const [rows, setRows] = React.useState<CareFormListRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [filterType, setFilterType] = React.useState<CarePathwayFormType | 'ALL'>('ALL')

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState('')
  const [createType, setCreateType] = React.useState<CarePathwayFormType>('CARE_PLAN')
  const [createDescription, setCreateDescription] = React.useState('')
  const [createPictureUrl, setCreatePictureUrl] = React.useState<string | null>(null)
  const [createIconFile, setCreateIconFile] = React.useState<File | null>(null)

  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formName, setFormName] = React.useState('')
  const [formType, setFormType] = React.useState<CarePathwayFormType>('CARE_PLAN')
  const [formDescription, setFormDescription] = React.useState('')
  const [formStatus, setFormStatus] = React.useState('')
  const [formPictureUrl, setFormPictureUrl] = React.useState<string | null>(null)
  const [formIconFile, setFormIconFile] = React.useState<File | null>(null)
  const [sections, setSections] = React.useState<CareFormSectionRow[]>([])
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const { rows: data } = await listCareForms({
        search: search || undefined,
        formType: filterType === 'ALL' ? undefined : filterType,
        limit: 100,
      })
      setRows(data)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not load forms.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, filterType])

  React.useEffect(() => {
    const t = window.setTimeout(() => void load(), 200)
    return () => window.clearTimeout(t)
  }, [load])

  const openCreate = () => {
    setCreateName('')
    setCreateType('CARE_PLAN')
    setCreateDescription('')
    setCreatePictureUrl(null)
    setCreateIconFile(null)
    setCreateOpen(true)
  }

  const applyFormIcon = async (
    formId: string,
    pictureUrl: string | null,
    iconFile: File | null,
  ): Promise<string | null> => {
    if (iconFile) {
      const updated = await uploadCareFormIcon(formId, iconFile)
      return updated.pictureUrl ?? null
    }
    const updated = await updateCareForm(formId, { pictureUrl })
    return updated.pictureUrl ?? null
  }

  const onCreate = async () => {
    const n = createName.trim()
    if (!n) {
      toastError('Form name is required.')
      return
    }
    setSaving(true)
    try {
      const created = await createCareForm({
        name: n,
        formType: createType,
        description: createDescription.trim() || undefined,
        pictureUrl: createIconFile ? undefined : createPictureUrl ?? undefined,
      })
      if (createIconFile) {
        await applyFormIcon(created.id, createPictureUrl, createIconFile)
      } else if (createPictureUrl) {
        await updateCareForm(created.id, { pictureUrl: createPictureUrl })
      }
      toastSuccess('Form created.')
      setCreateOpen(false)
      await load()
      void openEditor(created.id)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not create form.')
    } finally {
      setSaving(false)
    }
  }

  const openEditor = async (id: string) => {
    setSaving(true)
    try {
      const form = await getCareForm(id)
      setEditingId(form.id)
      setFormName(form.name)
      setFormType(form.formType)
      setFormDescription(form.description ?? '')
      setFormStatus(form.status)
      setFormPictureUrl(form.pictureUrl ?? null)
      setFormIconFile(null)
      setSections(
        form.sections.length
          ? form.sections.map(s => ({
              ...s,
              fields: s.fields.map(f => ({ ...f })),
            }))
          : [emptySection(0)],
      )
      setEditorOpen(true)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not load form.')
    } finally {
      setSaving(false)
    }
  }

  const persistForm = async (): Promise<boolean> => {
    if (!editingId || !canUpdate) return false
    const n = formName.trim()
    if (!n) {
      toastError('Form name is required.')
      return false
    }
    const validSections = sections
      .map((s, i) => ({
        ...s,
        title: s.title.trim(),
        sortOrder: i,
        fields: s.fields
          .map((f, fi) => ({ ...f, label: f.label.trim(), sortOrder: fi }))
          .filter(f => f.label.length > 0),
      }))
      .filter(s => s.title.length > 0)

    if (!validSections.length) {
      toastError('Add at least one section with a title.')
      return false
    }

    await updateCareForm(editingId, {
      name: n,
      formType,
      description: formDescription.trim() || null,
      pictureUrl: formIconFile ? undefined : formPictureUrl,
    })
    if (formIconFile) {
      const nextUrl = await applyFormIcon(editingId, formPictureUrl, formIconFile)
      setFormPictureUrl(nextUrl)
      setFormIconFile(null)
    }
    await saveCareFormSchema(
      editingId,
      validSections.map(s => ({
        title: s.title,
        description: s.description ?? undefined,
        sortOrder: s.sortOrder,
        fields: s.fields.map(f => ({
          label: f.label,
          fieldType: f.fieldType,
          placeholder: f.placeholder?.trim() || undefined,
          helpText: f.helpText?.trim() || undefined,
          required: f.required,
          sortOrder: f.sortOrder,
        })),
      })),
    )
    return true
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const ok = await persistForm()
      if (!ok) return
      toastSuccess('Form saved.')
      setEditorOpen(false)
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const onPublish = async () => {
    if (!editingId || !canPublish) return
    if (!window.confirm('Publish this form? It will be available in Form Selection.')) return
    setSaving(true)
    try {
      const ok = await persistForm()
      if (!ok) return
      await publishCareForm(editingId)
      toastSuccess('Form published.')
      setEditorOpen(false)
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Publish failed.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row: CareFormListRow) => {
    if (!canDelete || !window.confirm(`Delete "${row.name}"?`)) return
    try {
      await deleteCareForm(row.id)
      toastSuccess('Form deleted.')
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Delete failed.')
    }
  }

  const updateSection = (index: number, patch: Partial<CareFormSectionRow>) => {
    setSections(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const addSection = () => {
    setSections(prev => [...prev, emptySection(prev.length)])
  }

  const removeSection = (index: number) => {
    setSections(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const addField = (sectionIndex: number) => {
    setSections(prev =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, fields: [...s.fields, emptyField(s.fields.length)] }
          : s,
      ),
    )
  }

  const updateField = (
    sectionIndex: number,
    fieldIndex: number,
    patch: Partial<CareFormSectionRow['fields'][number]>,
  ) => {
    setSections(prev =>
      prev.map((s, si) =>
        si === sectionIndex
          ? {
              ...s,
              fields: s.fields.map((f, fi) => (fi === fieldIndex ? { ...f, ...patch } : f)),
            }
          : s,
      ),
    )
  }

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    setSections(prev =>
      prev.map((s, si) =>
        si === sectionIndex
          ? { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIndex) }
          : s,
      ),
    )
  }

  return (
    <div className="space-y-6" data-testid="form-builder-tab">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Form Builder</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create customised care plans, assessments, and service forms. Save as draft, then publish
            to make them available in Form Selection.
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={openCreate} data-testid="form-builder-create">
            <Plus className="mr-2 h-4 w-4" />
            New form
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search forms…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={filterType}
          onValueChange={v => setFilterType(v as CarePathwayFormType | 'ALL')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {FORM_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading forms…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No forms yet. {canCreate ? 'Click “New form” to create one.' : ''}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{formTypeLabel(row.formType)}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => void openEditor(row.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${row.name}`}
                        onClick={() => void onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create form</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="create-form-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="create-form-name"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Form type</span>
              <Select value={createType} onValueChange={v => setCreateType(v as CarePathwayFormType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="create-form-desc" className="text-sm font-medium">
                Description (optional)
              </label>
              <textarea
                id="create-form-desc"
                className={descriptionTextareaClass}
                value={createDescription}
                onChange={e => setCreateDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Shown at the top of the form when carers open it"
              />
            </div>
            <FormIconPicker
              pictureUrl={createPictureUrl}
              onPictureUrlChange={setCreatePictureUrl}
              pendingFile={createIconFile}
              onPendingFileChange={setCreateIconFile}
              disabled={!canCreate}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onCreate()} disabled={saving}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit form</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-form-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="edit-form-name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  disabled={!canUpdate}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Type</span>
                <Select
                  value={formType}
                  onValueChange={v => setFormType(v as CarePathwayFormType)}
                  disabled={!canUpdate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-form-desc" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="edit-form-desc"
                className={descriptionTextareaClass}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                disabled={!canUpdate}
                rows={4}
                maxLength={2000}
                placeholder="Shown at the top of the form when carers open it"
              />
            </div>
            <p className="text-xs text-muted-foreground">Status: {formStatus}</p>

            <FormIconPicker
              pictureUrl={formPictureUrl}
              onPictureUrlChange={setFormPictureUrl}
              pendingFile={formIconFile}
              onPendingFileChange={setFormIconFile}
              disabled={!canUpdate}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Sections &amp; fields</h3>
                {canUpdate && (
                  <Button type="button" variant="outline" size="sm" onClick={addSection}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add section
                  </Button>
                )}
              </div>

              {sections.map((section, si) => (
                <div key={section.id} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1 space-y-1">
                      <span className="text-sm font-medium">Section title</span>
                      <Input
                        value={section.title}
                        onChange={e => updateSection(si, { title: e.target.value })}
                        disabled={!canUpdate}
                        placeholder="e.g. Personal details"
                      />
                    </div>
                    {canUpdate && sections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(si)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {section.fields.map((field, fi) => (
                      <li key={field.id} className="space-y-2 rounded-md bg-muted/40 p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto_auto]">
                          <Input
                            placeholder="Field label"
                            value={field.label}
                            onChange={e => updateField(si, fi, { label: e.target.value })}
                            disabled={!canUpdate}
                          />
                          <Select
                            value={field.fieldType}
                            onValueChange={v => updateField(si, fi, { fieldType: v as FormFieldType })}
                            disabled={!canUpdate}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={v => updateField(si, fi, { required: v === true })}
                              disabled={!canUpdate}
                            />
                            Required
                          </label>
                          {canUpdate && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeField(si, fi)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Tooltip
                            </span>
                            <Input
                              placeholder="Help text shown on hover (optional)"
                              value={field.helpText ?? ''}
                              onChange={e =>
                                updateField(si, fi, { helpText: e.target.value || null })
                              }
                              disabled={!canUpdate}
                              maxLength={500}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Placeholder
                            </span>
                            <Input
                              placeholder="Placeholder inside the field (optional)"
                              value={field.placeholder ?? ''}
                              onChange={e =>
                                updateField(si, fi, { placeholder: e.target.value || null })
                              }
                              disabled={!canUpdate}
                              maxLength={500}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {canUpdate && (
                    <Button type="button" variant="outline" size="sm" onClick={() => addField(si)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add field
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </DialogBody>
          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Close
            </Button>
            {canUpdate && (
              <Button type="button" onClick={() => void onSave()} disabled={saving}>
                Save form
              </Button>
            )}
            {canPublish && formStatus !== 'PUBLISHED' && (
              <Button type="button" variant="secondary" onClick={() => void onPublish()} disabled={saving}>
                <Upload className="mr-2 h-4 w-4" />
                Save &amp; publish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

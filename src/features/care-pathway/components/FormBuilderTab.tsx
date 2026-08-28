import * as React from 'react'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { FormIconPicker } from './FormIconPicker'
import { FormBuilderFieldEditor } from '@/features/care-pathway/components/FormBuilderFieldEditor'
import {
  flattenPriorFieldOptions,
  parseConditionalLogic,
  serializeConditionalLogic,
} from '@/features/care-pathway/utils/form-builder-conditional-logic.util'
import {
  fieldTypeUsesOptions,
  parseFieldOptions,
  serializeFieldOptions,
} from '@/features/care-pathway/utils/form-builder-field-options.util'
import type {
  CareFormDetail,
  CareFormListRow,
  CareFormSectionRow,
  CarePathwayFormType,
  FormFieldType,
} from '@/features/care-pathway/types/care-pathway.types'
import {
  useCreateCareForm,
  useDeleteCareForm,
  usePublishCareForm,
  useSaveCareFormSchema,
  useUpdateCareForm,
  useUploadCareFormIcon,
} from '@/features/care-pathway/hooks/useCarePathwayMutations'
import { useCareForm, useCareForms } from '@/features/care-pathway/hooks/useCarePathwayTabs'
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
  { value: 'RADIO', label: 'Radio (single choice)' },
  { value: 'MULTI_SELECT', label: 'Multi select' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'SECTION_TEXT', label: 'Guidance text (display only)' },
  { value: 'RICH_TEXT', label: 'Rich text' },
  { value: 'FILE_UPLOAD', label: 'File upload' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'SIGNATURE', label: 'Signature' },
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
    conditionalLogicJson: null,
    sortOrder,
  }
}

function sectionsFromForm(form: CareFormDetail): CareFormSectionRow[] {
  return form.sections.length
    ? form.sections.map(s => ({
        ...s,
        fields: s.fields.map(f => ({ ...f })),
      }))
    : [emptySection(0)]
}

export function FormBuilderTab() {
  const canCreate = useAuthStore(s => s.can('form_builder.create'))
  const canUpdate = useAuthStore(s => s.can('form_builder.update'))
  const canDelete = useAuthStore(s => s.can('form_builder.delete'))
  const canPublish = useAuthStore(s => s.can('form_builder.publish'))

  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
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
  const [editorDirty, setEditorDirty] = React.useState(false)

  const createMutation = useCreateCareForm()
  const updateMutation = useUpdateCareForm()
  const saveSchemaMutation = useSaveCareFormSchema()
  const publishMutation = usePublishCareForm()
  const deleteMutation = useDeleteCareForm()
  const uploadIconMutation = useUploadCareFormIcon()

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    saveSchemaMutation.isPending ||
    publishMutation.isPending ||
    deleteMutation.isPending ||
    uploadIconMutation.isPending

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(t)
  }, [search])

  const formsQuery = useCareForms({
    search: debouncedSearch || undefined,
    formType: filterType === 'ALL' ? undefined : filterType,
    limit: 100,
  })
  const formQuery = useCareForm(editingId ?? '', editorOpen && !!editingId)

  const loading = formsQuery.isLoading
  const rows = formsQuery.data?.rows ?? []

  React.useEffect(() => {
    if (formQuery.data && editorOpen && !editorDirty) {
      const form = formQuery.data
      setFormName(form.name)
      setFormType(form.formType)
      setFormDescription(form.description ?? '')
      setFormStatus(form.status)
      setFormPictureUrl(form.pictureUrl ?? null)
      setFormIconFile(null)
      setSections(sectionsFromForm(form))
    }
  }, [formQuery.data, editorOpen, editorDirty])

  React.useEffect(() => {
    if (formQuery.error && editorOpen) {
      toastError(
        formQuery.error instanceof ApiError ? formQuery.error.message : 'Could not load form.',
      )
    }
  }, [formQuery.error, editorOpen])

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
      const updated = await uploadIconMutation.mutateAsync({ id: formId, file: iconFile })
      return updated.pictureUrl ?? null
    }
    const updated = await updateMutation.mutateAsync({ id: formId, body: { pictureUrl } })
    return updated.pictureUrl ?? null
  }

  const onCreate = async () => {
    const n = createName.trim()
    if (!n) {
      toastError('Form name is required.')
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        name: n,
        formType: createType,
        description: createDescription.trim() || undefined,
        pictureUrl: createIconFile ? undefined : createPictureUrl ?? undefined,
      })
      if (createIconFile) {
        await applyFormIcon(created.id, createPictureUrl, createIconFile)
      } else if (createPictureUrl) {
        await updateMutation.mutateAsync({ id: created.id, body: { pictureUrl: createPictureUrl } })
      }
      toastSuccess('Form created.')
      setCreateOpen(false)
      openEditor(created.id)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not create form.')
    }
  }

  const openEditor = (id: string) => {
    setEditingId(id)
    setEditorDirty(false)
    setEditorOpen(true)
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
          .filter((f) =>
            f.fieldType === 'SECTION_TEXT'
              ? Boolean(f.label.trim() || f.helpText?.trim())
              : f.label.length > 0,
          ),
      }))
      .filter(s => s.title.length > 0)

    if (!validSections.length) {
      toastError('Add at least one section with a title.')
      return false
    }

    await updateMutation.mutateAsync({
      id: editingId,
      body: {
        name: n,
        formType,
        description: formDescription.trim() || null,
        pictureUrl: formIconFile ? undefined : formPictureUrl,
      },
    })
    if (formIconFile) {
      const nextUrl = await applyFormIcon(editingId, formPictureUrl, formIconFile)
      setFormPictureUrl(nextUrl)
      setFormIconFile(null)
    }
    await saveSchemaMutation.mutateAsync({
      id: editingId,
      sections: validSections.map(s => ({
        title: s.title,
        description: s.description ?? undefined,
        sortOrder: s.sortOrder,
        fields: s.fields.map((f) => {
          const options = parseFieldOptions(f.optionsJson)
          const fieldKey = f.fieldKey?.trim().toLowerCase() || undefined
          return {
            label: f.label,
            fieldKey,
            fieldType: f.fieldType,
            placeholder: f.placeholder?.trim() || undefined,
            helpText: f.helpText?.trim() || undefined,
            required: f.fieldType === 'SECTION_TEXT' ? false : f.required,
            sortOrder: f.sortOrder,
            optionsJson:
              fieldTypeUsesOptions(f.fieldType) && options.length
                ? serializeFieldOptions(options)
                : undefined,
            conditionalLogicJson:
              serializeConditionalLogic(parseConditionalLogic(f.conditionalLogicJson)) ?? undefined,
          }
        }),
      })),
    })
    return true
  }

  const onSave = async () => {
    try {
      const ok = await persistForm()
      if (!ok) return
      toastSuccess('Form saved.')
      setEditorDirty(false)
      setEditorOpen(false)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  const onPublish = async () => {
    if (!editingId || !canPublish) return
    if (!window.confirm('Publish this form? It will be available in Form Selection.')) return
    try {
      const ok = await persistForm()
      if (!ok) return
      await publishMutation.mutateAsync(editingId)
      toastSuccess('Form published.')
      setEditorDirty(false)
      setEditorOpen(false)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Publish failed.')
    }
  }

  const onDelete = async (row: CareFormListRow) => {
    if (!canDelete || !window.confirm(`Delete "${row.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(row.id)
      toastSuccess('Form deleted.')
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Delete failed.')
    }
  }

  const markDirty = () => setEditorDirty(true)

  const updateSection = (index: number, patch: Partial<CareFormSectionRow>) => {
    markDirty()
    setSections(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const addSection = () => {
    markDirty()
    setSections(prev => [...prev, emptySection(prev.length)])
  }

  const removeSection = (index: number) => {
    markDirty()
    setSections(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const addField = (sectionIndex: number) => {
    markDirty()
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
    markDirty()
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
    markDirty()
    setSections(prev =>
      prev.map((s, si) =>
        si === sectionIndex
          ? { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIndex) }
          : s,
      ),
    )
  }

  const editorLoading = editorOpen && !!editingId && formQuery.isLoading

  return (
    <div className="space-y-6" data-testid="form-builder-tab">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Form Builder</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create customised care plans, assessments, and service forms. Use sections, guidance text,
            dropdowns with options, and multi-select fields for comprehensive assessments. Save as draft,
            then publish to make them available in Form Selection.
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
                        onClick={() => openEditor(row.id)}
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

      <Dialog
        open={editorOpen}
        onOpenChange={open => {
          setEditorOpen(open)
          if (!open) {
            setEditingId(null)
            setEditorDirty(false)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit form</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-6">
            {editorLoading ? (
              <p className="text-sm text-muted-foreground">Loading form…</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="edit-form-name" className="text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="edit-form-name"
                      value={formName}
                      onChange={e => {
                        markDirty()
                        setFormName(e.target.value)
                      }}
                      disabled={!canUpdate}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Type</span>
                    <Select
                      value={formType}
                      onValueChange={v => {
                        markDirty()
                        setFormType(v as CarePathwayFormType)
                      }}
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
                    onChange={e => {
                      markDirty()
                      setFormDescription(e.target.value)
                    }}
                    disabled={!canUpdate}
                    rows={4}
                    maxLength={2000}
                    placeholder="Shown at the top of the form when carers open it"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Status: {formStatus}</p>

                <FormIconPicker
                  pictureUrl={formPictureUrl}
                  onPictureUrlChange={url => {
                    markDirty()
                    setFormPictureUrl(url)
                  }}
                  pendingFile={formIconFile}
                  onPendingFileChange={file => {
                    markDirty()
                    setFormIconFile(file)
                  }}
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
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Section description</span>
                        <textarea
                          className={descriptionTextareaClass}
                          value={section.description ?? ''}
                          onChange={(event) =>
                            updateSection(si, { description: event.target.value || null })
                          }
                          disabled={!canUpdate}
                          rows={3}
                          maxLength={2000}
                          placeholder="Optional intro shown under the section title (e.g. guidance for staff)."
                        />
                      </div>

                      <ul className="space-y-3">
                        {section.fields.map((field, fi) => (
                          <FormBuilderFieldEditor
                            key={field.id}
                            field={field}
                            fieldTypes={FIELD_TYPES}
                            priorFieldOptions={flattenPriorFieldOptions(sections, section.id, field.id)}
                            disabled={!canUpdate}
                            onChange={(patch) => updateField(si, fi, patch)}
                            onRemove={() => removeField(si, fi)}
                          />
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
              </>
            )}
          </DialogBody>
          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Close
            </Button>
            {canUpdate && (
              <Button type="button" onClick={() => void onSave()} disabled={saving || editorLoading}>
                Save form
              </Button>
            )}
            {canPublish && formStatus !== 'PUBLISHED' && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onPublish()}
                disabled={saving || editorLoading}
              >
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

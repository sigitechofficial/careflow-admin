import * as React from 'react'
import { ChevronLeft, FileText, Folder, FolderOpen, Loader2, Upload, X } from 'lucide-react'
import { cn, formatDate as formatOrgDate } from '@/shared/lib/utils'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu'
import { DocumentStoreComplianceStrip } from '@/features/service-users/documents/components/DocumentStoreComplianceStrip'
import {
  useServiceUserDocumentStore,
  useServiceUserDocumentStoreMutations,
} from '@/features/service-users/documents/hooks/useServiceUserDocumentStore'
import {
  ACCESS_LEVEL_LABELS,
  DOCUMENT_STATUS_LABELS,
  type ServiceUserDocumentAccessLevel,
  type ServiceUserDocumentRecordRow,
  type ServiceUserDocumentRecordStatus,
  type ServiceUserDocumentTypeRow,
  downloadServiceUserDocumentRecord,
} from '@/features/service-users/documents/service-user-document-store.api'


function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const normalized = iso.includes('T') ? iso : `${iso}T12:00:00`
  return formatOrgDate(normalized)
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type UploadForm = {
  documentTypeId: string
  title: string
  documentDate: string
  expiryDate: string
  physicalLocationInHome: string
  accessLevel: ServiceUserDocumentAccessLevel
  status: ServiceUserDocumentRecordStatus
  supersedesDocumentId: string
  notes: string
}

function emptyUploadForm(typeId = ''): UploadForm {
  return {
    documentTypeId: typeId,
    title: '',
    documentDate: todayIso(),
    expiryDate: '',
    physicalLocationInHome: '',
    accessLevel: 'COORDINATOR_MANAGER',
    status: 'ACTIVE',
    supersedesDocumentId: '',
    notes: '',
  }
}

function titleFromFileName(name: string): string {
  const trimmed = name.trim()
  const dot = trimmed.lastIndexOf('.')
  if (dot > 0) return trimmed.slice(0, dot).trim() || trimmed
  return trimmed
}

function explorerItemClass(selected: boolean): string {
  return cn(
    'flex w-[7.5rem] flex-col items-center gap-2 rounded-lg border border-transparent p-3 text-center transition-colors',
    'hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    selected && 'border-teal-500/60 bg-teal-50/80 dark:bg-teal-950/30',
  )
}

function fileIconClass(mimeType: string | null): string {
  if (mimeType?.startsWith('image/')) return 'text-sky-600'
  if (mimeType === 'application/pdf') return 'text-red-600'
  return 'text-teal-700'
}
function allowedAccessLevels(
  type: ServiceUserDocumentTypeRow | undefined,
): ServiceUserDocumentAccessLevel[] {
  if (!type) return ['COORDINATOR_MANAGER']
  const order: ServiceUserDocumentAccessLevel[] = [
    'MANAGER_ONLY',
    'COORDINATOR_MANAGER',
    'CARER_SUMMARY',
    'ALL_USERS',
  ]
  const defaultIdx = order.indexOf(type.defaultAccessLevel)
  return order.slice(0, defaultIdx + 1)
}

export function ServiceUserDocumentStorePanel({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.documents.read') || can('service_users.read')
  const canUpload = can('service_users.documents.update') || can('service_users.update')
  const canDelete = can('service_users.documents.delete') || can('service_users.delete')

  const storeQuery = useServiceUserDocumentStore(serviceUserId, canRead)
  const { upload, update, remove } = useServiceUserDocumentStoreMutations(serviceUserId)

  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = React.useState<string | null>(null)
  const [openedFolderId, setOpenedFolderId] = React.useState<string | null>(null)
  const [showSuperseded, setShowSuperseded] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [editDoc, setEditDoc] = React.useState<ServiceUserDocumentRecordRow | null>(null)
  const [uploadForm, setUploadForm] = React.useState<UploadForm>(() => emptyUploadForm())
  const [uploadTypeLocked, setUploadTypeLocked] = React.useState(false)
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([])
  const [isUploadingBatch, setIsUploadingBatch] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const data = storeQuery.data
  const documentTypes = data?.documentTypes ?? []
  const documents = data?.documents ?? []

  const selectedType = documentTypes.find((t) => t.id === uploadForm.documentTypeId)

  React.useEffect(() => {
    if (selectedType) {
      setUploadForm((f) => ({
        ...f,
        accessLevel: selectedType.defaultAccessLevel,
      }))
    }
  }, [selectedType?.id, selectedType?.defaultAccessLevel])

  const folders = React.useMemo(() => {
    return documentTypes.map((type) => {
      const typeDocs = documents.filter((doc) => doc.documentTypeId === type.id)
      const visibleCount = typeDocs.filter((doc) => doc.status !== 'SUPERSEDED').length
      const totalCount = showSuperseded ? typeDocs.length : visibleCount
      return {
        ...type,
        documents: typeDocs.filter((doc) => showSuperseded || doc.status !== 'SUPERSEDED'),
        documentCount: totalCount,
      }
    })
  }, [documentTypes, documents, showSuperseded])

  React.useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0]!.id)
    }
  }, [folders, selectedFolderId])

  const openedFolder = folders.find((folder) => folder.id === openedFolderId) ?? null
  const visibleDocuments = openedFolder?.documents ?? []

  const openFolder = React.useCallback((folderId: string) => {
    setSelectedFolderId(folderId)
    setSelectedDocumentId(null)
    setOpenedFolderId(folderId)
  }, [])

  const closeFolder = React.useCallback(() => {
    setOpenedFolderId(null)
    setSelectedDocumentId(null)
  }, [])

  const openDocumentFile = React.useCallback((doc: ServiceUserDocumentRecordRow) => {
    const href = resolveMediaUrl(doc.fileUrl)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }, [])

  const downloadDocumentFile = React.useCallback(
    async (doc: ServiceUserDocumentRecordRow) => {
      const fallbackName =
        doc.fileName?.trim() ||
        `${doc.title.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'document'}`
      try {
        await downloadServiceUserDocumentRecord(serviceUserId, doc.id, fallbackName)
      } catch (error) {
        toastApiError(error, 'Could not download document')
      }
    },
    [serviceUserId],
  )

  const supersedeOptions = React.useMemo(() => {
    return documents.filter(
      (d) =>
        d.documentTypeId === uploadForm.documentTypeId &&
        d.status === 'ACTIVE' &&
        d.id !== editDoc?.id,
    )
  }, [documents, editDoc?.id, uploadForm.documentTypeId])

  const openUpload = (typeId?: string) => {
    const type = typeId ?? documentTypes[0]?.id ?? ''
    const t = documentTypes.find((row) => row.id === type)
    setUploadForm(emptyUploadForm(type))
    if (t) setUploadForm((f) => ({ ...f, accessLevel: t.defaultAccessLevel }))
    setPendingFiles([])
    setEditDoc(null)
    setUploadTypeLocked(Boolean(typeId))
    setUploadOpen(true)
  }

  const onFilesSelected = (fileList: FileList | null) => {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    setPendingFiles(files)
    if (files.length === 1) {
      setUploadForm((f) => ({ ...f, title: titleFromFileName(files[0]!.name) }))
    } else {
      setUploadForm((f) => ({ ...f, title: '', supersedesDocumentId: '' }))
    }
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 1) {
        setUploadForm((f) => ({ ...f, title: titleFromFileName(next[0]!.name) }))
      }
      if (next.length === 0) {
        setUploadForm((f) => ({ ...f, title: '' }))
      }
      return next
    })
  }

  const openEdit = (doc: ServiceUserDocumentRecordRow) => {
    setEditDoc(doc)
    setUploadTypeLocked(true)
    setUploadForm({
      documentTypeId: doc.documentTypeId,
      title: doc.title,
      documentDate: doc.documentDate,
      expiryDate: doc.expiryDate ?? '',
      physicalLocationInHome: doc.physicalLocationInHome ?? '',
      accessLevel: doc.accessLevel,
      status: doc.status,
      supersedesDocumentId: doc.supersedesDocumentId ?? '',
      notes: doc.notes ?? '',
    })
    setPendingFiles([])
    setUploadOpen(true)
  }

  const buildUploadPayload = (file: File, title: string) => ({
    file,
    documentTypeId: uploadForm.documentTypeId,
    title,
    documentDate: uploadForm.documentDate,
    expiryDate: uploadForm.expiryDate.trim() || undefined,
    physicalLocationInHome: uploadForm.physicalLocationInHome.trim() || undefined,
    accessLevel: uploadForm.accessLevel,
    status: uploadForm.status,
    supersedesDocumentId: uploadForm.supersedesDocumentId.trim() || undefined,
    notes: uploadForm.notes.trim() || undefined,
  })

  const handleSave = async () => {
    if (!uploadForm.documentDate) return

    try {
      if (editDoc) {
        if (!uploadForm.title.trim()) return
        await update.mutateAsync({
          documentId: editDoc.id,
          body: {
            title: uploadForm.title.trim(),
            documentDate: uploadForm.documentDate,
            expiryDate: uploadForm.expiryDate.trim() ? uploadForm.expiryDate : null,
            physicalLocationInHome: uploadForm.physicalLocationInHome.trim() || null,
            accessLevel: uploadForm.accessLevel,
            status: uploadForm.status,
            supersedesDocumentId: uploadForm.supersedesDocumentId.trim() || null,
            notes: uploadForm.notes.trim() || null,
          },
        })
        toastSuccess('Document updated')
        setUploadOpen(false)
        return
      }

      if (!pendingFiles.length || !uploadForm.documentTypeId) return

      setIsUploadingBatch(true)
      let uploaded = 0
      for (const file of pendingFiles) {
        const title =
          pendingFiles.length === 1
            ? uploadForm.title.trim() || titleFromFileName(file.name)
            : titleFromFileName(file.name)
        await upload.mutateAsync(buildUploadPayload(file, title))
        uploaded += 1
      }
      toastSuccess(uploaded === 1 ? 'Document uploaded' : `${uploaded} documents uploaded`)
      setUploadOpen(false)
    } catch (error) {
      toastApiError(error, editDoc ? 'Could not update document' : 'Could not upload document(s)')
    } finally {
      setIsUploadingBatch(false)
    }
  }

  const handleDelete = async (doc: ServiceUserDocumentRecordRow) => {
    if (!window.confirm(`Remove "${doc.title}" from the document store?`)) return
    try {
      await remove.mutateAsync(doc.id)
      toastSuccess('Document removed')
    } catch (error) {
      toastApiError(error, 'Could not remove document')
    }
  }

  const formType = editDoc?.documentType ?? selectedType
  const accessOptions = allowedAccessLevels(formType)
  const isMultiUpload = !editDoc && pendingFiles.length > 1
  const uploadBusy = isUploadingBatch || upload.isPending || update.isPending
  const canSubmitUpload =
    Boolean(uploadForm.documentDate && uploadForm.documentTypeId && pendingFiles.length > 0) &&
    (pendingFiles.length > 1 || Boolean(uploadForm.title.trim()))

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        You do not have permission to view the document store.
      </div>
    )
  }

  if (storeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading document store…
      </div>
    )
  }

  if (storeQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Could not load document store.{' '}
        <button type="button" className="underline" onClick={() => void storeQuery.refetch()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {data?.compliance ? (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <DocumentStoreComplianceStrip
            compliance={data.compliance}
            carePlanApprovalBlocked={data.carePlanApprovalBlocked}
          />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={!openedFolderId}
            onClick={closeFolder}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm" aria-label="Folder path">
            <button
              type="button"
              onClick={closeFolder}
              className={cn(
                'truncate rounded px-1 py-0.5 hover:bg-accent/60',
                !openedFolderId ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              Document store
            </button>
            {openedFolder ? (
              <>
                <span className="text-muted-foreground">›</span>
                <span className="truncate font-semibold text-foreground">{openedFolder.name}</span>
              </>
            ) : null}
          </nav>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showSuperseded}
              onChange={(e) => setShowSuperseded(e.target.checked)}
            />
            Show superseded
          </label>

          {canUpload ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openUpload(openedFolderId ?? selectedFolderId ?? undefined)}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {openedFolderId ? 'Upload here' : 'Upload'}
            </Button>
          ) : null}
        </div>

        <div className="min-h-[22rem] p-4">
          {!openedFolder ? (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                Double-click a folder to open it, or right-click and choose Open.
              </p>
              <div className="flex flex-wrap gap-1">
                {folders.map((folder) => {
                  const selected = folder.id === selectedFolderId
                  return (
                    <ContextMenu key={folder.id}>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(folder.id)}
                          onDoubleClick={() => openFolder(folder.id)}
                          className={explorerItemClass(selected)}
                        >
                          <Folder className="h-12 w-12 shrink-0 text-amber-500" strokeWidth={1.25} />
                          <span className="line-clamp-3 w-full text-xs leading-snug text-foreground">
                            {folder.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {folder.documentCount} item{folder.documentCount === 1 ? '' : 's'}
                          </span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="min-w-[10rem]">
                        <ContextMenuItem onSelect={() => openFolder(folder.id)}>Open</ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )
                })}
              </div>
            </>
          ) : visibleDocuments.length === 0 ? (
            <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 text-center">
              <FolderOpen className="h-14 w-14 text-muted-foreground/35" strokeWidth={1.25} />
              <p className="text-sm text-muted-foreground">This folder is empty.</p>
              {canUpload ? (
                <Button type="button" size="sm" variant="outline" onClick={() => openUpload(openedFolder.id)}>
                  Upload first document
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {visibleDocuments.map((doc) => {
                const selected = doc.id === selectedDocumentId
                return (
                  <ContextMenu key={doc.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSelectedDocumentId(doc.id)}
                        onDoubleClick={() => openDocumentFile(doc)}
                        className={explorerItemClass(selected)}
                        title={doc.title}
                      >
                        <FileText className={cn('h-12 w-12 shrink-0', fileIconClass(doc.mimeType))} strokeWidth={1.25} />
                        <span className="line-clamp-3 w-full text-xs font-medium leading-snug text-foreground">
                          {doc.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(doc.documentDate)}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                            doc.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.status === 'EXPIRED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {DOCUMENT_STATUS_LABELS[doc.status]}
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-[10rem]">
                      <ContextMenuItem
                        disabled={!resolveMediaUrl(doc.fileUrl)}
                        onSelect={() => openDocumentFile(doc)}
                      >
                        Open
                      </ContextMenuItem>
                      <ContextMenuItem
                        disabled={!resolveMediaUrl(doc.fileUrl)}
                        onSelect={() => void downloadDocumentFile(doc)}
                      >
                        Download
                      </ContextMenuItem>
                      {canUpload ? (
                        <ContextMenuItem onSelect={() => openEdit(doc)}>Edit</ContextMenuItem>
                      ) : null}
                      {canDelete ? (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => void handleDelete(doc)}
                          >
                            Delete
                          </ContextMenuItem>
                        </>
                      ) : null}
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {editDoc
                ? 'Edit document record'
                : pendingFiles.length > 1
                  ? `Upload ${pendingFiles.length} documents`
                  : 'Upload document'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {!editDoc ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Document type</span>
                {uploadTypeLocked && formType ? (
                  <p className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">{formType.name}</p>
                ) : (
                  <select
                    id="doc-type"
                    value={uploadForm.documentTypeId}
                    onChange={(e) => setUploadForm((f) => ({ ...f, documentTypeId: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {documentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                )}
                {formType?.cqcLegalStandard ? (
                  <p className="text-xs text-muted-foreground">{formType.cqcLegalStandard}</p>
                ) : null}
              </div>
            ) : null}

            {!editDoc && pendingFiles.length <= 1 ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-title">
                  Title / description
                </label>
                <Input
                  id="doc-title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. LPA H&W — James Chen (son), OPG ref LP1234567"
                />
              </div>
            ) : null}

            {!editDoc && isMultiUpload ? (
              <p className="text-xs text-muted-foreground">
                Each file uses its filename as the document title. Shared metadata below applies to all files.
              </p>
            ) : null}

            {editDoc ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-title">
                  Title / description
                </label>
                <Input
                  id="doc-title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. LPA H&W — James Chen (son), OPG ref LP1234567"
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-date">
                  Date of document
                </label>
                <Input
                  id="doc-date"
                  type="date"
                  value={uploadForm.documentDate}
                  onChange={(e) => setUploadForm((f) => ({ ...f, documentDate: e.target.value }))}
                />
              </div>
              {formType?.expiryTrackingRequired ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-expiry">
                    Expiry date
                  </label>
                  <Input
                    id="doc-expiry"
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) => setUploadForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
              ) : null}
            </div>

            {formType?.physicalLocationInHomeRequired ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-location">
                  Physical location in home
                </label>
                <Input
                  id="doc-location"
                  value={uploadForm.physicalLocationInHome}
                  onChange={(e) => setUploadForm((f) => ({ ...f, physicalLocationInHome: e.target.value }))}
                  placeholder="e.g. Red folder on kitchen counter"
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-access">
                  Access level
                </label>
                <select
                  id="doc-access"
                  value={uploadForm.accessLevel}
                  onChange={(e) =>
                    setUploadForm((f) => ({
                      ...f,
                      accessLevel: e.target.value as ServiceUserDocumentAccessLevel,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {accessOptions.map((level) => (
                    <option key={level} value={level}>
                      {ACCESS_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-status">
                  Status
                </label>
                <select
                  id="doc-status"
                  value={uploadForm.status}
                  onChange={(e) =>
                    setUploadForm((f) => ({
                      ...f,
                      status: e.target.value as ServiceUserDocumentRecordStatus,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {supersedeOptions.length > 0 && !isMultiUpload ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-supersedes">
                  Supersedes (optional)
                </label>
                <select
                  id="doc-supersedes"
                  value={uploadForm.supersedesDocumentId}
                  onChange={(e) => setUploadForm((f) => ({ ...f, supersedesDocumentId: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">None</option>
                  {supersedeOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({formatDate(doc.documentDate)})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="doc-notes">
                Notes (optional)
              </label>
              <textarea
                id="doc-notes"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {!editDoc ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {pendingFiles.length > 1 ? 'Files' : 'File'}
                </span>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      onFilesSelected(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    Browse…
                  </Button>
                  <span className="min-w-0 flex-1 truncate rounded-md border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground">
                    {pendingFiles.length === 0
                      ? 'No files selected'
                      : pendingFiles.length === 1
                        ? pendingFiles[0]!.name
                        : `${pendingFiles.length} files selected`}
                  </span>
                </div>
                {pendingFiles.length > 1 ? (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
                    {pendingFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center gap-2 text-xs">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                        <span className="shrink-0 text-muted-foreground">{titleFromFileName(file.name)}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removePendingFile(index)}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or PDF. Select multiple files to upload in one go.
                </p>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={editDoc ? !uploadForm.title.trim() || !uploadForm.documentDate || uploadBusy : !canSubmitUpload || uploadBusy}
              onClick={() => void handleSave()}
            >
              {uploadBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editDoc ? (
                'Save changes'
              ) : pendingFiles.length > 1 ? (
                `Upload ${pendingFiles.length} files`
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

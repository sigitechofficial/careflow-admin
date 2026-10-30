import * as React from 'react'
import { ChevronDown, ChevronRight, FileAudio, FileText, Image, Loader2, Paperclip, Play, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/button'
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
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useDeleteInitialAssessmentAttachment,
  useInitialAssessmentAttachmentFile,
  useInitialAssessmentAttachments,
  useUploadInitialAssessmentAttachment,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import type {
  InitialAssessmentAttachment,
  InitialAssessmentAttachmentCategory,
} from '@/features/service-users/initial-assessment/types'

const CATEGORY_LABELS: Record<InitialAssessmentAttachmentCategory, string> = {
  ASSESSMENT_PICTURE: 'Assessment picture (§1)',
  MCA_DOCUMENT: 'MCA document (§2)',
  DISCHARGE_SUMMARY: 'Discharge summary',
  MEDICATION_LIST: 'Medication list (§7)',
  WOUND_PHOTO: 'Wound photo (§11)',
  EMERGENCY_DOCUMENT: 'Emergency document (§13)',
  OTHER: 'Other',
  CONVERSATION_RECORDING: 'Conversation recording',
  CONVERSATION_TRANSCRIPT: 'Conversation transcript',
}

/** Saved from "Conversation to text", not uploaded here; their files have no public link. */
const CONVERSATION_CATEGORIES: InitialAssessmentAttachmentCategory[] = ['CONVERSATION_RECORDING', 'CONVERSATION_TRANSCRIPT']
const UPLOAD_CATEGORIES = (Object.keys(CATEGORY_LABELS) as InitialAssessmentAttachmentCategory[]).filter(
  (c) => !CONVERSATION_CATEGORIES.includes(c),
)

const CATEGORY_SECTION: Partial<Record<InitialAssessmentAttachmentCategory, number>> = {
  ASSESSMENT_PICTURE: 1,
  MCA_DOCUMENT: 2,
  MEDICATION_LIST: 7,
  WOUND_PHOTO: 11,
  EMERGENCY_DOCUMENT: 13,
}

type Props = {
  serviceUserId: string
  submissionId: string | null
  activeSection?: number
  canUpdate: boolean
  editable: boolean
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * A recording or transcript, read through the permission-checked endpoint: the recording plays
 * here, the transcript opens in a new tab.
 */
function ConversationFile({ serviceUserId, att }: { serviceUserId: string; att: InitialAssessmentAttachment }) {
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
  const file = useInitialAssessmentAttachmentFile(serviceUserId)
  React.useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  const open = async () => {
    try {
      const blob = await file.mutateAsync({ submissionId: att.submissionId, attachmentId: att.id })
      const url = URL.createObjectURL(blob)
      if (att.category === 'CONVERSATION_RECORDING') {
        setAudioUrl(url)
      } else {
        window.open(url, '_blank', 'noopener')
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch (err) {
      toastApiError(err, 'Could not open the file')
    }
  }

  if (audioUrl) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption -- a recorded conversation; its transcript is saved alongside
      <audio controls autoPlay src={audioUrl} className="mt-1 h-9 w-full max-w-md" data-testid="ia-recording-player" />
    )
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline disabled:opacity-60 dark:text-teal-400"
      disabled={file.isPending}
      onClick={() => void open()}
    >
      {file.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : att.category === 'CONVERSATION_RECORDING' ? <Play className="h-3 w-3" aria-hidden /> : null}
      {att.category === 'CONVERSATION_RECORDING' ? 'Play recording' : 'Open transcript'}
    </button>
  )
}

function categoryForSection(section?: number): InitialAssessmentAttachmentCategory {
  if (section === 1) return 'ASSESSMENT_PICTURE'
  if (section === 2) return 'MCA_DOCUMENT'
  if (section === 7) return 'MEDICATION_LIST'
  if (section === 11) return 'WOUND_PHOTO'
  if (section === 13) return 'EMERGENCY_DOCUMENT'
  return 'OTHER'
}

export function InitialAssessmentAttachmentsPanel({
  serviceUserId,
  submissionId,
  activeSection,
  canUpdate,
  editable,
}: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  // Closed by default; open to see the files.
  const [open, setOpen] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [category, setCategory] = React.useState<InitialAssessmentAttachmentCategory>('OTHER')
  const [label, setLabel] = React.useState('')
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)

  const attachmentsQuery = useInitialAssessmentAttachments(serviceUserId, submissionId)
  const uploadMutation = useUploadInitialAssessmentAttachment(serviceUserId, submissionId ?? '')
  const deleteMutation = useDeleteInitialAssessmentAttachment(serviceUserId, submissionId ?? '')

  const attachments = attachmentsQuery.data ?? []
  const canUpload = canUpdate && editable && Boolean(submissionId)

  const resetUploadForm = React.useCallback(() => {
    setLabel('')
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const openUploadModal = () => {
    setCategory(categoryForSection(activeSection))
    resetUploadForm()
    setUploadOpen(true)
  }

  const onUploadOpenChange = (open: boolean) => {
    setUploadOpen(open)
    if (!open) resetUploadForm()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !submissionId || !canUpload) return
    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        category,
        label: label.trim() || undefined,
        sectionNumber: CATEGORY_SECTION[category] ?? activeSection,
      })
      toastSuccess('Uploaded', selectedFile.name)
      setOpen(true)
      setUploadOpen(false)
      resetUploadForm()
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm" data-testid="ia-attachments-panel">
        <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${open ? 'border-b' : ''}`}>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold">Attachments</h3>
              <p className="text-xs text-muted-foreground">
                MCA docs, photos, discharge summaries, recordings — {attachments.length} file
                {attachments.length === 1 ? '' : 's'}
              </p>
            </div>
          </button>
          {canUpload ? (
            <Button type="button" size="sm" variant="outline" onClick={openUploadModal}>
              <Upload className="mr-1 h-4 w-4" />
              Upload
            </Button>
          ) : null}
        </div>

        {!open ? null : attachmentsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading attachments…
          </div>
        ) : attachments.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No files yet.{' '}
            {canUpload ? 'Click Upload to add assessment photos, MCA forms, or discharge documents.' : null}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Added</th>
                  <th className="px-3 py-2">Open</th>
                  {canUpdate && editable ? <th className="w-12 px-3 py-2"><span className="sr-only">Remove</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {attachments.map((att) => {
                  const isConversation = CONVERSATION_CATEGORIES.includes(att.category)
                  const href = isConversation ? null : resolveMediaUrl(att.fileUrl)
                  const isImage = att.mimeType.startsWith('image/')
                  const name = att.label?.trim() || att.originalName
                  return (
                    <tr key={att.id} className="border-b align-top last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 text-muted-foreground">
                            {isImage ? (
                              <Image className="h-4 w-4" />
                            ) : att.category === 'CONVERSATION_RECORDING' ? (
                              <FileAudio className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <span className="font-medium">{name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {CATEGORY_LABELS[att.category]}
                        {att.sectionNumber ? ` · §${att.sectionNumber}` : ''}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatBytes(att.fileSize)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {new Date(att.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-3 py-2">
                        {isConversation ? <ConversationFile serviceUserId={serviceUserId} att={att} /> : null}
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-teal-700 hover:underline dark:text-teal-400"
                          >
                            Open file
                          </a>
                        ) : null}
                      </td>
                      {canUpdate && editable ? (
                        <td className="px-3 py-1.5 text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            aria-label={`Remove ${name}`}
                            disabled={deleteMutation.isPending}
                            onClick={() => void deleteMutation.mutateAsync(att.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={onUploadOpenChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Upload attachment</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add assessment photos, MCA forms, discharge summaries, or other supporting documents.
            </p>
            <div className="space-y-1">
              <Label htmlFor="ia-attachment-category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as InitialAssessmentAttachmentCategory)}
              >
                <SelectTrigger id="ia-attachment-category" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPLOAD_CATEGORIES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ia-attachment-label">Label (optional)</Label>
              <Input
                id="ia-attachment-label"
                className="h-10"
                value={label}
                placeholder="e.g. Front door photo"
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ia-attachment-file">File</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  Choose file
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : 'JPEG, PNG, WebP, or PDF'}
                </span>
              </div>
              <input
                ref={fileRef}
                id="ia-attachment-file"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={onFileChange}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onUploadOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedFile || uploadMutation.isPending}
              onClick={() => void handleUpload()}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Uploading…
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

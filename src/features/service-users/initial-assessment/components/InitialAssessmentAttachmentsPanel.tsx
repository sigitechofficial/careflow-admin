import * as React from 'react'
import { FileText, Image, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Input } from '@/shared/ui/input'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useDeleteInitialAssessmentAttachment,
  useInitialAssessmentAttachments,
  useUploadInitialAssessmentAttachment,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import type { InitialAssessmentAttachmentCategory } from '@/features/service-users/initial-assessment/types'

const CATEGORY_LABELS: Record<InitialAssessmentAttachmentCategory, string> = {
  ASSESSMENT_PICTURE: 'Assessment picture (§1)',
  MCA_DOCUMENT: 'MCA document (§2)',
  DISCHARGE_SUMMARY: 'Discharge summary',
  MEDICATION_LIST: 'Medication list (§7)',
  WOUND_PHOTO: 'Wound photo (§11)',
  EMERGENCY_DOCUMENT: 'Emergency document (§13)',
  OTHER: 'Other',
}

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

export function InitialAssessmentAttachmentsPanel({
  serviceUserId,
  submissionId,
  activeSection,
  canUpdate,
  editable,
}: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [category, setCategory] = React.useState<InitialAssessmentAttachmentCategory>('OTHER')
  const [label, setLabel] = React.useState('')

  const attachmentsQuery = useInitialAssessmentAttachments(serviceUserId, submissionId)
  const uploadMutation = useUploadInitialAssessmentAttachment(serviceUserId, submissionId ?? '')
  const deleteMutation = useDeleteInitialAssessmentAttachment(serviceUserId, submissionId ?? '')

  const attachments = attachmentsQuery.data ?? []

  React.useEffect(() => {
    if (activeSection === 1) setCategory('ASSESSMENT_PICTURE')
    else if (activeSection === 2) setCategory('MCA_DOCUMENT')
    else if (activeSection === 7) setCategory('MEDICATION_LIST')
    else if (activeSection === 11) setCategory('WOUND_PHOTO')
    else if (activeSection === 13) setCategory('EMERGENCY_DOCUMENT')
  }, [activeSection])

  const onPickFile = () => fileRef.current?.click()

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !submissionId || !canUpdate || !editable) return
    try {
      await uploadMutation.mutateAsync({
        file,
        category,
        label: label.trim() || undefined,
        sectionNumber: CATEGORY_SECTION[category] ?? activeSection,
      })
      toastSuccess('Uploaded', file.name)
      setLabel('')
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Attachments</h3>
            <p className="text-xs text-muted-foreground">
              MCA docs, photos, discharge summaries — {attachments.length} file
              {attachments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {canUpdate && editable && submissionId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadMutation.isPending}
            onClick={onPickFile}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            Upload
          </Button>
        ) : null}
      </div>

      {canUpdate && editable && submissionId ? (
        <div className="flex flex-wrap items-end gap-2 border-b bg-muted/30 px-4 py-3">
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as InitialAssessmentAttachmentCategory)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as InitialAssessmentAttachmentCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
            <Input
              className="h-9"
              value={label}
              placeholder="e.g. Front door photo"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => void onFileChange(e)}
          />
        </div>
      ) : null}

      {attachmentsQuery.isLoading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attachments…
        </div>
      ) : attachments.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No files yet. Upload assessment photos, MCA forms, or discharge documents.
        </p>
      ) : (
        <ul className="divide-y">
          {attachments.map((att) => {
            const href = resolveMediaUrl(att.fileUrl)
            const isImage = att.mimeType.startsWith('image/')
            return (
              <li key={att.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span className="mt-0.5 text-muted-foreground">
                  {isImage ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{att.label?.trim() || att.originalName}</div>
                  <div className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[att.category]}
                    {att.sectionNumber ? ` · §${att.sectionNumber}` : ''} · {formatBytes(att.fileSize)}
                  </div>
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
                </div>
                {canUpdate && editable ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => void deleteMutation.mutateAsync(att.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

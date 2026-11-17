import * as React from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { FileUpload } from '@/shared/ui/file-upload'
import { RichTextEditor } from '@/shared/ui/rich-text-editor'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningContentItem,
  useMoveLearningContent,
  useUpdateLearningContentItem,
  useUploadLearningFile,
} from '@/features/learning/hooks/useLearning'
import type {
  LearningCompletionRule,
  LearningContentItem,
  LearningContentItemInput,
  LearningContentType,
  LearningFileInfo,
  LearningSection,
} from '@/features/learning/types/learning.types'
import {
  LEARNING_FILE_MAX_BYTES,
  LESSON_COMPLETION_OPTIONS,
  LESSON_TYPES,
  formatFileSize,
  learningApiUrl,
  lessonTypeInfo,
} from '@/features/learning/lib/learning-lesson'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Section a new lesson goes into. */
  sectionId: string
  /** All sections of the draft, so an existing lesson can be moved. */
  sections: LearningSection[]
  lesson?: LearningContentItem | null
  onSaved?: () => void
}

type Errors = Partial<Record<'title' | 'body' | 'file' | 'url' | 'minutes', string>>

function isUrl(value: string, httpsOnly: boolean): boolean {
  try {
    const p = new URL(value).protocol
    return httpsOnly ? p === 'https:' : p === 'https:' || p === 'http:'
  } catch {
    return false
  }
}

export function LessonDialog({ open, onOpenChange, sectionId, sections, lesson, onSaved }: Props) {
  const createMut = useCreateLearningContentItem()
  const updateMut = useUpdateLearningContentItem()
  const moveMut = useMoveLearningContent()
  const uploadMut = useUploadLearningFile()

  const [type, setType] = React.useState<LearningContentType>('TEXT')
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [file, setFile] = React.useState<LearningFileInfo | null>(null)
  const [isRequired, setIsRequired] = React.useState(true)
  const [minutes, setMinutes] = React.useState('')
  const [completionRule, setCompletionRule] = React.useState<LearningCompletionRule>('ACKNOWLEDGE')
  const [targetSectionId, setTargetSectionId] = React.useState(sectionId)
  const [errors, setErrors] = React.useState<Errors>({})
  const [uploadKey, setUploadKey] = React.useState(0)

  React.useEffect(() => {
    if (!open) return
    setType(lesson?.contentType ?? 'TEXT')
    setTitle(lesson?.title ?? '')
    setBody(lesson?.contentBody ?? '')
    setUrl(lesson?.videoUrl ?? lesson?.externalUrl ?? '')
    setFile(lesson?.file ?? null)
    setIsRequired(lesson?.isRequired ?? true)
    setMinutes(lesson?.estimatedDurationMinutes ? String(lesson.estimatedDurationMinutes) : '')
    setCompletionRule(
      LESSON_COMPLETION_OPTIONS.some(o => o.value === lesson?.completionRule)
        ? (lesson!.completionRule as LearningCompletionRule)
        : 'ACKNOWLEDGE',
    )
    setTargetSectionId(sectionId)
    setErrors({})
    setUploadKey(k => k + 1)
  }, [open, lesson, sectionId])

  const info = lessonTypeInfo(type)
  const fileFits = (f: LearningFileInfo | null) =>
    !!f &&
    (type === 'IMAGE'
      ? f.mimeType.startsWith('image/')
      : type === 'PDF'
        ? f.mimeType === 'application/pdf'
        : f.mimeType === 'application/pdf' || f.mimeType.includes('wordprocessingml'))

  const onTypeChange = (next: LearningContentType) => {
    setType(next)
    setErrors({})
    // Keep a file only when it still fits; downloads are only tracked for files.
    if (lessonTypeInfo(next).kind !== 'file' && completionRule === 'DOWNLOAD') setCompletionRule('ACKNOWLEDGE')
  }

  const onFilesPicked = async (files: File[]) => {
    const picked = files[0]
    if (!picked) return
    try {
      const uploaded = await uploadMut.mutateAsync(picked)
      setFile(uploaded)
      setErrors(prev => ({ ...prev, file: undefined }))
      if (!title.trim()) setTitle(uploaded.originalName.replace(/\.[^.]+$/, ''))
    } catch (err) {
      setErrors(prev => ({ ...prev, file: err instanceof Error ? err.message : 'Upload failed' }))
      setUploadKey(k => k + 1)
    }
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!title.trim()) next.title = 'Enter a lesson title'
    if (info.kind === 'text' && !body.replace(/<[^>]*>/g, '').trim()) next.body = 'Write the lesson text'
    if (info.kind === 'file' && !fileFits(file)) next.file = `Upload a ${info.hint ?? 'file'}`
    if (info.kind === 'link') {
      if (!url.trim()) next.url = type === 'VIDEO' ? 'Paste the video link' : 'Paste the web link'
      else if (!isUrl(url.trim(), type === 'VIDEO')) {
        next.url = type === 'VIDEO' ? 'Use an https:// link' : 'Use a link starting with https:// or http://'
      }
    }
    return next
  }

  const save = async () => {
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    const mins = minutes.trim() ? Number(minutes) : null
    if (mins !== null && (!Number.isInteger(mins) || mins < 1 || mins > 600)) {
      setErrors(prev => ({ ...prev, minutes: 'Enter 1 to 600 minutes, or leave empty' }))
      return
    }
    const input: LearningContentItemInput = {
      contentType: type,
      title: title.trim(),
      isRequired,
      estimatedDurationMinutes: mins,
      completionRule,
      ...(info.kind === 'text' ? { contentBody: body } : {}),
      ...(info.kind === 'file' && file ? { fileId: file.id } : {}),
      ...(type === 'VIDEO' ? { videoUrl: url.trim() } : {}),
      ...(type === 'EXTERNAL_LINK' ? { externalUrl: url.trim() } : {}),
    }
    try {
      if (lesson) {
        await updateMut.mutateAsync({ contentId: lesson.id, body: input })
        if (targetSectionId !== sectionId) {
          await moveMut.mutateAsync({ contentId: lesson.id, sectionId: targetSectionId })
        }
        toastSuccess('Lesson saved')
      } else {
        await createMut.mutateAsync({ sectionId, body: input })
        toastSuccess('Lesson added')
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  const saving = createMut.isPending || updateMut.isPending || moveMut.isPending
  const completionOptions = LESSON_COMPLETION_OPTIONS.filter(o => o.value !== 'DOWNLOAD' || info.kind === 'file')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {lesson ? 'Edit lesson' : 'Add lesson'}
            {sections.find(m => m.id === sectionId) ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {sections.find(m => m.id === sectionId)?.title}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormField label="Lesson type" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Lesson type">
              {LESSON_TYPES.map(t => {
                const Icon = t.icon
                const active = t.value === type
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onTypeChange(t.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm',
                      active ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </FormField>

          <FormField label="Lesson title" required error={errors.title}>
            <Input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
          </FormField>

          {info.kind === 'text' ? (
            <FormField label="Lesson text" required error={errors.body}>
              <RichTextEditor
                key={`${lesson?.id ?? 'new'}-${uploadKey}`}
                value={body}
                onChange={html => setBody(html)}
                placeholder="Write the lesson"
                minHeight={200}
              />
            </FormField>
          ) : null}

          {info.kind === 'file' ? (
            <FormField
              label="File"
              required
              error={errors.file}
              hint={`${info.hint}, up to ${formatFileSize(LEARNING_FILE_MAX_BYTES)}`}
            >
              <div className="space-y-2">
                {file && fileFits(file) ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                    <span className="truncate">
                      {file.originalName}{' '}
                      <span className="text-xs text-muted-foreground">({formatFileSize(file.fileSize)})</span>
                    </span>
                    <a
                      href={learningApiUrl(file.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : null}
                {uploadMut.isPending ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </p>
                ) : (
                  <FileUpload
                    key={`${type}-${uploadKey}`}
                    accept={info.accept}
                    maxSize={LEARNING_FILE_MAX_BYTES}
                    maxFiles={1}
                    onChange={files => void onFilesPicked(files)}
                  />
                )}
              </div>
            </FormField>
          ) : null}

          {info.kind === 'link' ? (
            <FormField label={type === 'VIDEO' ? 'Video link' : 'Web link'} required error={errors.url} hint={info.hint}>
              <Input
                type="url"
                value={url}
                placeholder="https://"
                onChange={e => {
                  setUrl(e.target.value)
                  if (errors.url) setErrors(prev => ({ ...prev, url: undefined }))
                }}
              />
            </FormField>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Time (minutes)" hint="Rough time for the carer. Optional" error={errors.minutes}>
              <Input
                type="number"
                min={1}
                max={600}
                value={minutes}
                onChange={e => {
                  setMinutes(e.target.value)
                  if (errors.minutes) setErrors(prev => ({ ...prev, minutes: undefined }))
                }}
              />
            </FormField>
            <FormField label="How the carer completes it">
              <Combobox
                value={completionRule}
                onChange={v => setCompletionRule(v as LearningCompletionRule)}
                options={completionOptions}
                allowDeselect={false}
              />
            </FormField>
            {lesson && sections.length > 1 ? (
              <FormField label="Module">
                <Combobox
                  value={targetSectionId}
                  onChange={v => setTargetSectionId(v)}
                  options={sections.map(s => ({ value: s.id, label: s.title }))}
                  allowDeselect={false}
                />
              </FormField>
            ) : null}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox checked={isRequired} onCheckedChange={v => setIsRequired(!!v)} />
            Required to finish the course
          </label>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || uploadMut.isPending}>
            {lesson ? 'Save lesson' : 'Add lesson'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

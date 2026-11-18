import { File, FileText, Image, Link2, Type, Video, type LucideIcon } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import type { LearningCompletionRule, LearningContentType } from '@/features/learning/types/learning.types'

/** Lesson types an admin can add (others stay readable for old data). */
export const LESSON_TYPES: Array<{
  value: LearningContentType
  label: string
  icon: LucideIcon
  kind: 'text' | 'file' | 'link'
  accept?: string
  hint?: string
}> = [
  { value: 'TEXT', label: 'Text', icon: Type, kind: 'text' },
  { value: 'IMAGE', label: 'Image', icon: Image, kind: 'file', accept: '.jpg,.jpeg,.png', hint: 'JPG or PNG' },
  { value: 'PDF', label: 'PDF', icon: FileText, kind: 'file', accept: '.pdf', hint: 'PDF' },
  {
    value: 'DOCUMENT',
    label: 'Word document',
    icon: File,
    kind: 'file',
    accept: '.docx',
    hint: 'Word .docx',
  },
  { value: 'VIDEO', label: 'Video link', icon: Video, kind: 'link', hint: 'https link, e.g. YouTube (unlisted), Vimeo or SharePoint' },
  { value: 'EXTERNAL_LINK', label: 'Web link', icon: Link2, kind: 'link', hint: 'A page on another website' },
]

export function lessonTypeInfo(type: LearningContentType) {
  return LESSON_TYPES.find(t => t.value === type) ?? { value: type, label: type, icon: File, kind: 'text' as const }
}

/** How the carer completes a lesson. "Mark as complete" is the agreed default. */
export const LESSON_COMPLETION_OPTIONS: Array<{ value: LearningCompletionRule; label: string }> = [
  { value: 'ACKNOWLEDGE', label: 'Carer marks it as complete' },
  { value: 'VIEW', label: 'Opened by the carer' },
  { value: 'DOWNLOAD', label: 'Downloaded by the carer' },
]

export function completionLabel(rule?: LearningCompletionRule | null): string {
  return LESSON_COMPLETION_OPTIONS.find(o => o.value === rule)?.label ?? 'Opened by the carer'
}

/** Signed file links come back relative to the API. */
export function learningApiUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const LEARNING_FILE_MAX_BYTES = 10 * 1024 * 1024

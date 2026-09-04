export const POLICY_UPLOAD_MAX_BYTES = 25 * 1024 * 1024
export const POLICY_UPLOAD_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export type PolicyUploadErrorCode =
  | 'unsupported'
  | 'too_large'
  | 'empty'
  | 'malformed'
  | 'network'
  | 'permission'
  | 'failed'

export const POLICY_UPLOAD_ERROR_COPY: Record<PolicyUploadErrorCode, string> = {
  unsupported: 'Unsupported file type. Upload a PDF, DOC, or DOCX file.',
  too_large: 'File too large. Maximum size is 25 MB.',
  empty: 'This file is empty.',
  malformed: 'This file could not be read. Try another document.',
  network: 'Network error. Check your connection and try again.',
  permission: 'Permission denied. You cannot upload to this policy.',
  failed: 'Upload failed. Try again.',
}

export function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : ''
}

export function validatePolicyUploadFile(file: File | null | undefined): PolicyUploadErrorCode | null {
  if (!file) return 'malformed'
  if (file.size <= 0) return 'empty'
  if (file.size > POLICY_UPLOAD_MAX_BYTES) return 'too_large'
  const ext = extensionOf(file.name)
  const expected = MIME_BY_EXT[ext]
  if (!expected) return 'unsupported'
  const mime = (file.type || '').toLowerCase().split(';')[0]?.trim() ?? ''
  if (mime && mime !== expected) return 'unsupported'
  return null
}

export function policyUploadErrorFromHttp(status: number, message?: string): PolicyUploadErrorCode {
  if (status === 403 || status === 401) return 'permission'
  if (status === 0) return 'network'
  const text = (message ?? '').toLowerCase()
  if (text.includes('too large')) return 'too_large'
  if (text.includes('unsupported')) return 'unsupported'
  if (text.includes('empty')) return 'empty'
  if (text.includes('malformed')) return 'malformed'
  return 'failed'
}

export function formatPolicyFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function policyFileTypeLabel(mimeType?: string | null, fileName?: string | null): string {
  const name = fileName?.toLowerCase() ?? ''
  const mime = mimeType?.toLowerCase() ?? ''
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'PDF'
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return 'DOCX'
  if (mime.includes('msword') || name.endsWith('.doc')) return 'DOC'
  return 'Document'
}

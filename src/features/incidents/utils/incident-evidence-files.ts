/**
 * Rules for photos / documents attached while raising an incident.
 * Must match careflow-api incident-attachment.config.ts (ALLOWED_MIME) and the API's
 * UPLOAD_MAX_FILE_SIZE_BYTES (10 MB in .env), or the upload fails after the incident is created.
 */
export const INCIDENT_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const

/** For the file input `accept` attribute. */
export const INCIDENT_EVIDENCE_ACCEPT = INCIDENT_EVIDENCE_MIME_TYPES.join(',')

export const INCIDENT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
export const INCIDENT_EVIDENCE_MAX_FILES = 10

/** Browsers can only preview these; HEIC and PDF get a file tile instead. */
const PREVIEWABLE = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function canPreviewEvidence(file: Pick<File, 'type'>): boolean {
  return PREVIEWABLE.has(file.type)
}

/** Photos are filed as INCIDENT_PHOTO; documents (PDF) as OTHER. */
export function evidenceCategory(file: Pick<File, 'type'>): 'INCIDENT_PHOTO' | 'OTHER' {
  return file.type.startsWith('image/') ? 'INCIDENT_PHOTO' : 'OTHER'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type FileLike = Pick<File, 'name' | 'size' | 'type' | 'lastModified'>

function fileKey(file: FileLike): string {
  return `${file.name}|${file.size}|${file.lastModified}`
}

/**
 * Splits newly picked files into ones to add and human-readable reasons for the rest
 * (wrong type, too large, already added, over the file limit).
 */
export function screenEvidenceFiles<T extends FileLike>(
  picked: T[],
  existing: FileLike[],
): { accepted: T[]; errors: string[] } {
  const seen = new Set(existing.map(fileKey))
  const accepted: T[] = []
  const errors: string[] = []
  let room = INCIDENT_EVIDENCE_MAX_FILES - existing.length
  for (const file of picked) {
    if (!(INCIDENT_EVIDENCE_MIME_TYPES as readonly string[]).includes(file.type)) {
      errors.push(`${file.name} isn't a supported type. Use JPEG, PNG, WebP, HEIC or PDF.`)
    } else if (file.size > INCIDENT_EVIDENCE_MAX_BYTES) {
      errors.push(`${file.name} is too large (${formatFileSize(file.size)}). Maximum 10 MB per file.`)
    } else if (seen.has(fileKey(file))) {
      errors.push(`${file.name} is already added.`)
    } else if (room <= 0) {
      errors.push(`${file.name} wasn't added — up to ${INCIDENT_EVIDENCE_MAX_FILES} files per report.`)
    } else {
      seen.add(fileKey(file))
      accepted.push(file)
      room -= 1
    }
  }
  return { accepted, errors }
}

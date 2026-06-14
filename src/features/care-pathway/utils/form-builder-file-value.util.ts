export type StoredFormFileValue = {
  fileName: string
  mimeType: string
  dataUrl: string
}

export function parseStoredFileValue(raw: string | boolean | undefined): StoredFormFileValue | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  if (raw.startsWith('data:')) {
    return {
      fileName: 'upload',
      mimeType: raw.slice(5, raw.indexOf(';')) || 'application/octet-stream',
      dataUrl: raw,
    }
  }
  try {
    const parsed = JSON.parse(raw) as StoredFormFileValue
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.fileName === 'string' &&
      typeof parsed.mimeType === 'string' &&
      typeof parsed.dataUrl === 'string'
    ) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

export function serializeStoredFileValue(value: StoredFormFileValue): string {
  return JSON.stringify(value)
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read file'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export async function fileToStoredValue(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  return serializeStoredFileValue({
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    dataUrl,
  })
}

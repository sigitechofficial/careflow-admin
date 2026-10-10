import { describe, expect, it } from 'vitest'
import {
  INCIDENT_EVIDENCE_MAX_FILES,
  canPreviewEvidence,
  evidenceCategory,
  screenEvidenceFiles,
} from './incident-evidence-files'

const MB = 1024 * 1024
const f = (name: string, type: string, size = 1000, lastModified = 1) => ({ name, type, size, lastModified })

describe('incident evidence files', () => {
  it('accepts the types the API allows and rejects others', () => {
    const { accepted, errors } = screenEvidenceFiles(
      [f('a.jpg', 'image/jpeg'), f('b.pdf', 'application/pdf'), f('c.gif', 'image/gif'), f('d.heic', 'image/heic')],
      [],
    )
    expect(accepted.map((x) => x.name)).toEqual(['a.jpg', 'b.pdf', 'd.heic'])
    expect(errors).toEqual(["c.gif isn't a supported type. Use JPEG, PNG, WebP, HEIC or PDF."])
  })

  it('rejects files over 10 MB with the size in the message', () => {
    const { accepted, errors } = screenEvidenceFiles([f('big.jpg', 'image/jpeg', 21 * MB)], [])
    expect(accepted).toEqual([])
    expect(errors).toEqual(['big.jpg is too large (21.0 MB). Maximum 10 MB per file.'])
  })

  it('skips duplicates, including within one pick', () => {
    const existing = [f('a.jpg', 'image/jpeg')]
    const { accepted, errors } = screenEvidenceFiles([f('a.jpg', 'image/jpeg'), f('b.jpg', 'image/jpeg'), f('b.jpg', 'image/jpeg')], existing)
    expect(accepted.map((x) => x.name)).toEqual(['b.jpg'])
    expect(errors).toEqual(['a.jpg is already added.', 'b.jpg is already added.'])
  })

  it('caps the number of files', () => {
    const existing = Array.from({ length: INCIDENT_EVIDENCE_MAX_FILES - 1 }, (_, i) => f(`e${i}.jpg`, 'image/jpeg'))
    const { accepted, errors } = screenEvidenceFiles([f('x.jpg', 'image/jpeg'), f('y.jpg', 'image/jpeg')], existing)
    expect(accepted.map((x) => x.name)).toEqual(['x.jpg'])
    expect(errors).toHaveLength(1)
  })

  it('previews only browser-renderable images and files PDFs as OTHER', () => {
    expect(canPreviewEvidence({ type: 'image/png' })).toBe(true)
    expect(canPreviewEvidence({ type: 'image/heic' })).toBe(false)
    expect(evidenceCategory({ type: 'image/heic' })).toBe('INCIDENT_PHOTO')
    expect(evidenceCategory({ type: 'application/pdf' })).toBe('OTHER')
  })
})

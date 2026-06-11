import { describe, expect, it } from 'vitest'
import {
  formatBodyMapRecordForSkinIntegrity,
  resolveSkinIntegrityRowId,
  syncSkinIntegrityCheckFromBodyMap,
} from '@/features/service-users/initial-assessment/utils/sync-skin-integrity-from-body-map'
import { defaultSkinIntegrityCheckMetadata } from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'

function record(partial: Partial<BodyMapRecordRow> & { bodyPart: string; side?: 'LEFT' | 'RIGHT' | 'CENTRE' }): BodyMapRecordRow {
  return {
    id: partial.id ?? 'r1',
    serviceUserId: 'su1',
    recordType: partial.recordType ?? 'WOUND',
    subType: partial.subType ?? 'Skin tear',
    title: null,
    description: partial.description ?? 'Red area noted',
    riskLevel: 'MEDIUM',
    status: 'ACTIVE',
    firstNoticedAt: null,
    causeSummary: null,
    actionSummary: null,
    observationDetails: null,
    reviewRequired: false,
    nextReviewAt: null,
    safeguardingTriggered: false,
    managerReviewRequired: false,
    closedAt: null,
    closureNote: null,
    createdByName: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    markers: [
      {
        id: 'm1',
        bodyMapRecordId: partial.id ?? 'r1',
        bodyView: 'FRONT',
        side: partial.side ?? 'RIGHT',
        bodyPart: partial.bodyPart,
        specificLocation: partial.bodyPart,
        xCoordinate: 10,
        yCoordinate: 20,
        markerNumber: 1,
        markerType: partial.recordType ?? 'WOUND',
        riskLevel: 'MEDIUM',
        status: 'ACTIVE',
        isVisible: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    reviews: [],
  }
}

describe('syncSkinIntegrityCheckFromBodyMap', () => {
  it('maps body map records to the matching skin integrity row and side', () => {
    const result = syncSkinIntegrityCheckFromBodyMap(defaultSkinIntegrityCheckMetadata(), [
      record({ bodyPart: 'Heel', side: 'LEFT' }),
    ])

    const heels = result.metadata.rows.find((row) => row.id === 'heels')
    expect(heels?.left).toContain('WOUND')
    expect(heels?.right).toBe('')
    expect(result.syncedRecordCount).toBe(1)
  })

  it('appends without duplicating the same record line', () => {
    const base = syncSkinIntegrityCheckFromBodyMap(defaultSkinIntegrityCheckMetadata(), [
      record({ id: 'r1', bodyPart: 'Shoulder', side: 'RIGHT' }),
    ])
    const again = syncSkinIntegrityCheckFromBodyMap(base.metadata, [
      record({ id: 'r1', bodyPart: 'Shoulder', side: 'RIGHT' }),
    ])

    const shoulders = again.metadata.rows.find((row) => row.id === 'shoulders')
    expect(shoulders?.right.split('\n')).toHaveLength(1)
  })

  it('skips medication-only records', () => {
    const result = syncSkinIntegrityCheckFromBodyMap(defaultSkinIntegrityCheckMetadata(), [
      record({ bodyPart: 'Thigh', recordType: 'MEDICATION' }),
    ])
    expect(result.syncedRecordCount).toBe(0)
  })
})

describe('resolveSkinIntegrityRowId', () => {
  it('resolves common anatomy labels', () => {
    expect(resolveSkinIntegrityRowId('Left ear')).toBe('ears')
    expect(resolveSkinIntegrityRowId('Sacrum')).toBe('sacrum')
    expect(resolveSkinIntegrityRowId('Inner side of the knee')).toBe('knees')
  })
})

describe('formatBodyMapRecordForSkinIntegrity', () => {
  it('includes type, location, and description', () => {
    const line = formatBodyMapRecordForSkinIntegrity(
      record({ bodyPart: 'Elbow', description: 'Moisture lesion' }),
    )
    expect(line).toContain('WOUND')
    expect(line).toContain('Elbow')
    expect(line).toContain('Moisture lesion')
  })
})

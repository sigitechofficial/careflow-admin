import { describe, expect, it } from 'vitest'
import type { ComplianceChecklistItem } from '@/features/employees/api/employee-compliance-api'
import {
  filterComplianceChecklistItems,
  formatComplianceUploaderLabel,
  matchesComplianceStatusFilter,
  sortDocsNewestFirst,
} from '@/features/employees/compliance/compliance-document-filters'

function item(partial: Partial<ComplianceChecklistItem> & { complianceTypeId: string; name: string }): ComplianceChecklistItem {
  return {
    code: partial.code ?? null,
    isMandatory: partial.isMandatory ?? true,
    requirementId: partial.requirementId ?? null,
    record: partial.record ?? null,
    ...partial,
  }
}

describe('compliance-document-filters', () => {
  const now = new Date('2026-09-09T12:00:00.000Z')

  it('sorts documents newest first', () => {
    const docs = sortDocsNewestFirst([
      {
        id: 'a',
        employeeComplianceId: 'c',
        fileName: 'a.pdf',
        originalName: 'a.pdf',
        fileUrl: '/a',
        mimeType: 'application/pdf',
        fileSize: 1,
        uploadedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b',
        employeeComplianceId: 'c',
        fileName: 'b.pdf',
        originalName: 'b.pdf',
        fileUrl: '/b',
        mimeType: 'application/pdf',
        fileSize: 1,
        uploadedAt: '2026-09-01T00:00:00.000Z',
      },
    ])
    expect(docs.map(d => d.id)).toEqual(['b', 'a'])
  })

  it('matches missing/pending including rows without a record', () => {
    expect(
      matchesComplianceStatusFilter(
        item({ complianceTypeId: '1', name: 'DBS', record: null }),
        'missing_pending',
        now,
      ),
    ).toBe(true)
    expect(
      matchesComplianceStatusFilter(
        item({
          complianceTypeId: '2',
          name: 'DBS',
          record: {
            id: 'r',
            employeeId: 'e',
            complianceTypeId: '2',
            requirementId: null,
            status: 'PENDING_REVIEW',
            issueDate: null,
            expiryDate: null,
            notes: null,
            isNoLongerRequired: false,
            noLongerRequiredReason: null,
            complianceType: null,
            documents: [],
          },
        }),
        'missing_pending',
        now,
      ),
    ).toBe(true)
  })

  it('matches recently updated from latest upload', () => {
    const recent = item({
      complianceTypeId: '3',
      name: 'App form',
      record: {
        id: 'r',
        employeeId: 'e',
        complianceTypeId: '3',
        requirementId: null,
        status: 'VALID',
        issueDate: null,
        expiryDate: null,
        notes: null,
        isNoLongerRequired: false,
        noLongerRequiredReason: null,
        complianceType: null,
        documents: [
          {
            id: 'd1',
            employeeComplianceId: 'r',
            fileName: 'x.pdf',
            originalName: 'x.pdf',
            fileUrl: '/x',
            mimeType: 'application/pdf',
            fileSize: 1,
            uploadedAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      },
    })
    expect(matchesComplianceStatusFilter(recent, 'recently_updated', now)).toBe(true)
  })

  it('filters previous-document rows only when multiple files exist', () => {
    const withHistory = item({
      complianceTypeId: '4',
      name: 'App',
      record: {
        id: 'r',
        employeeId: 'e',
        complianceTypeId: '4',
        requirementId: null,
        status: 'VALID',
        issueDate: null,
        expiryDate: null,
        notes: null,
        isNoLongerRequired: false,
        noLongerRequiredReason: null,
        complianceType: null,
        documents: [
          {
            id: 'd1',
            employeeComplianceId: 'r',
            fileName: 'new.pdf',
            originalName: 'new.pdf',
            fileUrl: '/n',
            mimeType: 'application/pdf',
            fileSize: 1,
            uploadedAt: '2026-09-01T00:00:00.000Z',
          },
          {
            id: 'd0',
            employeeComplianceId: 'r',
            fileName: 'old.pdf',
            originalName: 'old.pdf',
            fileUrl: '/o',
            mimeType: 'application/pdf',
            fileSize: 1,
            uploadedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })
    const filtered = filterComplianceChecklistItems([withHistory], {
      statusFilter: 'all',
      versionFilter: 'previous',
      hideNoLongerRequired: true,
      now,
    })
    expect(filtered).toHaveLength(1)
  })

  it('formats uploader label from name or email', () => {
    expect(
      formatComplianceUploaderLabel({
        id: 'u1',
        email: 'a@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).toBe('Ada Lovelace')
    expect(
      formatComplianceUploaderLabel({
        id: 'u2',
        email: 'solo@example.com',
        firstName: null,
        lastName: null,
      }),
    ).toBe('solo@example.com')
    expect(formatComplianceUploaderLabel(null)).toBe('Unknown uploader')
  })
})

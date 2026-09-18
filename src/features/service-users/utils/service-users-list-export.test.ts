import { describe, expect, it, vi } from 'vitest'
import type { ServiceUserListRow } from '@/features/service-users/types'
import { exportServiceUsersListCsv } from '@/features/service-users/utils/service-users-list-export'

function row(partial: Partial<ServiceUserListRow> & Pick<ServiceUserListRow, 'id'>): ServiceUserListRow {
  return {
    serviceUserNumber: 'SU-1',
    firstName: 'Jane',
    lastName: 'Doe',
    preferredName: null,
    dateOfBirth: '1950-01-01',
    isActive: true,
    serviceStartDate: '2026-01-01',
    profilePhotoUrl: null,
    title: null,
    gender: null,
    status: { id: 's1', name: 'Active', code: 'ACTIVE' },
    careType: { id: 'c1', name: 'Domiciliary', code: 'DOM' },
    fundingType: null,
    riskLevel: { id: 'r1', name: 'High', code: 'HIGH', color: null },
    location: { id: 'l1', name: 'Croydon' },
    keyWorker: { id: 'e1', firstName: 'Ann', lastName: 'Smith' },
    namedNurse: null,
    createdAt: '2026-01-02T10:00:00.000Z',
    createdByName: 'Admin',
    hasActiveFlashMessage: false,
    hasActiveAbsence: false,
    carePlanListStatus: 'ok',
    ...partial,
  }
}

describe('exportServiceUsersListCsv', () => {
  it('downloads a CSV blob with header and row data', () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { click, download: '', href: '' } as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tag)
    })

    exportServiceUsersListCsv([row({ id: 'u1', preferredName: 'Jay' })], 'service-users-test')

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0]![0] as Blob
    expect(blob.type).toContain('text/csv')
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})

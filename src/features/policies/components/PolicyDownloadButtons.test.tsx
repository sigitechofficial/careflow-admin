import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('@/shared/lib/toast', () => ({ toastError }))
vi.mock('@/shared/api/api-client', () => ({
  getApiBaseUrl: () => 'http://api.test',
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))
vi.mock('@/features/auth/store', () => ({ useAuthStore: { getState: () => ({ accessToken: 'tok' }) } }))

import { PolicyDownloadButtons, policyExportPath } from './PolicyDownloadButtons'

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  toastError.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('Download PDF / Word', () => {
  it('asks for the version shown, or the ready-made policy', () => {
    expect(policyExportPath({ kind: 'policy', policyId: 'p1', versionId: 'v2' }, 'pdf')).toBe('/policies/p1/export?format=pdf&versionId=v2')
    expect(policyExportPath({ kind: 'policy', policyId: 'p1' }, 'docx')).toBe('/policies/p1/export?format=docx')
    expect(policyExportPath({ kind: 'library', libraryId: 'lib1' }, 'docx')).toBe('/policy-library/lib1/export?format=docx')
  })

  it('downloads the file under the name the API gives, signed in', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Blob(['%PDF']), {
        status: 200,
        headers: { 'Content-Disposition': `attachment; filename="POL.pdf"; filename*=UTF-8''POL-MED-001%20Medicines%20v1.0.pdf` },
      }),
    )
    const clicked: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download)
    })
    render(<PolicyDownloadButtons target={{ kind: 'policy', policyId: 'p1', versionId: 'v1' }} className="btn" />)
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(clicked).toEqual(['POL-MED-001 Medicines v1.0.pdf']))
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/policies/p1/export?format=pdf&versionId=v1', { headers: { Authorization: 'Bearer tok' } })
    click.mockRestore()
  })

  it('says why when it cannot be made', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'This policy is an uploaded document' }), { status: 400 }))
    render(<PolicyDownloadButtons target={{ kind: 'library', libraryId: 'lib1' }} className="btn" />)
    await userEvent.click(screen.getByRole('button', { name: 'Download Word' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Download failed', 'This policy is an uploaded document'))
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
const apiBlob = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  apiBlob: (...a: unknown[]) => apiBlob(...a),
  ApiError: class ApiError extends Error {},
}))
const toastSuccess = vi.fn()
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: (...a: unknown[]) => toastSuccess(...a), toastApiError: vi.fn() }))
const can = vi.fn((_p: string) => true)
let assignedLocationIds: string[] | null = null
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ can, user: { assignedLocationIds, assignedLocations: [{ id: 'loc-a', name: 'Greenwich' }] } }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({ data: undefined }),
}))
vi.mock('@/features/locations/utils/flatten-location-options.util', () => ({
  flattenLocationOptionsFromTree: () => [
    { id: 'loc-a', label: 'Greenwich' },
    { id: 'loc-b', label: 'Lewisham' },
  ],
}))

import { EvidencePackDialog } from './components/EvidencePackDialog'
import { evidencePackFileName } from './hooks'

const framework = {
  keyQuestions: [
    { code: 'SAFE', title: 'Safe', statements: [{ id: 'st-meds', code: 'SAFE_MEDICINES', title: 'Medicines optimisation' }] },
    { code: 'WELL_LED', title: 'Well-led', statements: [{ id: 'st-gov', code: 'WELL_LED_GOVERNANCE', title: 'Governance' }] },
  ],
}

const wrap = (start?: Parameters<typeof EvidencePackDialog>[0]['start']) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EvidencePackDialog open onOpenChange={vi.fn()} start={start} />
    </QueryClientProvider>,
  )

const lastUrl = () => apiBlob.mock.calls[apiBlob.mock.calls.length - 1]![0] as string
const params = () => Object.fromEntries(new URL(lastUrl(), 'http://x').searchParams)

beforeEach(() => {
  apiJson.mockReset()
  apiBlob.mockReset()
  toastSuccess.mockReset()
  can.mockImplementation(() => true)
  assignedLocationIds = null
  apiJson.mockResolvedValue({ data: framework })
  apiBlob.mockResolvedValue(new Blob(['%PDF']))
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

describe('evidence pack dialog', () => {
  it('downloads a PDF of every statement for every branch by default', async () => {
    wrap()
    fireEvent.click(screen.getByTestId('evidence-pack-download'))
    await waitFor(() => expect(apiBlob).toHaveBeenCalled())
    expect(lastUrl().startsWith('/cqc-evidence-pack?')).toBe(true)
    expect(params()).toEqual({ format: 'pdf', includePolicies: 'true' })
    expect(toastSuccess).toHaveBeenCalledWith('Evidence pack downloaded', undefined)
  })

  it('offers key questions and statements, and a ZIP with files and policies left out on request', async () => {
    wrap()
    await screen.findByRole('option', { name: 'Safe: every statement' })
    fireEvent.change(screen.getByTestId('evidence-pack-scope'), { target: { value: 'kq:SAFE' } })
    fireEvent.change(screen.getByTestId('evidence-pack-location'), { target: { value: 'loc-b' } })
    fireEvent.click(screen.getByTestId('evidence-pack-format-zip'))
    expect(screen.getByTestId('evidence-pack-warning')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('evidence-pack-files'))
    expect(screen.queryByTestId('evidence-pack-warning')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('evidence-pack-policies'))
    fireEvent.click(screen.getByTestId('evidence-pack-download'))
    await waitFor(() => expect(apiBlob).toHaveBeenCalled())
    expect(params()).toEqual({
      format: 'zip',
      keyQuestionCode: 'SAFE',
      locationId: 'loc-b',
      includeFiles: 'false',
      includePolicies: 'false',
    })
  })

  it('starts on a statement and branch when opened from an inspection', async () => {
    wrap({ statement: { id: 'st-gov', code: 'WELL_LED_GOVERNANCE', title: 'Governance' }, locationId: 'loc-a' })
    expect(screen.getByTestId('evidence-pack-scope')).toHaveValue('st:st-gov')
    expect(screen.getByTestId('evidence-pack-location')).toHaveValue('loc-a')
    fireEvent.click(screen.getByTestId('evidence-pack-download'))
    await waitFor(() => expect(apiBlob).toHaveBeenCalled())
    expect(params()).toEqual(expect.objectContaining({ statementId: 'st-gov', locationId: 'loc-a' }))
  })

  it('leaves out the policies option without policies.read, and says "All my branches" to branch users', async () => {
    can.mockImplementation((p: string) => p !== 'policies.read')
    assignedLocationIds = ['loc-a']
    wrap()
    expect(screen.queryByTestId('evidence-pack-policies')).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All my branches' })).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('evidence-pack-download'))
    await waitFor(() => expect(apiBlob).toHaveBeenCalled())
    expect(params().includePolicies).toBe('false')
  })

  it('names the file like the API does', () => {
    const day = new Date('2026-11-20T10:00:00Z')
    const base = { includeFiles: true, includePolicies: true }
    expect(evidencePackFileName({ format: 'pdf', ...base }, undefined, day)).toBe('cqc-evidence-pack-all-statements-2026-11-20.pdf')
    expect(evidencePackFileName({ format: 'zip', keyQuestionCode: 'WELL_LED', ...base }, undefined, day)).toBe(
      'cqc-evidence-pack-well-led-2026-11-20.zip',
    )
    expect(evidencePackFileName({ format: 'pdf', statementId: 'x', ...base }, 'SAFE_MEDICINES', day)).toBe(
      'cqc-evidence-pack-safe-medicines-2026-11-20.pdf',
    )
  })
})

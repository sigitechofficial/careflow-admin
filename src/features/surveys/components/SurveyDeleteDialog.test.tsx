import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/shared/api/api-client'

const { state, deleteSurvey, deleteAnyway, toast } = vi.hoisted(() => ({
  state: { user: null as null | { backendRoles?: string[]; assignedLocationIds?: string[] | null } },
  deleteSurvey: vi.fn(),
  deleteAnyway: vi.fn(),
  toast: { toastSuccess: vi.fn(), toastApiError: vi.fn() },
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { user: typeof state.user }) => unknown) => pick({ user: state.user }),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useDeleteSurvey: () => ({ mutateAsync: deleteSurvey, isPending: false }),
  useDeleteSurveyWithoutEvidence: () => ({ mutateAsync: deleteAnyway, isPending: false }),
}))
vi.mock('@/shared/lib/toast', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/lib/toast')>()),
  toastSuccess: toast.toastSuccess,
  toastApiError: toast.toastApiError,
}))

import { SurveyDeleteDialog } from '@/features/surveys/components/SurveyDeleteDialog'

const REASON = 'This survey could not be deleted yet: its CQC evidence (totals only) could not be kept first. No active CQC framework'
const captureFailed = () =>
  new ApiError(REASON, 400, { success: false, message: REASON, code: 'SURVEY_EVIDENCE_CAPTURE_FAILED' })
const target = { id: 's1', title: 'ZZ Fix9 winter survey', isTemplate: false }

function open(onClose = vi.fn()) {
  render(<SurveyDeleteDialog target={target} onClose={onClose} />)
  return { dialog: within(screen.getByRole('alertdialog')), onClose }
}

describe('SurveyDeleteDialog', () => {
  beforeEach(() => {
    state.user = null
    deleteSurvey.mockReset().mockResolvedValue(undefined)
    deleteAnyway.mockReset().mockResolvedValue(undefined)
    toast.toastSuccess.mockReset()
    toast.toastApiError.mockReset()
  })

  it('deletes as usual, offering nothing more', async () => {
    const { dialog, onClose } = open()
    expect(dialog.queryByRole('button', { name: /without CQC evidence/ })).not.toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))
    expect(deleteSurvey).toHaveBeenCalledWith('s1')
    expect(onClose).toHaveBeenCalled()
  })

  it('when the evidence cannot be taken, shows the real reason (not "try again in a few minutes")', async () => {
    state.user = { backendRoles: ['Manager'], assignedLocationIds: ['loc-1'] }
    deleteSurvey.mockRejectedValue(captureFailed())
    const { dialog, onClose } = open()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent('No active CQC framework')
    expect(toast.toastApiError).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    // Not an admin: no delete anyway, only what to do.
    expect(dialog.queryByRole('button', { name: /without CQC evidence/ })).not.toBeInTheDocument()
    expect(dialog.getByText(/ask an Admin with access to every branch/)).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('a branch-limited admin is not offered delete anyway either', async () => {
    state.user = { backendRoles: ['Admin'], assignedLocationIds: ['loc-1'] }
    deleteSurvey.mockRejectedValue(captureFailed())
    const { dialog } = open()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))
    await dialog.findByRole('alert')
    expect(dialog.queryByRole('button', { name: /without CQC evidence/ })).not.toBeInTheDocument()
  })

  it('a company-wide admin can delete anyway after the failure, with a 5–300 character reason', async () => {
    state.user = { backendRoles: ['Admin'], assignedLocationIds: null }
    deleteSurvey.mockRejectedValue(captureFailed())
    const { dialog, onClose } = open()
    // Not before a failure.
    expect(dialog.queryByRole('button', { name: /without CQC evidence/ })).not.toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))
    const anyway = await dialog.findByRole('button', { name: 'Delete without CQC evidence' })
    expect(anyway).toBeDisabled()
    const reason = dialog.getByRole('textbox', { name: /Why delete it without CQC evidence/ })
    await userEvent.type(reason, 'abc ')
    expect(anyway).toBeDisabled()
    await userEvent.type(reason, 'set up by mistake')
    expect(anyway).toBeEnabled()
    await userEvent.click(anyway)
    expect(deleteAnyway).toHaveBeenCalledWith({ id: 's1', reason: 'abc set up by mistake' })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(toast.toastSuccess).toHaveBeenCalledWith('Survey deleted without CQC evidence')
  })

  it('any other error is shown as before (a toast), with no delete anyway', async () => {
    state.user = { backendRoles: ['Super Admin'], assignedLocationIds: null }
    deleteSurvey.mockRejectedValue(new ApiError('Survey not found', 404, { success: false, message: 'Survey not found' }))
    const { dialog } = open()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(toast.toastApiError).toHaveBeenCalled())
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: /without CQC evidence/ })).not.toBeInTheDocument()
  })
})

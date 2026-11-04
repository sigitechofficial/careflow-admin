import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InitialAssessmentAttachment } from '@/features/service-users/initial-assessment/types'

const { fileMutate } = vi.hoisted(() => ({ fileMutate: vi.fn() }))
const row = (over: Partial<InitialAssessmentAttachment>): InitialAssessmentAttachment => ({
  id: 'a1',
  submissionId: 's1',
  serviceUserId: 'su1',
  category: 'CONVERSATION_RECORDING',
  label: 'Assessment conversation recording',
  sectionNumber: null,
  fileName: 'recording-1.webm',
  originalName: 'visit.webm',
  fileUrl: '/service-users/su1/initial-assessments/s1/attachments/a1/file',
  mimeType: 'audio/webm',
  fileSize: 2048,
  uploadedById: 'u1',
  createdAt: '2026-10-30T10:00:00Z',
  updatedAt: '2026-10-30T10:00:00Z',
  ...over,
})

vi.mock('@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise', () => ({
  useInitialAssessmentAttachments: () => ({
    isLoading: false,
    data: [
      row({}),
      row({ id: 'a2', category: 'CONVERSATION_TRANSCRIPT', label: 'Transcript of the assessment conversation', mimeType: 'text/plain' }),
      row({ id: 'a3', category: 'MCA_DOCUMENT', label: 'MCA form', mimeType: 'application/pdf', fileUrl: '/uploads/x/mca.pdf' }),
    ],
  }),
  useUploadInitialAssessmentAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteInitialAssessmentAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useInitialAssessmentAttachmentFile: () => ({ mutateAsync: fileMutate, isPending: false }),
}))

vi.mock('@/features/service-users/initial-assessment/components/InitialAssessmentAiFillReview', () => ({
  InitialAssessmentAiFillReview: ({ transcript, target }: { transcript: string; target: { tabTitle: string } }) => (
    <div data-testid="ia-ai-fill-stub">
      {target.tabTitle}: {transcript}
    </div>
  ),
}))

import { InitialAssessmentAttachmentsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAttachmentsPanel'

describe('InitialAssessmentAttachmentsPanel', () => {
  it('lists saved recordings and transcripts and plays a recording through the protected endpoint', async () => {
    fileMutate.mockResolvedValue(new Blob(['x'], { type: 'audio/webm' }))
    URL.createObjectURL = vi.fn(() => 'blob:recording')
    URL.revokeObjectURL = vi.fn()
    render(<InitialAssessmentAttachmentsPanel serviceUserId="su1" submissionId="s1" canUpdate editable />)

    // Closed by default: the count shows, the table does not.
    const toggle = screen.getByRole('button', { name: /Attachments/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent('3 files')
    expect(screen.queryByRole('table')).toBeNull()
    await userEvent.click(toggle)

    const rows = screen.getAllByRole('row')
    expect(rows[0]).toHaveTextContent(/File\s*Type\s*Size\s*Added\s*Open/i)
    expect(rows).toHaveLength(4)
    expect(screen.getByText('Assessment conversation recording')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove MCA form' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open transcript' })).toBeInTheDocument()
    // Only the ordinary document gets a plain link; recordings have no public URL.
    expect(screen.getAllByRole('link', { name: 'Open file' })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Play recording' }))
    expect(fileMutate).toHaveBeenCalledWith({ submissionId: 's1', attachmentId: 'a1' })
    expect(await screen.findByTestId('ia-recording-player')).toHaveAttribute('src', 'blob:recording')
  })

  it('opens a saved transcript in a dialog that offers to fill the open tab with AI again', async () => {
    // jsdom's Blob has no text(); browsers do.
    fileMutate.mockResolvedValue({ text: async () => 'Carer: Do you need help with meals?' })
    const target = { tabTitle: 'Nutrition', questions: [], answers: {}, editable: true, onApply: vi.fn() }
    render(
      <InitialAssessmentAttachmentsPanel serviceUserId="su1" submissionId="s1" canUpdate editable fillTarget={target} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Attachments/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Open transcript' }))

    expect(fileMutate).toHaveBeenCalledWith({ submissionId: 's1', attachmentId: 'a2' })
    const dialog = await screen.findByTestId('ia-saved-transcript-dialog')
    expect(dialog).toHaveTextContent('Carer: Do you need help with meals?')
    expect(screen.getByTestId('ia-ai-fill-stub')).toHaveTextContent('Nutrition: Carer: Do you need help with meals?')
    expect(screen.getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument()
  })
})

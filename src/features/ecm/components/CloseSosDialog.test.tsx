import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloseSosDialog } from '@/features/ecm/components/CloseSosDialog'

describe('CloseSosDialog', () => {
  it('requires action and outcome before close', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <CloseSosDialog open onOpenChange={() => undefined} sentAtLabel="14:21" onConfirm={onConfirm} />,
    )

    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'Called carer' }))
    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'False alarm' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    expect(onConfirm).toHaveBeenCalledWith({
      actionCode: 'SOS_ACTION_CALLED_CARER',
      outcomeCode: 'SOS_FALSE_ALARM',
      actionNote: undefined,
      note: undefined,
    })
  })

  it('opens a required action note and a separate outcome note', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<CloseSosDialog open onOpenChange={() => undefined} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Other action' }))
    expect(screen.getByLabelText(/other action note/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/other outcome note/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Other outcome' }))
    expect(screen.getByLabelText(/other outcome note/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/other action note/i), 'called neighbour')
    await userEvent.type(screen.getByLabelText(/other outcome note/i), 'all safe')
    await userEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    expect(onConfirm).toHaveBeenCalledWith({
      actionCode: 'SOS_ACTION_OTHER',
      outcomeCode: 'SOS_OTHER',
      actionNote: 'called neighbour',
      note: 'all safe',
    })
  })
})

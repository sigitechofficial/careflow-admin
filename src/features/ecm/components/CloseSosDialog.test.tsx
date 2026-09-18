import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloseSosDialog } from '@/features/ecm/components/CloseSosDialog'

describe('CloseSosDialog', () => {
  it('requires action, outcome and both notes before close', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <CloseSosDialog open onOpenChange={() => undefined} sentAtLabel="14:21" onConfirm={onConfirm} />,
    )

    // Notes fields are always shown, not only for "Other".
    expect(screen.getByLabelText(/action notes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/outcome notes/i)).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'Called carer' }))
    await userEvent.click(screen.getByRole('radio', { name: 'False alarm' }))
    // Both chips picked, but notes are still required.
    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/action notes/i), 'called carer back')
    expect(screen.getByRole('button', { name: 'Close SOS' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/outcome notes/i), 'all safe')
    await userEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    expect(onConfirm).toHaveBeenCalledWith({
      actionCode: 'SOS_ACTION_CALLED_CARER',
      outcomeCode: 'SOS_FALSE_ALARM',
      actionNote: 'called carer back',
      note: 'all safe',
    })
  })

  it('carries notes for the Other action / Other outcome path', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<CloseSosDialog open onOpenChange={() => undefined} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Other action' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Other outcome' }))
    await userEvent.type(screen.getByLabelText(/action notes/i), 'called neighbour')
    await userEvent.type(screen.getByLabelText(/outcome notes/i), 'all safe')
    await userEvent.click(screen.getByRole('button', { name: 'Close SOS' }))

    expect(onConfirm).toHaveBeenCalledWith({
      actionCode: 'SOS_ACTION_OTHER',
      outcomeCode: 'SOS_OTHER',
      actionNote: 'called neighbour',
      note: 'all safe',
    })
  })
})

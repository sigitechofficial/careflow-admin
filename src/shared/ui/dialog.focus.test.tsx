import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/ui/dialog'

/** WCAG 2.4.3: closing a dialog opened from state (no DialogTrigger) puts focus back on its opener. */
function Opened({ alert }: { alert?: boolean }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open it
      </button>
      {alert ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogTitle>Details</DialogTitle>
            <input aria-label="Name" />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

describe('dialog focus return', () => {
  it('a dialog returns focus to the button that opened it', async () => {
    render(<Opened />)
    await userEvent.click(screen.getByRole('button', { name: 'Open it' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open it' })).toHaveFocus()
  })

  it('an alert dialog does too', async () => {
    render(<Opened alert />)
    await userEvent.click(screen.getByRole('button', { name: 'Open it' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Open it' })).toHaveFocus()
  })
})

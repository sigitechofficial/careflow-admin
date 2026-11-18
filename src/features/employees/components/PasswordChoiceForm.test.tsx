import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordChoiceForm, passwordChoiceError } from './PasswordChoiceForm'

describe('PasswordChoiceForm', () => {
  it('validates a typed password', () => {
    expect(passwordChoiceError('link', '', '')).toBeNull()
    expect(passwordChoiceError('password', 'short', 'short')).toBe('Use at least 8 characters.')
    expect(passwordChoiceError('password', 'long-enough-1', 'long-enough-2')).toBe('The passwords don’t match.')
    expect(passwordChoiceError('password', 'long-enough-1', 'long-enough-1')).toBeNull()
  })

  it('emails a link by default; a typed password is passed up only when valid', async () => {
    const onChange = vi.fn()
    render(<PasswordChoiceForm name="Priya" idPrefix="t" onChange={onChange} />)
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'link' })

    await userEvent.click(screen.getByTestId('t-mode-password'))
    expect(onChange).toHaveBeenLastCalledWith(null)
    await userEvent.type(screen.getByLabelText('Password'), 'Office-Set-1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Office-Set-1')
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'password', password: 'Office-Set-1' })
    expect(screen.getByText(/The welcome email won’t include it/)).toBeInTheDocument()
  })

  it('password only (changing an existing password): no link option', () => {
    render(<PasswordChoiceForm name="Priya" idPrefix="t" allowLink={false} onChange={() => undefined} />)
    expect(screen.queryByTestId('t-mode-link')).toBeNull()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('@/features/surveys/sharing/survey-sharing.api', () => ({ useSharedLinkLimit: () => ({ mutate, isPending: false }) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SharedLinkLimit } from '@/features/surveys/sharing/SharedLinkLimit'

const local = (ms: number) => {
  const d = new Date(ms)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const limit = { standard: 60, inForce: 60, raisedUntil: null, max: 1000, maxDays: 7 }

describe('SharedLinkLimit', () => {
  it('raises the per-link limit for a planned sitting until a time', async () => {
    render(<SharedLinkLimit surveyId="s1" limit={limit} />)
    expect(screen.getByTestId('shared-link-limit')).toHaveTextContent('Answers per 10 minutes through each link: 60.')
    await userEvent.click(screen.getByRole('button', { name: 'Raise it for a planned sitting' }))
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    expect(screen.getByText('Choose until when the higher limit is needed.')).toBeInTheDocument()
    const inTwoDays = local(Date.now() + 2 * 24 * 60 * 60_000)
    await userEvent.type(screen.getByLabelText(/Until/), inTwoDays)
    await userEvent.click(save)
    expect(mutate).toHaveBeenCalledWith({ limit: 300, until: new Date(inTwoDays).toISOString() }, expect.any(Object))
  })

  it('says why Save cannot be pressed: a number out of range, a time past the last day allowed', async () => {
    render(<SharedLinkLimit surveyId="s1" limit={limit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Raise it for a planned sitting' }))
    const number = screen.getByLabelText(/Answers per 10 minutes/)
    expect(number).toHaveFocus()
    await userEvent.clear(number)
    await userEvent.type(number, '50')
    expect(number).toHaveAttribute('aria-invalid', 'true')
    expect(number).toHaveAccessibleDescription('Enter a whole number from 61 to 1000.')
    await userEvent.clear(number)
    await userEvent.type(number, '400')
    await userEvent.type(screen.getByLabelText(/Until/), local(Date.now() + 9 * 24 * 60 * 60_000))
    expect(screen.getByText('Choose a time in the next 7 days.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Raise it for a planned sitting' })).toHaveFocus()
  })

  it('a raised limit says until when, and can be put back', async () => {
    render(<SharedLinkLimit surveyId="s1" limit={{ ...limit, inForce: 300, raisedUntil: '2030-06-01T14:00:00.000Z' }} />)
    expect(screen.getByTestId('shared-link-limit')).toHaveTextContent('Raised for a planned sitting until')
    await userEvent.click(screen.getByRole('button', { name: 'Put the standard limit back' }))
    expect(mutate).toHaveBeenLastCalledWith({ limit: null }, expect.any(Object))
  })
})

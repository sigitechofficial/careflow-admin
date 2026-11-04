import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useFocusField } from '@/shared/lib/use-focus-field'

beforeAll(() => {
  // jsdom has no layout, so no scrolling.
  Element.prototype.scrollIntoView = vi.fn()
})

function Form({ focus }: { focus?: string }) {
  useFocusField(focus)
  return (
    <main>
      <div className="grid">
        <label>
          <span>First name</span>
          <input aria-label="first" />
        </label>
        <label>
          <span>Address</span>
          <input aria-label="address" />
        </label>
      </div>
      <section>
        <div>
          <h2>GP Details</h2>
          <button type="button">+</button>
        </div>
      </section>
    </main>
  )
}

describe('useFocusField', () => {
  it('focuses the control of the labelled field, not the first one in its grid', async () => {
    render(<Form focus="Address" />)
    await waitFor(() => expect(screen.getByLabelText('address')).toHaveFocus())
  })

  it('opens a section by its heading and focuses its add button', async () => {
    render(<Form focus="GP Details" />)
    await waitFor(() => expect(screen.getByRole('button', { name: '+' })).toHaveFocus())
    expect(screen.getByRole('heading', { name: 'GP Details' }).closest('section')).toHaveClass('ring-amber-400')
  })
})

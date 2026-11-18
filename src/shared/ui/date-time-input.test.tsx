import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { DateInput, DateTimeInput, MonthInput, TimeInput } from './date-time-input'

function Controlled({ kind, initial = '', onValue, min }: { kind: 'date' | 'time' | 'dt' | 'month'; initial?: string; onValue: (v: string) => void; min?: string }) {
  const [v, setV] = React.useState(initial)
  const Field = kind === 'date' ? DateInput : kind === 'time' ? TimeInput : kind === 'dt' ? DateTimeInput : MonthInput
  return (
    <form>
      <label htmlFor="f">When</label>
      <Field id="f" value={v} min={min} onChange={e => { setV(e.target.value); onValue(e.target.value) }} />
    </form>
  )
}

describe('Date and time fields follow the organisation format (DD/MM/YYYY, 24-hour by default)', () => {
  it('shows a stored date as DD/MM/YYYY, not the browser’s MM/DD/YYYY', () => {
    render(<Controlled kind="date" initial="2026-06-15" onValue={() => undefined} />)
    expect(screen.getByLabelText('When')).toHaveValue('15/06/2026')
    expect(screen.getByLabelText('When')).toHaveAttribute('placeholder', 'dd/mm/yyyy')
  })

  it('typing 15/06/2026 gives the form "2026-06-15"', async () => {
    const onValue = vi.fn()
    render(<Controlled kind="date" onValue={onValue} />)
    await userEvent.type(screen.getByLabelText('When'), '15/06/2026')
    expect(onValue).toHaveBeenLastCalledWith('2026-06-15')
    await userEvent.tab()
    expect(screen.getByLabelText('When')).toHaveValue('15/06/2026')
  })

  it('the standard form still works when typed or pasted (2026-06-15)', () => {
    const onValue = vi.fn()
    render(<Controlled kind="date" onValue={onValue} />)
    fireEvent.change(screen.getByLabelText('When'), { target: { value: '2026-06-15' } })
    expect(onValue).toHaveBeenLastCalledWith('2026-06-15')
  })

  it('times are 24-hour; "2:30 pm" is read as 14:30', async () => {
    const onValue = vi.fn()
    render(<Controlled kind="time" onValue={onValue} />)
    await userEvent.type(screen.getByLabelText('When'), '2:30 pm')
    await userEvent.tab()
    expect(onValue).toHaveBeenLastCalledWith('14:30')
    expect(screen.getByLabelText('When')).toHaveValue('14:30')
  })

  it('date and time together', async () => {
    const onValue = vi.fn()
    render(<Controlled kind="dt" initial="2026-06-15T09:05" onValue={onValue} />)
    expect(screen.getByLabelText('When')).toHaveValue('15/06/2026 09:05')
    const box = screen.getByLabelText('When')
    await userEvent.clear(box)
    await userEvent.type(box, '16/06/2026 14:30')
    await userEvent.tab()
    expect(onValue).toHaveBeenLastCalledWith('2026-06-16T14:30')
  })

  it('months show as MM/YYYY', () => {
    render(<Controlled kind="month" initial="2026-06" onValue={() => undefined} />)
    expect(screen.getByLabelText('When')).toHaveValue('06/2026')
  })

  it('picking a day in the calendar sets the date', async () => {
    const onValue = vi.fn()
    render(<Controlled kind="date" initial="2026-06-15" onValue={onValue} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose a date' }))
    await userEvent.click(screen.getByRole('button', { name: /June 20(th)?, 2026/i }))
    expect(onValue).toHaveBeenLastCalledWith('2026-06-20')
  })

  it('a date before min stops the form submitting, with a clear message', async () => {
    render(<Controlled kind="date" min="2026-06-10" onValue={() => undefined} />)
    const box = screen.getByLabelText('When') as HTMLInputElement
    await userEvent.type(box, '01/06/2026')
    await userEvent.tab()
    expect(box.validationMessage).toBe('Choose a date on or after 10/06/2026.')
  })

  it('an impossible date is not accepted and is marked', async () => {
    const onValue = vi.fn()
    render(<Controlled kind="date" onValue={onValue} />)
    await userEvent.type(screen.getByLabelText('When'), '31/02/2026')
    await userEvent.tab()
    expect(onValue).not.toHaveBeenCalled()
    expect(screen.getByLabelText('When')).toHaveAttribute('aria-invalid', 'true')
  })

  it('works with react-hook-form register (uncontrolled)', async () => {
    let submitted: { start?: string } = {}
    function Form() {
      const { register, handleSubmit } = useForm<{ start: string }>({ defaultValues: { start: '2026-06-15' } })
      return (
        <form onSubmit={handleSubmit(v => { submitted = v })}>
          <label htmlFor="s">Start</label>
          <DateInput id="s" {...register('start')} />
          <button type="submit">Save</button>
        </form>
      )
    }
    render(<Form />)
    expect(screen.getByLabelText('Start')).toHaveValue('15/06/2026')
    const box = screen.getByLabelText('Start')
    await userEvent.clear(box)
    await userEvent.type(box, '20/06/2026')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(submitted.start).toBe('2026-06-20')
  })
})

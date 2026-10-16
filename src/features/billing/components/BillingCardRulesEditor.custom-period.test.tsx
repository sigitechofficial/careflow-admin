import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { PayCardRule } from '@/features/billing/types/billing-cards.types'
import { PAY_TIME_PERIOD_LOOKUP } from '@/features/billing/data/pay-time-period.lookup'

vi.mock('@/shared/lib/toast', () => ({ toastWarning: vi.fn() }))

import { BillingCardRulesEditor } from './BillingCardRulesEditor'

/** A band that matches none of the named periods: weekdays 18:30 to 21:45. */
const customBand: PayCardRule = {
  label: 'Twilight',
  dayType: 'WEEKDAY',
  rateType: 'HOURLY',
  amount: 17.5,
  startTime: '18:30',
  endTime: '21:45',
  enhancementMethod: 'ABSOLUTE_HOURLY',
}

/** The editor inside a form, holding its rules as the pay card page does. */
function Harness({ initial, onRules }: { initial: PayCardRule[]; onRules: (rules: PayCardRule[]) => void }) {
  const [rules, setRules] = React.useState(initial)
  return (
    <form data-testid="card-form">
      <BillingCardRulesEditor
        mode="pay"
        rules={rules}
        onChange={next => {
          setRules(next as PayCardRule[])
          onRules(next as PayCardRule[])
        }}
      />
    </form>
  )
}

const periodSelects = () =>
  screen.getAllByRole('combobox').filter(el => [...(el as HTMLSelectElement).options].some(o => o.textContent === 'Custom…'))

describe('pay card rules: custom period (PC-02)', () => {
  it('a saved custom band reloads as "Custom…" with its times, and the form is valid', () => {
    render(<Harness initial={[customBand]} onRules={() => undefined} />)

    const select = periodSelects()[0] as HTMLSelectElement
    expect(select.selectedOptions[0].textContent).toBe('Custom…')
    // The option must carry a value: an empty one made the browser refuse to submit the card.
    expect(select.value).not.toBe('')
    expect(select.required).toBe(true)
    expect(select.checkValidity()).toBe(true)

    expect(screen.getByDisplayValue('18:30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('21:45')).toBeInTheDocument()
  })

  it('editing the times of a custom band keeps it custom and reports the new times', () => {
    const onRules = vi.fn()
    render(<Harness initial={[customBand]} onRules={onRules} />)

    fireEvent.change(screen.getByDisplayValue('18:30'), { target: { value: '19:15' } })

    const latest = onRules.mock.calls.at(-1)![0] as PayCardRule[]
    expect(latest[0]).toMatchObject({ startTime: '19:15', endTime: '21:45', dayType: 'WEEKDAY' })
    expect((periodSelects()[0] as HTMLSelectElement).selectedOptions[0].textContent).toBe('Custom…')
    expect((periodSelects()[0] as HTMLSelectElement).checkValidity()).toBe(true)
  })

  it('switching a named period to "Custom…" keeps the times instead of rewriting them', () => {
    const named = PAY_TIME_PERIOD_LOOKUP[0]
    const onRules = vi.fn()
    render(<Harness initial={[customBand]} onRules={onRules} />)
    const select = periodSelects()[0] as HTMLSelectElement

    fireEvent.change(select, { target: { value: named.code } })
    const afterNamed = onRules.mock.calls.at(-1)![0] as PayCardRule[]
    expect((periodSelects()[0] as HTMLSelectElement).value).toBe(named.code)

    fireEvent.change(periodSelects()[0], { target: { value: 'CUSTOM' } })
    const afterCustom = onRules.mock.calls.at(-1)![0] as PayCardRule[]
    expect(afterCustom[0]).toMatchObject({
      label: 'Custom period',
      rateType: 'HOURLY',
      startTime: afterNamed[0].startTime,
      endTime: afterNamed[0].endTime,
    })
    expect((periodSelects()[0] as HTMLSelectElement).selectedOptions[0].textContent).toBe('Custom…')
    expect((periodSelects()[0] as HTMLSelectElement).checkValidity()).toBe(true)
  })

  it('a named period shows its days and times as one line; "Change days or times" opens From / Until without changing the rate', () => {
    const named = PAY_TIME_PERIOD_LOOKUP[0]
    const onRules = vi.fn()
    render(<Harness initial={[customBand]} onRules={onRules} />)
    fireEvent.change(periodSelects()[0], { target: { value: named.code } })
    const afterNamed = onRules.mock.calls.at(-1)![0] as PayCardRule[]

    const summary = screen.getByTestId('pay-rule-period-summary')
    expect(summary).toHaveTextContent(`${afterNamed[0].startTime}–${afterNamed[0].endTime}`)
    expect(screen.queryByDisplayValue(afterNamed[0].startTime!)).toBeNull() // no From / Until inputs

    const calls = onRules.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Change days or times' }))
    expect(onRules.mock.calls.length).toBe(calls) // nothing changed by opening the times
    expect(screen.getByDisplayValue(afterNamed[0].startTime!)).toBeInTheDocument()
    expect(screen.queryByTestId('pay-rule-period-summary')).toBeNull()
  })
})

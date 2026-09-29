import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EditableStringList } from './LocationBranchEditDialog'

function Harness({ initial }: { initial: string[] }) {
  const [items, setItems] = React.useState(initial)
  return (
    <>
      <EditableStringList
        id="managers"
        label="Registered managers"
        items={items}
        onChange={setItems}
        addLabel="Add manager"
      />
      <output data-testid="value">{JSON.stringify(items)}</output>
    </>
  )
}

describe('EditableStringList', () => {
  it('adds, edits and removes registered managers', () => {
    render(<Harness initial={['Mrs Suzette Thomas']} />)
    fireEvent.click(screen.getByRole('button', { name: /add manager/i }))
    fireEvent.change(screen.getByLabelText('Registered managers 2'), {
      target: { value: 'Miss Veron Minott' },
    })
    expect(screen.getByTestId('value').textContent).toBe(
      JSON.stringify(['Mrs Suzette Thomas', 'Miss Veron Minott']),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove registered managers 1' }))
    expect(screen.getByTestId('value').textContent).toBe(JSON.stringify(['Miss Veron Minott']))
  })

  it('shows an empty state', () => {
    render(<Harness initial={[]} />)
    expect(screen.getByText('None added.')).toBeTruthy()
  })
})

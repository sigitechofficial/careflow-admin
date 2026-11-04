import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CarePlanLifecyclePanel } from '@/features/service-users/care-plans/components/CarePlanLifecyclePanel'

describe('CarePlanLifecyclePanel', () => {
  it('a manager suspends a published plan with a required reason', async () => {
    const onAction = vi.fn()
    render(<CarePlanLifecyclePanel lifecycle={{ status: 'ACTIVE' }} published canManage onAction={onAction} />)
    expect(screen.getByTestId('care-plan-lifecycle-status')).toHaveTextContent('Published')
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }))
    const confirm = screen.getAllByRole('button', { name: 'Suspend' }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Admitted to hospital')
    await userEvent.click(confirm)
    expect(onAction).toHaveBeenCalledWith('suspend', { reason: 'Admitted to hospital' })
  })

  it('resume needs a reason and the review confirmation; the suspension reason is shown', async () => {
    const onAction = vi.fn()
    render(
      <CarePlanLifecyclePanel
        lifecycle={{ status: 'SUSPENDED', reason: 'Admitted to hospital' }}
        published
        canManage
        onAction={onAction}
      />,
    )
    expect(screen.getByTestId('care-plan-lifecycle-reason')).toHaveTextContent('Suspended: Admitted to hospital')
    expect(screen.queryByRole('button', { name: 'Suspend' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Home from hospital')
    const confirm = screen.getAllByRole('button', { name: 'Resume' }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(confirm)
    expect(onAction).toHaveBeenCalledWith('resume', { reason: 'Home from hospital', reviewConfirmed: true })
  })

  it('archived plans show their reason and offer no actions', () => {
    render(
      <CarePlanLifecyclePanel lifecycle={{ status: 'ARCHIVED', reason: 'Service ended' }} published canManage onAction={vi.fn()} />,
    )
    expect(screen.getByTestId('care-plan-lifecycle-status')).toHaveTextContent('Archived')
    expect(screen.getByText(/Not shown to carers/)).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('no actions without the manager permission; nothing shown for an ordinary active plan', () => {
    const { container, rerender } = render(
      <CarePlanLifecyclePanel lifecycle={{ status: 'ACTIVE' }} published canManage={false} onAction={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(
      <CarePlanLifecyclePanel lifecycle={{ status: 'SUSPENDED', reason: 'x' }} published canManage={false} onAction={vi.fn()} />,
    )
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByTestId('care-plan-lifecycle-status')).toHaveTextContent('Suspended')
  })

  it('a never-published draft can be archived but not suspended', () => {
    render(<CarePlanLifecyclePanel lifecycle={{ status: 'ACTIVE' }} published={false} canManage onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Suspend' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })
})

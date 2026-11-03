import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CarePlanTaskReconciliationPanel,
  NO_STRUCTURED_REQUIREMENTS_TEXT,
} from '@/features/service-users/care-plans/components/CarePlanTaskReconciliationPanel'
import type { CarePlanTaskReconciliation } from '@/features/service-users/care-plans/types'

const link = (over: Partial<CarePlanTaskReconciliation['links'][number]>): CarePlanTaskReconciliation['links'][number] => ({
  id: 'l1',
  requirementKey: 'mob:frame',
  requirementLabel: 'I use a walking frame',
  state: 'LINKED',
  reason: null,
  visitTaskAssignmentId: 'a-frame',
  task: { name: 'Walking frame check', medicationRoundCode: 'MORNING', dueTime: null },
  assignmentInactive: false,
  requirementGone: false,
  suggestedReuse: false,
  confirmedForVersionId: 'v1',
  confirmedForVersionNumber: 1,
  confirmedForCurrentVersion: true,
  ...over,
})

const base: CarePlanTaskReconciliation = {
  instanceId: 'inst-1',
  carePathwayFormId: 'form-1',
  formName: 'Mobility',
  lifecycleStatus: 'ACTIVE',
  publishedVersion: { id: 'v2', versionNumber: 2 },
  hasStructuredRequirements: true,
  requirements: [
    { key: 'mob:frame', label: 'I use a walking frame', expectedDisplay: 'Yes', state: 'REVIEW_REQUIRED', linkIds: ['l1'] },
    { key: 'mob:transfer', label: 'Transfer support', expectedDisplay: 'one_carer', state: 'UNLINKED', linkIds: [] },
    { key: 'mob:bath', label: 'Bath support', expectedDisplay: 'Yes', state: 'NOT_APPLICABLE', linkIds: ['l2'] },
  ],
  links: [
    link({ state: 'REVIEW_REQUIRED', suggestedReuse: true, confirmedForCurrentVersion: false }),
    link({ id: 'l2', requirementKey: 'mob:bath', state: 'NOT_APPLICABLE', visitTaskAssignmentId: null, task: null, reason: 'Family bathe him' }),
  ],
  unlinkedAssignments: [{ id: 'a-shower', taskName: 'Assist with shower', medicationRoundCode: 'MORNING', dueTime: null }],
  activeAssignments: [
    { id: 'a-frame', taskName: 'Walking frame check', medicationRoundCode: 'MORNING', dueTime: null },
    { id: 'a-shower', taskName: 'Assist with shower', medicationRoundCode: 'MORNING', dueTime: '08:00' },
  ],
  counts: { linked: 0, reviewRequired: 1, notApplicable: 1, unlinkedRequirements: 1 },
}

describe('CarePlanTaskReconciliationPanel', () => {
  it('shows the plan, version, each requirement state, review hints and N/A reasons — never "all covered"', () => {
    render(<CarePlanTaskReconciliationPanel data={base} canManage onAction={vi.fn()} />)
    expect(screen.getByText('Visit Task Reconciliation')).toBeInTheDocument()
    expect(screen.getByText(/Mobility · published version 2/)).toBeInTheDocument()
    const rows = screen.getAllByTestId('task-requirement-row')
    expect(within(rows[0]).getAllByText('Needs review').length).toBeGreaterThan(0)
    expect(within(rows[0]).getByText(/Unchanged since version 1/)).toBeInTheDocument()
    expect(within(rows[1]).getByText('Not linked')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Reason: Family bathe him')).toBeInTheDocument()
    expect(screen.getByText(/Visit tasks not linked to this plan: Assist with shower/)).toBeInTheDocument()
    expect(screen.queryByText(/all tasks covered/i)).toBeNull()
  })

  it('shows the manual-review message when there are no structured requirements', () => {
    render(
      <CarePlanTaskReconciliationPanel
        data={{ ...base, hasStructuredRequirements: false, requirements: [], links: [] }}
        canManage
        onAction={vi.fn()}
      />,
    )
    expect(screen.getByTestId('task-reconciliation-manual')).toHaveTextContent(NO_STRUCTURED_REQUIREMENTS_TEXT)
  })

  it('links an existing task to a requirement, marks reviewed and unlinks', async () => {
    const onAction = vi.fn()
    render(<CarePlanTaskReconciliationPanel data={base} canManage onAction={onAction} />)

    const transfer = screen.getAllByTestId('task-requirement-row')[1]
    await userEvent.click(within(transfer).getByRole('button', { name: 'Link Existing Task' }))
    expect(screen.getByLabelText('Care plan requirement')).toHaveValue('mob:transfer')
    const linkBtn = screen.getByRole('button', { name: 'Link' })
    expect(linkBtn).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Visit task'), 'a-shower')
    await userEvent.click(linkBtn)
    expect(onAction).toHaveBeenCalledWith({ action: 'link', visitTaskAssignmentId: 'a-shower', requirementKey: 'mob:transfer' })

    await userEvent.click(screen.getByRole('button', { name: 'Mark Reviewed' }))
    expect(onAction).toHaveBeenCalledWith({ action: 'review', linkId: 'l1' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Unlink' })[0])
    expect(onAction).toHaveBeenCalledWith({ action: 'unlink', linkId: 'l1' })
  })

  it('not applicable needs a reason', async () => {
    const onAction = vi.fn()
    render(<CarePlanTaskReconciliationPanel data={base} canManage onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark Not Applicable' }))
    const confirm = screen.getAllByRole('button', { name: 'Mark Not Applicable' }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Family help with transfers')
    await userEvent.click(confirm)
    expect(onAction).toHaveBeenCalledWith({ action: 'not_applicable', requirementKey: 'mob:transfer', reason: 'Family help with transfers' })
  })

  it('read-only without the manager permission', () => {
    render(<CarePlanTaskReconciliationPanel data={base} canManage={false} onAction={vi.fn()} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('a link to a removed requirement can only be unlinked', () => {
    render(
      <CarePlanTaskReconciliationPanel
        data={{ ...base, requirements: [], links: [link({ requirementKey: 'mob:gone', state: 'REVIEW_REQUIRED', requirementGone: true })] }}
        canManage
        onAction={vi.fn()}
      />,
    )
    expect(screen.getByText(/no longer in the published plan/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark Reviewed' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StaffListVisibilityNote, type StaffListVisibilityNoteProps } from './StaffListVisibilityNote'

const base: StaffListVisibilityNoteProps = {
  assignedLocations: null,
  selectedBranchName: null,
  canShowAllBranches: true,
  onShowAllBranches: () => {},
  activeFilterCount: 0,
  searchText: '',
  onClearFilters: () => {},
  total: 7,
  empty: false,
}

describe('StaffListVisibilityNote: says why someone is not listed', () => {
  it('says everyone is shown when nothing limits the list', () => {
    render(<StaffListVisibilityNote {...base} />)
    expect(screen.getByTestId('staff-list-visibility-note')).toHaveTextContent(
      'Showing all 7 employees at every branch, of every status.',
    )
  })

  it("names a branch-limited manager's branches and mentions new staff with no branch", () => {
    render(
      <StaffListVisibilityNote
        {...base}
        assignedLocations={[{ id: 'a', name: 'Croydon' }]}
        selectedBranchName="Croydon"
        canShowAllBranches={false}
      />,
    )
    const note = screen.getByTestId('staff-list-visibility-note')
    expect(note).toHaveTextContent('Your access covers the branch Croydon')
    expect(note).toHaveTextContent('Not assigned to a branch yet')
    // A one-branch manager is not told about the branch picker they cannot change.
    expect(note).not.toHaveTextContent('branch picker')
    expect(screen.queryByTestId('staff-list-show-all-branches')).toBeNull()
  })

  it('explains an empty list and offers ways out', async () => {
    const onClear = vi.fn()
    const onAll = vi.fn()
    render(
      <StaffListVisibilityNote
        {...base}
        selectedBranchName="Harrow"
        searchText="Carla"
        activeFilterCount={2}
        onClearFilters={onClear}
        onShowAllBranches={onAll}
        total={0}
        empty
      />,
    )
    const note = screen.getByTestId('staff-list-visibility-note')
    expect(note).toHaveTextContent('Nobody matches what is selected.')
    expect(note).toHaveTextContent('Showing Harrow only')
    expect(note).toHaveTextContent('"Carla"')
    expect(note).toHaveTextContent('2 filters are applied')
    await userEvent.click(screen.getByTestId('staff-list-clear-all'))
    await userEvent.click(screen.getByTestId('staff-list-show-all-branches'))
    expect(onClear).toHaveBeenCalled()
    expect(onAll).toHaveBeenCalled()
  })

  it('tells someone with no branches why they see nobody', () => {
    render(<StaffListVisibilityNote {...base} assignedLocations={[]} empty total={0} />)
    expect(screen.getByTestId('staff-list-visibility-note')).toHaveTextContent(
      'Your account is not linked to any branch yet',
    )
  })
})

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

  it("a branch-limited manager sees one short line naming their branch; the reasons are on hover", () => {
    render(
      <StaffListVisibilityNote
        {...base}
        assignedLocations={[{ id: 'a', name: 'Croydon' }]}
        selectedBranchName="Croydon"
        canShowAllBranches={false}
      />,
    )
    const note = screen.getByTestId('staff-list-visibility-note')
    expect(note).toHaveTextContent('Showing staff at Croydon')
    // No block of explanation on screen: it sits behind the info icon.
    expect(note).not.toHaveTextContent('Your access covers')
    expect(screen.getByRole('button', { name: 'Why some staff may not be listed' })).toBeInTheDocument()
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

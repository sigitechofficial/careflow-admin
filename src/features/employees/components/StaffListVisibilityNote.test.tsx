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
  it('shows nothing when rows are listed and no filter is on (the header already names the branch)', () => {
    render(<StaffListVisibilityNote {...base} />)
    expect(screen.queryByTestId('staff-list-visibility-note')).toBeNull()
  })

  it('a branch-limited manager with rows listed sees no extra text', () => {
    render(
      <StaffListVisibilityNote
        {...base}
        assignedLocations={[{ id: 'a', name: 'Croydon' }]}
        selectedBranchName="Croydon"
        canShowAllBranches={false}
      />,
    )
    expect(screen.queryByTestId('staff-list-visibility-note')).toBeNull()
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

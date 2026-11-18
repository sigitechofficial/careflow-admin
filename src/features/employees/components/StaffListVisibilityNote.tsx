import { Info } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export type StaffListVisibilityNoteProps = {
  /** Branches the signed-in user is limited to (null = can see every branch). */
  assignedLocations: Array<{ id: string; name: string }> | null | undefined
  /** Branch chosen in the branch picker at the top of the screen (null = All locations). */
  selectedBranchName: string | null
  /** True when the user may switch the top branch picker to "All locations". */
  canShowAllBranches: boolean
  onShowAllBranches: () => void
  /** Number of filters applied (search, status, role, …). */
  activeFilterCount: number
  searchText: string
  onClearFilters: () => void
  /** Total rows the server found. */
  total: number
  /** True when the list is empty: the note then reads as the explanation. */
  empty: boolean
}

/**
 * Plain-English line under the staff filters saying who the list is showing and why someone may be
 * missing (branch picker, the user's own branch access, filters), with one-click ways out.
 */
export function StaffListVisibilityNote({
  assignedLocations,
  selectedBranchName,
  canShowAllBranches,
  onShowAllBranches,
  activeFilterCount,
  searchText,
  onClearFilters,
  total,
  empty,
}: StaffListVisibilityNoteProps) {
  const reasons: string[] = []
  const limited = assignedLocations != null
  if (limited) {
    const names = assignedLocations.map((l) => l.name).join(', ')
    reasons.push(
      assignedLocations.length
        ? `Your access covers ${assignedLocations.length === 1 ? 'the branch' : 'the branches'} ${names}, so staff who only work at other branches are not listed.`
        : 'Your account is not linked to any branch yet, so no staff can be listed. Ask an administrator to set your branches in Office users.',
    )
  }
  if (selectedBranchName && (!limited || (assignedLocations?.length ?? 0) > 1)) {
    reasons.push(`Showing ${selectedBranchName} only (branch picker at the top of the screen).`)
  }
  if (searchText.trim()) {
    reasons.push(`Only names or emails matching "${searchText.trim()}".`)
  }
  const nonSearchFilters = activeFilterCount
  if (nonSearchFilters > 0) {
    reasons.push(
      `${nonSearchFilters} filter${nonSearchFilters === 1 ? ' is' : 's are'} applied (status, role, branch and so on).`,
    )
  }
  const branchView = limited || Boolean(selectedBranchName)

  if (!reasons.length) {
    return (
      <p className="mb-3 mt-3 text-xs text-muted-foreground" data-testid="staff-list-visibility-note">
        Showing all {total} employee{total === 1 ? '' : 's'} at every branch, of every status.
      </p>
    )
  }

  return (
    <div
      className={
        empty
          ? 'mb-3 mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm'
          : 'mb-3 mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs'
      }
      data-testid="staff-list-visibility-note"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">
            {empty ? 'Nobody matches what is selected.' : 'Some staff may be hidden from this list:'}
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
            {branchView ? (
              <li>
                New staff with no branch yet are listed here as &ldquo;Not assigned to a branch yet&rdquo;
                when you, or someone at your branch, added them.
              </li>
            ) : null}
          </ul>
          {(searchText.trim() || nonSearchFilters > 0 || (selectedBranchName && canShowAllBranches)) ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {searchText.trim() || nonSearchFilters > 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={onClearFilters} data-testid="staff-list-clear-all">
                  Clear search and filters
                </Button>
              ) : null}
              {selectedBranchName && canShowAllBranches ? (
                <Button type="button" size="sm" variant="outline" onClick={onShowAllBranches} data-testid="staff-list-show-all-branches">
                  Show all branches
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { BookCopy, ChevronDown, Eye, ListChecks, Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { EmptyState } from '@/shared/ui/page-elements'
import { Skeleton } from '@/shared/ui/misc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/store'
import { PolicyStatusBadge } from '@/features/policies/components/PolicyStatusBadge'
import { PolicyConfirmDialog } from '@/features/policies/components/PolicyConfirmDialog'
import { PolicyPublishSummary } from '@/features/policies/components/PolicyPublishSummary'
import { useDeletePolicy, usePolicies, usePolicyCategories, usePublishPolicy } from '@/features/policies/hooks/usePolicies'
import { usePolicyAcknowledgementSummary } from '@/features/policies/hooks/usePolicyAcknowledgements'
import { useDebouncedValue } from '@/features/policies/hooks/useDebouncedValue'
import { usePolicyLookups } from '@/features/policies/hooks/usePolicyLookups'
import { POLICY_PATHS, type PolicyLibrarySearch } from '@/features/policies/policy-routes'
import { formatPolicyDate, formatPolicyDateTime, summariseApplicability } from '@/features/policies/policy-format'
import { POLICY_STATUS_OPTIONS, type PolicyDocument, type PolicyStatus } from '@/features/policies/types/policy.types'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { policySourceBadge } from '@/features/policies/policy-content'
import { canPermanentlyDeletePolicy, POLICY_PUBLISH_CONFIRM, policyDeleteConfirmCopy } from '@/features/policies/policy-actions'
import { toastError, toastSuccess } from '@/shared/lib/toast'

export function PolicyLibraryPanel() {
  const canCreate = useAuthStore(s => s.can('policies.create'))
  const canArchive = useAuthStore(s => s.can('policies.archive'))
  const canPublish = useAuthStore(s => s.can('policies.publish'))
  const canAcknowledge = useAuthStore(s => s.can('policies.acknowledgements.me'))
  const canManageAcknowledgements = useAuthStore(s => s.can('policies.acknowledgements.manage'))
  const acknowledgementSummary = usePolicyAcknowledgementSummary(canManageAcknowledgements)
  const acknowledgementByDocument = React.useMemo(
    () => new Map((acknowledgementSummary.data ?? []).map(row => [row.documentId, row])),
    [acknowledgementSummary.data],
  )
  const userId = useAuthStore(s => s.user?.id)
  const navigate = useNavigate({ from: POLICY_PATHS.library })
  const search = useSearch({ strict: false }) as PolicyLibrarySearch
  const lookups = usePolicyLookups()
  const deleteMut = useDeletePolicy()
  const publishMut = usePublishPolicy()
  const [pendingDelete, setPendingDelete] = React.useState<PolicyDocument | null>(null)
  const [pendingPublish, setPendingPublish] = React.useState<PolicyDocument | null>(null)

  const [searchInput, setSearchInput] = React.useState(search.search ?? '')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  React.useEffect(() => {
    setSearchInput(search.search ?? '')
  }, [search.search])

  React.useEffect(() => {
    const next = debouncedSearch.trim() || undefined
    if (next === search.search) return
    void navigate({
      search: prev => {
        const current = (prev ?? {}) as PolicyLibrarySearch
        return { ...current, search: next, page: undefined }
      },
    })
  }, [debouncedSearch, navigate, search.search])

  const patchSearch = (patch: PolicyLibrarySearch) => {
    void navigate({
      search: prev => {
        const current = (prev ?? {}) as PolicyLibrarySearch
        return { ...current, ...patch, page: patch.page ?? undefined }
      },
    })
  }

  const categoriesQuery = usePolicyCategories({ limit: 100, isActive: true })
  const listQuery = usePolicies({
    page: search.page ?? 1,
    limit: 20,
    search: search.search,
    status: search.status as PolicyStatus | undefined,
    categoryId: search.categoryId,
    ownerId: search.owner === 'mine' ? userId : undefined,
    reviewDateFrom: search.reviewDateFrom,
    reviewDateTo: search.reviewDateTo,
    locationId: search.locationId,
    serviceTypeCode: search.serviceTypeCode,
  })

  const rows = listQuery.data?.rows ?? []
  const meta = listQuery.data?.meta
  const hasFilters = Boolean(
    search.search ||
      search.status ||
      search.categoryId ||
      search.owner ||
      search.reviewDateFrom ||
      search.reviewDateTo ||
      search.locationId ||
      search.serviceTypeCode,
  )

  return (
    <div className="space-y-4" data-testid="policy-library-panel">
      <ContentSectionHeader
        title="Policy Library"
        description="Browse organisation policies, procedures, and related documents."
        action={
          <div className="flex gap-2">
            {canAcknowledge ? (
              <Button size="sm" variant="outline" asChild>
                <Link to={POLICY_PATHS.mine} data-testid="my-policies-link">
                  <ListChecks className="mr-1 h-4 w-4" />
                  My policies
                </Link>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link to={POLICY_PATHS.readyMade} data-testid="ready-made-policies-link">
                <BookCopy className="mr-1 h-4 w-4" />
                Ready-made policies
              </Link>
            </Button>
            {canCreate ? (
              <Button size="sm" asChild>
                <Link to={POLICY_PATHS.create}>
                  <Plus className="mr-1 h-4 w-4" />
                  Create policy
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search title or reference…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            aria-label="Search policies"
          />
        </div>
        <Combobox
          className="w-44"
          value={search.status ?? ''}
          onChange={v => patchSearch({ status: v || undefined, page: undefined })}
          options={[{ value: '', label: 'All statuses' }, ...POLICY_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))]}
          placeholder="Status"
          aria-label="Status"
        />
        <Combobox
          className="w-48"
          value={search.categoryId ?? ''}
          onChange={v => patchSearch({ categoryId: v || undefined, page: undefined })}
          options={[
            { value: '', label: 'All categories' },
            ...(categoriesQuery.data?.rows ?? []).map(c => ({ value: c.id, label: c.name })),
          ]}
          placeholder="Category"
          aria-label="Category"
        />
        <Combobox
          className="w-40"
          value={search.owner ?? ''}
          onChange={v => patchSearch({ owner: v === 'mine' ? 'mine' : undefined, page: undefined })}
          options={[
            { value: '', label: 'All owners' },
            { value: 'mine', label: 'My policies' },
          ]}
          placeholder="Owner"
          aria-label="Owner"
        />
        <Combobox
          className="w-48"
          value={search.locationId ?? ''}
          onChange={v => patchSearch({ locationId: v || undefined, page: undefined })}
          options={[
            { value: '', label: 'All branches' },
            ...lookups.locations.map(l => ({ value: l.id, label: l.name })),
          ]}
          placeholder="Branch"
          aria-label="Branch"
        />
        <Combobox
          className="w-48"
          value={search.serviceTypeCode ?? ''}
          onChange={v => patchSearch({ serviceTypeCode: v || undefined, page: undefined })}
          options={[
            { value: '', label: 'All care services' },
            ...lookups.careTypes.map(c => ({ value: c.code, label: c.name })),
          ]}
          placeholder="Care service"
          aria-label="Care service"
        />
        <FormDate
          label="Review from"
          value={search.reviewDateFrom ?? ''}
          onChange={v => patchSearch({ reviewDateFrom: v || undefined, page: undefined })}
        />
        <FormDate
          label="Review to"
          value={search.reviewDateTo ?? ''}
          onChange={v => patchSearch({ reviewDateTo: v || undefined, page: undefined })}
        />
      </div>

      {listQuery.isLoading ? (
        <LibraryTableSkeleton />
      ) : listQuery.isError ? (
        <p className="py-8 text-center text-sm text-destructive" role="alert">
          {policyErrorCopy(listQuery.error).message}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No policies match your filters.' : 'No policies yet'}
          description={
            hasFilters
              ? 'Try a different search or clear filters.'
              : 'Create your first policy to start the organisation library.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Policy</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Applicability</th>
                <th className="px-3 py-2">Effective date</th>
                <th className="px-3 py-2">Review date</th>
                <th className="px-3 py-2">Updated</th>
                {canManageAcknowledgements ? <th className="px-3 py-2">Staff acknowledged</th> : null}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground" data-testid="policy-source-badge">
                      {policySourceBadge(row.currentVersion)}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.reference}</td>
                  <td className="px-3 py-2">{row.primaryCategory?.name ?? '—'}</td>
                  <td className="px-3 py-2">{row.currentVersion?.versionLabel ?? '—'}</td>
                  <td className="px-3 py-2">
                    <PolicyStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.ownerId && row.ownerId === userId ? 'You' : row.ownerId ? 'Assigned' : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {summariseApplicability(row.currentVersion?.applicability, {
                      locations: lookups.locationLabels,
                      services: lookups.serviceLabels,
                    })}
                  </td>
                  <td className="px-3 py-2" data-testid="policy-effective-date">
                    {formatPolicyDate(row.currentVersion?.effectiveDate)}
                  </td>
                  <td className="px-3 py-2" data-testid="policy-review-date">
                    {formatPolicyDate(row.currentVersion?.reviewDate)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatPolicyDateTime(row.updatedAt)}</td>
                  {canManageAcknowledgements ? (
                    <td className="px-3 py-2" data-testid="policy-acknowledgement-summary">
                      <AcknowledgementSummaryCell summary={acknowledgementByDocument.get(row.id)} />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Actions for ${row.title}`}
                          data-testid="policy-library-actions"
                        >
                          Actions
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canPublish && row.status === 'APPROVED' ? (
                          <DropdownMenuItem onSelect={() => setPendingPublish(row)}>
                            Publish policy
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild>
                          <Link to={POLICY_PATHS.detail} params={{ policyId: row.id }}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </Link>
                        </DropdownMenuItem>
                        {canArchive &&
                        canPermanentlyDeletePolicy({
                          documentStatus: row.status,
                          currentVersionStatus: row.currentVersion?.status,
                        }) ? (
                          <DropdownMenuItem
                            destructive
                            onSelect={() => setPendingDelete(row)}
                          >
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && (meta.totalPages ?? 1) > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasPrevPage}
              onClick={() => patchSearch({ page: Math.max(1, (search.page ?? 1) - 1) })}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasNextPage}
              onClick={() => patchSearch({ page: (search.page ?? 1) + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <PolicyConfirmDialog
        open={pendingPublish != null}
        onOpenChange={open => {
          if (!open && !publishMut.isPending) setPendingPublish(null)
        }}
        title={POLICY_PUBLISH_CONFIRM.title}
        description={POLICY_PUBLISH_CONFIRM.description}
        confirmLabel={POLICY_PUBLISH_CONFIRM.confirmLabel}
        confirmVariant="success"
        pending={publishMut.isPending}
        onConfirm={() => {
          if (!pendingPublish) return
          void publishMut
            .mutateAsync({ id: pendingPublish.id })
            .then(() => {
              setPendingPublish(null)
              toastSuccess('Policy published successfully')
            })
            .catch(err => {
              const copy = policyErrorCopy(err)
              toastError(copy.title, copy.message)
            })
        }}
      >
        {pendingPublish ? (
          <PolicyPublishSummary
            title={pendingPublish.title}
            reference={pendingPublish.reference}
            effectiveDate={pendingPublish.currentVersion?.effectiveDate}
            links={pendingPublish.currentVersion?.links}
            policyId={pendingPublish.id}
          />
        ) : null}
      </PolicyConfirmDialog>
      <PolicyConfirmDialog
        open={pendingDelete != null}
        onOpenChange={open => {
          if (!open && !deleteMut.isPending) setPendingDelete(null)
        }}
        title={policyDeleteConfirmCopy(pendingDelete?.title ?? 'this policy').title}
        description={policyDeleteConfirmCopy(pendingDelete?.title ?? 'this policy').description}
        confirmLabel={policyDeleteConfirmCopy(pendingDelete?.title ?? 'this policy').confirmLabel}
        destructive
        pending={deleteMut.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          void deleteMut
            .mutateAsync(pendingDelete.id)
            .then(() => {
              setPendingDelete(null)
              toastSuccess('Policy deleted successfully.')
            })
            .catch(err => {
              const copy = policyErrorCopy(err)
              toastError(copy.title, copy.message)
            })
        }}
      />
    </div>
  )
}

function FormDate({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = label.replace(/\s+/g, '-').toLowerCase()
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="whitespace-nowrap">{label}</span>
      <Input id={id} type="date" value={value} onChange={e => onChange(e.target.value)} className="w-40" />
    </label>
  )
}

function AcknowledgementSummaryCell({
  summary,
}: {
  summary?: { required: number; acknowledged: number; overdue: number }
}) {
  if (!summary) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-col gap-0.5">
      <span>
        {summary.acknowledged} of {summary.required}
      </span>
      {summary.overdue ? (
        <span className="text-xs font-medium text-destructive">{summary.overdue} overdue</span>
      ) : null}
    </span>
  )
}

function LibraryTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border" data-testid="policy-library-skeleton">
      <div className="space-y-2 p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

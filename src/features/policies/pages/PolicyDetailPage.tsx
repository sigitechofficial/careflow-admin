import * as React from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Skeleton } from '@/shared/ui/misc'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { useAuthStore } from '@/features/auth/store'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { PolicyStatusBadge } from '@/features/policies/components/PolicyStatusBadge'
import { PolicyWorkflowActions } from '@/features/policies/components/PolicyWorkflowActions'
import {
  firstPolicyFormError,
  formFromPolicy,
  validatePolicyForReview,
} from '@/features/policies/components/PolicyForm'
import { PolicyVersionHistory } from '@/features/policies/components/PolicyVersionHistory'
import { PolicyAcknowledgementTracker, PolicyReadAndSignBanner } from '@/features/policies/components/PolicyAcknowledgementPanels'
import {
  useArchivePolicy,
  useApprovePolicy,
  useCreatePolicyVersion,
  useDeletePolicy,
  usePolicy,
  usePolicyVersion,
  usePolicyVersions,
  usePublishPolicy,
  useRequestPolicyChanges,
  useSubmitPolicyForReview,
} from '@/features/policies/hooks/usePolicies'
import { usePolicyLookups } from '@/features/policies/hooks/usePolicyLookups'
import { extractPolicyText, htmlForPolicyDisplay, isBlankPolicyHtml } from '@/features/policies/policy-content'
import { PolicySourceDocument } from '@/features/policies/components/PolicySourceDocument'
import { policyErrorCopy } from '@/features/policies/policy-error'
import {
  formatPolicyDate,
  linkTargetSummary,
  moduleLabel,
  summariseApplicability,
  summariseAudience,
} from '@/features/policies/policy-format'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import { hasInProgressVersion, workingVersionStatus } from '@/features/policies/policy-actions'
import { PolicyWorkflowStepper } from '@/features/policies/components/PolicyWorkflowStepper'
import { POLICY_IN_PROGRESS_STATUSES, type PolicyVersion } from '@/features/policies/types/policy.types'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { DOCUMENT_TYPE_LABEL } from '@/features/policies/policy-labels'

export default function PolicyDetailPage() {
  const { policyId } = useParams({ strict: false }) as { policyId: string }
  const navigate = useNavigate()
  const can = useAuthStore(s => s.can)
  const userId = useAuthStore(s => s.user?.id)
  const lookups = usePolicyLookups()
  const policyQuery = usePolicy(policyId)
  const versionsQuery = usePolicyVersions(policyId)
  const [selectedVersionId, setSelectedVersionId] = React.useState<string | undefined>()
  const selectedQuery = usePolicyVersion(policyId, selectedVersionId)

  const submitMut = useSubmitPolicyForReview()
  const changesMut = useRequestPolicyChanges()
  const approveMut = useApprovePolicy()
  const publishMut = usePublishPolicy()
  const archiveMut = useArchivePolicy()
  const deleteMut = useDeletePolicy()
  const versionMut = useCreatePolicyVersion()

  const document = policyQuery.data
  const versions = versionsQuery.data ?? []
  const working = versions.find(row => POLICY_IN_PROGRESS_STATUSES.includes(row.status))
  const published = versions.find(row => row.status === 'PUBLISHED') ?? document?.currentVersion
  const pending =
    submitMut.isPending ||
    changesMut.isPending ||
    approveMut.isPending ||
    publishMut.isPending ||
    archiveMut.isPending ||
    deleteMut.isPending ||
    versionMut.isPending

  const handleError = (err: unknown) => {
    const copy = policyErrorCopy(err)
    toastError(copy.title, copy.message)
    if (copy.title === 'Conflict' || copy.title === 'Permission denied') {
      void policyQuery.refetch()
      void versionsQuery.refetch()
    }
  }

  if (policyQuery.isLoading) {
    return (
      <PolicySectionLayout title="Policy" description="Loading policy details." testId="policy-detail-page">
        <div className="space-y-3" data-testid="policy-detail-skeleton">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PolicySectionLayout>
    )
  }

  if (policyQuery.isError || !document) {
    return (
      <PolicySectionLayout title="Policy" description="" testId="policy-detail-page">
        <p className="text-sm text-destructive" role="alert">
          {policyErrorCopy(policyQuery.error).message}
        </p>
      </PolicySectionLayout>
    )
  }

  const displayVersion = working ?? document.currentVersion
  const ownerLabel = document.ownerId === userId ? 'You' : document.ownerId ? 'Assigned' : '—'

  return (
    <PolicySectionLayout
      title={document.title}
      description={`${document.reference} · ${DOCUMENT_TYPE_LABEL[document.documentType]}`}
      testId="policy-detail-page"
    >
      <div className="space-y-8">
        <header className="space-y-4 border-b border-border pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <PolicyStatusBadge status={working?.status ?? document.status} />
              <span className="text-sm text-muted-foreground">
                Current version {document.currentVersion?.versionLabel ?? '—'}
              </span>
            </div>
            <PolicyWorkflowStepper status={working?.status ?? document.status} />
            {working && working.id !== document.currentVersionId ? (
              <p className="text-sm text-muted-foreground">
                A {working.versionLabel} draft is in progress. The published version remains read-only.
              </p>
            ) : null}
          </div>
          <PolicyWorkflowActions
            policyId={document.id}
            policyTitle={document.title}
            policyReference={document.reference}
            effectiveDate={displayVersion?.effectiveDate}
            links={displayVersion?.links}
            documentStatus={document.status}
            workingStatus={workingVersionStatus(versions)}
            hasInProgress={hasInProgressVersion(versions)}
            versions={versions}
            publishedMajor={published?.versionMajor ?? 1}
            publishedMinor={published?.versionMinor ?? 0}
            contentKind={displayVersion?.contentKind === 'UPLOAD' || displayVersion?.hasDocument ? 'UPLOAD' : 'EDITOR'}
            can={can}
            pending={pending}
            onSubmit={async () => {
              const reviewErrors = validatePolicyForReview(
                formFromPolicy(document, working ?? document.currentVersion, userId ?? ''),
                {
                  locationRestricted: lookups.isLocationRestricted,
                  allowedLocationIds: lookups.isLocationRestricted
                    ? lookups.locations.map(item => item.id)
                    : undefined,
                  hasPendingFile: Boolean((working ?? document.currentVersion)?.hasDocument),
                },
              )
              if (Object.keys(reviewErrors).length) {
                toastError('Cannot submit for review', firstPolicyFormError(reviewErrors) ?? 'Complete the required fields.')
                throw new Error('validation')
              }
              try {
                await submitMut.mutateAsync({ id: document.id })
                toastSuccess('Submitted for review')
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
            onRequestChanges={async reason => {
              try {
                await changesMut.mutateAsync({ id: document.id, comments: reason })
                toastSuccess('Changes requested')
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
            onApprove={async () => {
              try {
                await approveMut.mutateAsync({ id: document.id })
                toastSuccess('Policy approved')
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
            onPublish={async () => {
              try {
                await publishMut.mutateAsync({ id: document.id })
                toastSuccess('Policy published successfully')
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
            onArchive={async () => {
              try {
                await archiveMut.mutateAsync(document.id)
                toastSuccess('Policy archived')
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
            onDelete={async () => {
              try {
                await deleteMut.mutateAsync(document.id)
                toastSuccess('Policy deleted successfully.')
                void navigate({ to: POLICY_PATHS.library })
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
            onCreateVersion={async (bump, reusePreviousContent) => {
              try {
                const created = await versionMut.mutateAsync({ id: document.id, bump, reusePreviousContent })
                toastSuccess(`${created.versionLabel} draft created`)
                void navigate({ to: POLICY_PATHS.edit, params: { policyId: document.id } })
              } catch (err) {
                handleError(err)
                throw err
              }
            }}
          />
        </header>

        {document.status === 'PUBLISHED' ? <PolicyReadAndSignBanner documentId={document.id} /> : null}

        <Section title="Summary" description="Key information about this policy.">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Description" value={document.description || '—'} />
            <Item label="Owner" value={ownerLabel} />
            <Item label="Reviewer" value={document.reviewerId === userId ? 'You' : document.reviewerId ? 'Assigned' : '—'} />
            <Item label="Approver" value={document.approverId === userId ? 'You' : document.approverId ? 'Assigned' : '—'} />
            <Item label="Effective date" value={formatPolicyDate(displayVersion?.effectiveDate)} />
            <Item label="Review date" value={formatPolicyDate(displayVersion?.reviewDate)} />
            <Item label="Category" value={document.primaryCategory?.name ?? '—'} />
            <Item
              label="Tags"
              value={document.tags.length ? document.tags.map(tag => tag.name).join(', ') : 'No tags'}
            />
          </dl>
        </Section>

        <Section title="Applicability" description="Where this policy applies.">
          <p data-testid="policy-applicability-readonly">
            {summariseApplicability(displayVersion?.applicability, {
              locations: lookups.locationLabels,
              services: lookups.serviceLabels,
            })}
          </p>
        </Section>

        <Section title="Audience" description="Who this policy is for.">
          <p data-testid="policy-audience-readonly">
            {summariseAudience(displayVersion?.audiences, {
              roles: lookups.roleLabels,
              jobTitles: lookups.jobTitleLabels,
              workAreas: lookups.workAreaLabels,
              locations: lookups.locationLabels,
            })}
          </p>
        </Section>

        <Section title="CareFlow links" description="Areas of CareFlow that reference this policy.">
          {displayVersion?.links?.length ? (
            <ul className="space-y-3">
              {displayVersion.links.map((link, index) => (
                <li
                  key={link.id ?? `${link.moduleType}-${index}`}
                  className="rounded-lg border border-border p-3"
                  data-testid="policy-link-block"
                >
                  <p className="text-sm font-medium">{moduleLabel(link.moduleType)}</p>
                  <p className="text-sm text-muted-foreground">{linkTargetSummary(link)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">This policy is not linked to any CareFlow area.</p>
          )}
        </Section>

        {document.status === 'PUBLISHED' && (can('policies.publish') || can('policies.approve') || can('policies.update')) ? (
          <Section title="Read and sign" description="Staff who must read the published version, and who has signed it.">
            <PolicyAcknowledgementTracker documentId={document.id} />
          </Section>
        ) : null}

        <Section title="Content" description="Current version content.">
          <p className="text-sm text-muted-foreground" data-testid="policy-content-source-label">
            Content source:{' '}
            <span className="font-medium text-foreground">
              {displayVersion?.hasDocument || displayVersion?.contentKind === 'UPLOAD'
                ? 'Uploaded document'
                : 'Written in CareFlow'}
            </span>
          </p>
          {displayVersion?.hasDocument ? (
            <PolicySourceDocument policyId={document.id} version={displayVersion} />
          ) : isBlankPolicyHtml(displayVersion?.contentHtml) && !extractPolicyText(displayVersion?.contentJson, displayVersion?.contentHtml) ? (
            <p className="text-sm text-muted-foreground">No content.</p>
          ) : (
            <div
              className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-muted/20 p-4"
              data-testid="policy-formatted-content"
              dangerouslySetInnerHTML={{
                __html: htmlForPolicyDisplay(displayVersion?.contentJson, displayVersion?.contentHtml),
              }}
            />
          )}
        </Section>

        <Section title="Version history" description="Previous versions are always read-only.">
          <PolicyVersionHistory
            versions={versions}
            onOpenVersion={(version: PolicyVersion) => setSelectedVersionId(version.id)}
            selected={selectedQuery.data ?? null}
            selectedLoading={selectedQuery.isFetching && Boolean(selectedVersionId)}
            onCloseSelected={() => setSelectedVersionId(undefined)}
          />
        </Section>
      </div>
    </PolicySectionLayout>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <ContentSectionHeader title={title} description={description} />
      {children}
    </section>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  )
}

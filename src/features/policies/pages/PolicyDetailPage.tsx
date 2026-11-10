import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import { Skeleton } from '@/shared/ui/misc'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
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
import { PolicyDownloadButtons } from '@/features/policies/components/PolicyDownloadButtons'
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
import { PolicyAcknowledgementPanel } from '@/features/policies/components/PolicyAcknowledgementPanel'
import { PolicyStaffAcknowledgements } from '@/features/policies/components/PolicyStaffAcknowledgements'
import { PolicyLibraryUpdateBanner } from '@/features/policies/components/PolicyLibraryUpdateBanner'
import {
  useAcknowledgePolicy,
  useMyPolicyAcknowledgements,
  useRecordPolicyViewed,
} from '@/features/policies/hooks/usePolicyAcknowledgements'

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

  const canAcknowledge = can('policies.acknowledgements.me')
  const canManageAcknowledgements = can('policies.acknowledgements.manage')
  const myAcknowledgementsQuery = useMyPolicyAcknowledgements(canAcknowledge)
  const myAcknowledgement = myAcknowledgementsQuery.data?.items.find(item => item.documentId === policyId)
  const viewedMut = useRecordPolicyViewed()
  const acknowledgeMut = useAcknowledgePolicy()
  const viewedRecordedFor = React.useRef<string | null>(null)
  const recordViewed = viewedMut.mutate

  // Opening a policy you must acknowledge records that you viewed it (once per version).
  React.useEffect(() => {
    if (!myAcknowledgement || myAcknowledgement.status !== 'PENDING') return
    if (viewedRecordedFor.current === myAcknowledgement.versionId) return
    viewedRecordedFor.current = myAcknowledgement.versionId
    recordViewed(myAcknowledgement.documentId)
  }, [myAcknowledgement, recordViewed])

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
  const publishedVersion = published?.status === 'PUBLISHED' ? published : null
  const mustAcknowledge = Boolean(myAcknowledgement && myAcknowledgement.status !== 'ACKNOWLEDGED')
  // Staff acknowledge the published version, so show that content even while a new draft is in progress.
  const contentVersion = mustAcknowledge && publishedVersion ? publishedVersion : displayVersion
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
              {contentVersion ? (
                <span className="ml-auto flex flex-wrap items-center gap-2" data-testid="policy-print-actions">
                {contentVersion.hasDocument || contentVersion.contentKind === 'UPLOAD' ? null : (
                  <PolicyDownloadButtons
                    target={{ kind: 'policy', policyId: document.id, versionId: contentVersion.id }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  />
                )}
                <Link
                  to="/policies/$policyId/print"
                  params={{ policyId: document.id }}
                  search={{ version: contentVersion.id }}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="policy-print-link"
                  aria-label={`Print ${document.title} (${contentVersion.versionLabel}), opens in a new tab`}
                >
                  <Printer className="h-4 w-4" aria-hidden /> Print
                </Link>
                </span>
              ) : null}
            </div>
            <PolicyWorkflowStepper status={working?.status ?? document.status} />
            {working && working.id !== document.currentVersionId ? (
              <p className="text-sm text-muted-foreground">
                A {working.versionLabel} draft is in progress. The published version remains read-only.
              </p>
            ) : null}
            {mustAcknowledge && myAcknowledgement ? (
              <p
                className={myAcknowledgement.overdue ? 'text-sm font-medium text-destructive' : 'text-sm font-medium'}
                data-testid="policy-acknowledgement-reminder"
              >
                You need to read and acknowledge this policy by {formatPolicyDate(myAcknowledgement.dueAt)}.{' '}
                <a className="underline underline-offset-2" href="#policy-acknowledgement">
                  Go to the policy
                </a>
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
            acknowledgementRequired={Boolean(working?.acknowledgementRequired)}
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

        {can('policies.update') ? <PolicyLibraryUpdateBanner policyId={document.id} /> : null}

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

        <Section
          title="Content"
          description={
            contentVersion !== displayVersion && contentVersion
              ? `Published version ${contentVersion.versionLabel}, the version you need to acknowledge.`
              : 'Current version content.'
          }
        >
          {myAcknowledgement ? (
            <PolicyAcknowledgementPanel
              status={myAcknowledgement.status}
              dueAt={myAcknowledgement.dueAt}
              overdue={myAcknowledgement.overdue}
              acknowledgedAt={myAcknowledgement.acknowledgedAt}
              versionLabel={myAcknowledgement.versionLabel}
              pending={acknowledgeMut.isPending}
              onAcknowledge={() => {
                void acknowledgeMut
                  .mutateAsync(myAcknowledgement.documentId)
                  .then(() => toastSuccess('Policy acknowledged'))
                  .catch(err => {
                    const copy = policyErrorCopy(err)
                    toastError(copy.title, copy.message)
                  })
              }}
            />
          ) : null}
          <p className="text-sm text-muted-foreground" data-testid="policy-content-source-label">
            Content source:{' '}
            <span className="font-medium text-foreground">
              {contentVersion?.hasDocument || contentVersion?.contentKind === 'UPLOAD'
                ? 'Uploaded document'
                : 'Written in CareFlow'}
            </span>
          </p>
          {contentVersion?.hasDocument ? (
            <PolicySourceDocument policyId={document.id} version={contentVersion} />
          ) : isBlankPolicyHtml(contentVersion?.contentHtml) && !extractPolicyText(contentVersion?.contentJson, contentVersion?.contentHtml) ? (
            <p className="text-sm text-muted-foreground">No content.</p>
          ) : (
            <RichTextHtml
              className="policy-doc rounded-lg border border-border bg-muted/20 p-4"
              data-testid="policy-formatted-content"
              html={htmlForPolicyDisplay(contentVersion?.contentJson, contentVersion?.contentHtml)}
            />
          )}
        </Section>

        {canManageAcknowledgements && publishedVersion?.acknowledgementRequired ? (
          <Section
            id="staff-acknowledgements"
            title="Staff acknowledgements"
            description={`Who has read and acknowledged ${publishedVersion.versionLabel}.`}
          >
            <PolicyStaffAcknowledgements documentId={document.id} />
          </Section>
        ) : null}

        <Section title="Version history" description="Previous versions are always read-only.">
          <PolicyVersionHistory
            versions={versions}
            policyId={document.id}
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
  id,
  title,
  description,
  children,
}: {
  id?: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
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

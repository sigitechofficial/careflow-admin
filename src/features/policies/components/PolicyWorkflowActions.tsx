import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { PolicyConfirmDialog } from '@/features/policies/components/PolicyConfirmDialog'
import { PolicyPublishSummary } from '@/features/policies/components/PolicyPublishSummary'
import { PolicyReadyToPublishBanner } from '@/features/policies/components/PolicyReadyToPublishBanner'
import { PolicyVersionCreateDialog } from '@/features/policies/components/PolicyVersionCreateDialog'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import {
  visiblePolicyActions,
  policyDeleteConfirmCopy,
  isReadyToPublish,
  POLICY_PUBLISH_CONFIRM,
  type PolicyUiAction,
} from '@/features/policies/policy-actions'
import type { PolicyLink, PolicyStatus } from '@/features/policies/types/policy.types'
import type { Permission } from '@/features/auth/types'

type Props = {
  policyId: string
  policyTitle: string
  policyReference?: string
  effectiveDate?: string | null
  links?: PolicyLink[]
  documentStatus: PolicyStatus
  workingStatus: PolicyStatus | null
  hasInProgress: boolean
  versions?: Array<{ status: PolicyStatus }>
  publishedMajor: number
  publishedMinor: number
  can: (permission: Permission) => boolean
  pending?: boolean
  onSubmit: () => Promise<void>
  onRequestChanges: (reason: string) => Promise<void>
  onApprove: () => Promise<void>
  onPublish: () => Promise<void>
  onArchive: () => Promise<void>
  onDelete: () => Promise<void>
  onCreateVersion: (bump: 'minor' | 'major', reusePreviousContent: boolean) => Promise<void>
  contentKind?: 'EDITOR' | 'UPLOAD'
}

export function PolicyWorkflowActions({
  policyId,
  policyTitle,
  policyReference,
  effectiveDate,
  links,
  documentStatus,
  workingStatus,
  hasInProgress,
  versions,
  publishedMajor,
  publishedMinor,
  can,
  pending,
  onSubmit,
  onRequestChanges,
  onApprove,
  onPublish,
  onArchive,
  onDelete,
  onCreateVersion,
  contentKind = 'EDITOR',
}: Props) {
  const actions = visiblePolicyActions({ documentStatus, workingStatus, hasInProgress, versions, can })
  const readyToPublish = isReadyToPublish({ documentStatus, workingStatus })
  const canPublish = actions.includes('publish')
  const [dialog, setDialog] = React.useState<PolicyUiAction | null>(null)
  const [reason, setReason] = React.useState('')
  const [bump, setBump] = React.useState<'minor' | 'major'>('minor')
  const [reusePreviousContent, setReusePreviousContent] = React.useState(true)

  const close = () => {
    setDialog(null)
    setReason('')
  }

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn()
      close()
    } catch {
      // Stay open; the page already showed the API error.
    }
  }

  const openPublish = () => setDialog('publish')
  const showActionRow = actions.some(action => action !== 'publish') || (canPublish && !readyToPublish)

  return (
    <div className="flex w-full flex-col gap-4">
      {readyToPublish ? (
        <PolicyReadyToPublishBanner canPublish={canPublish} pending={pending} onPublish={openPublish} />
      ) : null}

      <div
        className="flex flex-wrap items-center justify-end gap-2"
        data-testid="policy-workflow-actions"
        hidden={!showActionRow}
      >
        {actions.includes('edit') ? (
          <Button size="sm" variant="outline" asChild>
            <Link to={POLICY_PATHS.edit} params={{ policyId }}>
              Edit
            </Link>
          </Button>
        ) : null}
        {actions.includes('delete') ? (
          <Button size="sm" variant="outline" onClick={() => setDialog('delete')} disabled={pending}>
            Delete
          </Button>
        ) : null}
        {actions.includes('submit') ? (
          <Button size="sm" onClick={() => setDialog('submit')} disabled={pending}>
            Submit for review
          </Button>
        ) : null}
        {actions.includes('request_changes') ? (
          <Button size="sm" variant="outline" onClick={() => setDialog('request_changes')} disabled={pending}>
            Request changes
          </Button>
        ) : null}
        {actions.includes('approve') ? (
          <Button size="sm" onClick={() => setDialog('approve')} disabled={pending}>
            Approve
          </Button>
        ) : null}
        {canPublish && !readyToPublish ? (
          <Button size="sm" variant="success" onClick={openPublish} disabled={pending}>
            Publish policy
          </Button>
        ) : null}
        {actions.includes('create_version') ? (
          <Button size="sm" variant="outline" onClick={() => setDialog('create_version')} disabled={pending}>
            Create new version
          </Button>
        ) : null}
        {actions.includes('archive') ? (
          <Button size="sm" variant="outline" onClick={() => setDialog('archive')} disabled={pending}>
            Archive
          </Button>
        ) : null}
      </div>

      <PolicyConfirmDialog
        open={dialog === 'submit'}
        onOpenChange={open => !open && close()}
        title="Submit for review"
        description="Submit this policy for review?"
        confirmLabel="Submit"
        pending={pending}
        onConfirm={() => void run(onSubmit)}
      />
      <PolicyConfirmDialog
        open={dialog === 'request_changes'}
        onOpenChange={open => !open && close()}
        title="Request changes"
        description="Explain what needs to change before this policy can be approved."
        confirmLabel="Request changes"
        pending={pending}
        reasonLabel="Reason"
        reasonRequired
        reasonValue={reason}
        onReasonChange={setReason}
        onConfirm={() => void run(() => onRequestChanges(reason.trim()))}
      />
      <PolicyConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={open => !open && close()}
        title="Approve policy"
        description="Approve this policy version?"
        confirmLabel="Approve"
        pending={pending}
        onConfirm={() => void run(onApprove)}
      />
      <PolicyConfirmDialog
        open={dialog === 'publish'}
        onOpenChange={open => !open && close()}
        title={POLICY_PUBLISH_CONFIRM.title}
        description={POLICY_PUBLISH_CONFIRM.description}
        confirmLabel={POLICY_PUBLISH_CONFIRM.confirmLabel}
        confirmVariant="success"
        pending={pending}
        onConfirm={() => void run(onPublish)}
      >
        <PolicyPublishSummary
          title={policyTitle}
          reference={policyReference ?? ''}
          effectiveDate={effectiveDate}
          links={links}
        />
      </PolicyConfirmDialog>
      <PolicyConfirmDialog
        open={dialog === 'archive'}
        onOpenChange={open => !open && close()}
        title="Archive policy"
        description="Archive this policy? Staff will no longer receive it as a live document."
        confirmLabel="Archive"
        destructive
        pending={pending}
        onConfirm={() => void run(onArchive)}
      />
      <PolicyConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={open => !open && close()}
        title={policyDeleteConfirmCopy(policyTitle).title}
        description={policyDeleteConfirmCopy(policyTitle).description}
        confirmLabel={policyDeleteConfirmCopy(policyTitle).confirmLabel}
        destructive
        pending={pending}
        onConfirm={() => void run(onDelete)}
      />
      <PolicyVersionCreateDialog
        open={dialog === 'create_version'}
        onOpenChange={open => !open && close()}
        currentMajor={publishedMajor}
        currentMinor={publishedMinor}
        bump={bump}
        onBumpChange={setBump}
        contentKind={contentKind}
        reusePreviousContent={reusePreviousContent}
        onReusePreviousContentChange={setReusePreviousContent}
        pending={pending}
        onConfirm={() => void run(() => onCreateVersion(bump, reusePreviousContent))}
      />
    </div>
  )
}

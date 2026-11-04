import type { CarePlanInstance } from '@/features/service-users/care-plans/types'

export type CarePlanFooterAction = 'publish' | 'submit' | 'publish_approved'

const FOOTER_LABEL: Record<CarePlanFooterAction, string> = {
  publish: 'Publish Care Plan',
  submit: 'Submit for Approval',
  publish_approved: 'Publish Approved Plan',
}

function meaningful(values: Record<string, string | boolean> | null | undefined) {
  return Object.fromEntries(
    Object.entries(values ?? {})
      .filter(([, v]) => v !== '' && v != null)
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

/**
 * What the care plan editor shows for the working draft's approval state. With approval off and no
 * approval activity, everything is as before (plain Publish, no panel).
 */
export function carePlanApprovalView(instance: CarePlanInstance | null | undefined) {
  const required = instance?.carePlanApprovalRequired === true
  const approval = instance?.draft?.approval ?? null
  const status = approval?.status ?? 'DRAFT'
  const footerAction: CarePlanFooterAction = !required
    ? 'publish'
    : status === 'APPROVED'
      ? 'publish_approved'
      : 'submit'
  return {
    required,
    status,
    /** Pending approval: the draft cannot be edited. */
    locked: status === 'PENDING_APPROVAL',
    showPanel: required || status !== 'DRAFT' || Boolean(approval?.reason),
    footerAction,
    footerLabel: FOOTER_LABEL[footerAction],
    /** Editor values differ from the saved (approved) draft. */
    hasUnsavedChanges: (values: Record<string, string | boolean>) =>
      JSON.stringify(meaningful(values)) !== JSON.stringify(meaningful(instance?.draft?.values)),
  }
}

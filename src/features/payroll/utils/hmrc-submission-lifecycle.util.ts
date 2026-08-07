/** HMRC submission lifecycle for ops UI (T20). */

export type HmrcLifecycleStepId =
  | 'validated'
  | 'built'
  | 'pending_approval'
  | 'sent'
  | 'accepted'
  | 'rejected'

export type HmrcLifecycleStep = {
  id: HmrcLifecycleStepId
  label: string
  state: 'complete' | 'current' | 'upcoming' | 'error'
}

export function mapHmrcStatusToLifecycle(status: string): {
  stageLabel: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  canRetry: boolean
  isTerminalSuccess: boolean
  isTerminalFailure: boolean
} {
  switch (status) {
    case 'DRAFT_BUILT':
      return {
        stageLabel: 'Draft built',
        tone: 'success',
        canRetry: false,
        isTerminalSuccess: false,
        isTerminalFailure: false,
      }
    case 'PENDING_APPROVAL':
      return {
        stageLabel: 'Awaiting approval',
        tone: 'warning',
        canRetry: false,
        isTerminalSuccess: false,
        isTerminalFailure: false,
      }
    case 'SUBMITTED':
      return {
        stageLabel: 'Submitted',
        tone: 'warning',
        canRetry: false,
        isTerminalSuccess: false,
        isTerminalFailure: false,
      }
    case 'ACKNOWLEDGED':
      return {
        stageLabel: 'Acknowledged',
        tone: 'success',
        canRetry: false,
        isTerminalSuccess: true,
        isTerminalFailure: false,
      }
    case 'ACCEPTED':
      return {
        stageLabel: 'Accepted',
        tone: 'success',
        canRetry: false,
        isTerminalSuccess: true,
        isTerminalFailure: false,
      }
    case 'REJECTED':
    case 'REJECTED_APPROVAL':
    case 'ERROR':
      return {
        stageLabel: status === 'REJECTED_APPROVAL' ? 'Approval rejected' : 'Rejected / error',
        tone: 'danger',
        canRetry: true,
        isTerminalSuccess: false,
        isTerminalFailure: true,
      }
    default:
      return {
        stageLabel: status || 'Unknown',
        tone: 'neutral',
        canRetry: false,
        isTerminalSuccess: false,
        isTerminalFailure: false,
      }
  }
}

/**
 * Build a simple Draft → Sent → Accepted/Rejected strip for the latest attempt,
 * plus Validated from the parent FPS/EPS checks.
 */
export function buildHmrcLifecycleSteps(params: {
  isValidated: boolean
  latestStatus?: string | null
}): HmrcLifecycleStep[] {
  const status = params.latestStatus ?? null
  const meta = status ? mapHmrcStatusToLifecycle(status) : null

  const validated: HmrcLifecycleStep = {
    id: 'validated',
    label: 'Validated',
    state: params.isValidated ? 'complete' : 'current',
  }

  if (!status) {
    return [
      validated,
      { id: 'built', label: 'Draft', state: params.isValidated ? 'upcoming' : 'upcoming' },
      { id: 'sent', label: 'Sent', state: 'upcoming' },
      { id: 'accepted', label: 'Accepted', state: 'upcoming' },
    ]
  }

  if (status === 'DRAFT_BUILT') {
    return [
      { ...validated, state: 'complete' },
      { id: 'built', label: 'Draft', state: 'current' },
      { id: 'sent', label: 'Sent', state: 'upcoming' },
      { id: 'accepted', label: 'Accepted', state: 'upcoming' },
    ]
  }

  if (status === 'PENDING_APPROVAL') {
    return [
      { ...validated, state: 'complete' },
      { id: 'built', label: 'Draft', state: 'complete' },
      { id: 'pending_approval', label: 'Approval', state: 'current' },
      { id: 'sent', label: 'Sent', state: 'upcoming' },
      { id: 'accepted', label: 'Accepted', state: 'upcoming' },
    ]
  }

  if (status === 'SUBMITTED') {
    return [
      { ...validated, state: 'complete' },
      { id: 'built', label: 'Draft', state: 'complete' },
      { id: 'sent', label: 'Sent', state: 'current' },
      { id: 'accepted', label: 'Accepted', state: 'upcoming' },
    ]
  }

  if (meta?.isTerminalSuccess) {
    return [
      { ...validated, state: 'complete' },
      { id: 'built', label: 'Draft', state: 'complete' },
      { id: 'sent', label: 'Sent', state: 'complete' },
      { id: 'accepted', label: 'Accepted', state: 'complete' },
    ]
  }

  if (meta?.isTerminalFailure) {
    return [
      { ...validated, state: 'complete' },
      { id: 'built', label: 'Draft', state: 'complete' },
      { id: 'sent', label: 'Sent', state: 'complete' },
      { id: 'rejected', label: 'Rejected', state: 'error' },
    ]
  }

  return [
    validated,
    { id: 'built', label: 'Draft', state: 'upcoming' },
    { id: 'sent', label: 'Sent', state: 'upcoming' },
    { id: 'accepted', label: 'Accepted', state: 'upcoming' },
  ]
}

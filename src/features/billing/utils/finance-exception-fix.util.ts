/**
 * Maps finance exception codes to the admin page that fixes the underlying gap.
 * Used from visit reconciliation (and related billing UIs) so operators can jump
 * straight to missing funding / cards / visit data.
 */

export type FinanceExceptionFixTarget = {
  to: '/service-users/$serviceUserId' | '/employee/$employeeId/edit' | '/scheduling/visits/$jobId' | '/billing'
  params?: { serviceUserId?: string; employeeId?: string; jobId?: string }
  search?: { tab?: string }
  label: string
}

export function resolveFinanceExceptionFix(input: {
  code: string
  message?: string | null
  serviceUserId?: string | null
  employeeId?: string | null
  scheduledJobId?: string | null
}): FinanceExceptionFixTarget | null {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '_')
  const message = (input.message ?? '').toLowerCase()
  const serviceUserId = input.serviceUserId?.trim() || null
  const employeeId = input.employeeId?.trim() || null
  const scheduledJobId = input.scheduledJobId?.trim() || null

  if (
    code === 'FUNDING_SETUP_INCOMPLETE' ||
    code === 'PO_EXPIRED' ||
    code === 'PO_MISSING'
  ) {
    if (!serviceUserId) return null
    return {
      to: '/service-users/$serviceUserId',
      params: { serviceUserId },
      search: { tab: 'funding' },
      label: 'Open funding setup',
    }
  }

  if (code === 'CHARGE_CARD_MISSING') {
    if (!serviceUserId) return null
    return {
      to: '/service-users/$serviceUserId',
      params: { serviceUserId },
      search: { tab: 'charge-card' },
      label: 'Assign charge card',
    }
  }

  if (code === 'PAY_CARD_MISSING') {
    if (!employeeId) return null
    return {
      to: '/employee/$employeeId/edit',
      params: { employeeId },
      search: { tab: 'pay-card' },
      label: 'Assign pay card',
    }
  }

  if (code === 'RATE_MISSING') {
    if (message.includes('pay card') && employeeId) {
      return {
        to: '/employee/$employeeId/edit',
        params: { employeeId },
        search: { tab: 'pay-card' },
        label: 'Fix pay card rates',
      }
    }
    if (message.includes('charge card') && serviceUserId) {
      return {
        to: '/service-users/$serviceUserId',
        params: { serviceUserId },
        search: { tab: 'charge-card' },
        label: 'Fix charge card rates',
      }
    }
    // Ambiguous without message — prefer service-user charge card when available.
    if (serviceUserId) {
      return {
        to: '/service-users/$serviceUserId',
        params: { serviceUserId },
        search: { tab: 'charge-card' },
        label: 'Review charge card',
      }
    }
    if (employeeId) {
      return {
        to: '/employee/$employeeId/edit',
        params: { employeeId },
        search: { tab: 'pay-card' },
        label: 'Review pay card',
      }
    }
    return {
      to: '/billing',
      search: { tab: 'charge-cards' },
      label: 'Open charge cards',
    }
  }

  if (
    code === 'MISSING_CHECK_IN' ||
    code === 'MISSING_CHECK_OUT' ||
    code === 'TASKS_INCOMPLETE' ||
    code === 'OVERRUN' ||
    code === 'UNDERRUN' ||
    code === 'GPS_MISMATCH'
  ) {
    if (!scheduledJobId) return null
    return {
      to: '/scheduling/visits/$jobId',
      params: { jobId: scheduledJobId },
      label: 'Open visit workspace',
    }
  }

  return null
}

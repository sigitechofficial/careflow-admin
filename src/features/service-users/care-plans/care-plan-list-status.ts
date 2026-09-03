import type { CarePlanListStatus } from '@/features/service-users/api/service-users.api'
import {
  figmaQuickSelectIcon,
  type ServiceUserQuickSelectIconId,
} from '@/features/service-users/figma-action-icons'

export const CARE_PLAN_LIST_STATUS_TOOLTIP: Record<CarePlanListStatus, string> = {
  none: 'No Care Plan',
  ok: 'No care plan outstanding',
  due_within_week: 'Care plan review due within a week',
  overdue: 'Care plans outstanding',
}

const CARE_PLAN_LIST_STATUS_ICON: Record<CarePlanListStatus, ServiceUserQuickSelectIconId> = {
  none: 'care-none',
  ok: 'care-low',
  due_within_week: 'care-medium',
  overdue: 'care-high',
}

export function resolveCarePlanListStatus(
  status?: CarePlanListStatus | null,
): CarePlanListStatus {
  return status ?? 'none'
}

export function carePlanListStatusPresentation(status?: CarePlanListStatus | null): {
  status: CarePlanListStatus
  title: string
  src: string
} {
  const resolved = resolveCarePlanListStatus(status)
  return {
    status: resolved,
    title: CARE_PLAN_LIST_STATUS_TOOLTIP[resolved],
    src: figmaQuickSelectIcon(CARE_PLAN_LIST_STATUS_ICON[resolved]),
  }
}

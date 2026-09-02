import { describe, expect, it } from 'vitest'
import {
  carePlanListStatusPresentation,
  CARE_PLAN_LIST_STATUS_TOOLTIP,
  resolveCarePlanListStatus,
} from './care-plan-list-status'

describe('carePlanListStatusPresentation', () => {
  it('defaults missing status to grey No Care Plan', () => {
    expect(resolveCarePlanListStatus(undefined)).toBe('none')
    expect(carePlanListStatusPresentation(undefined)).toEqual({
      status: 'none',
      title: 'No Care Plan',
      src: '/care-plan-icons/quick-select/care-none.svg',
    })
  })

  it('maps all four list-icon states to colour and tooltip', () => {
    expect(carePlanListStatusPresentation('none').title).toBe(CARE_PLAN_LIST_STATUS_TOOLTIP.none)
    expect(carePlanListStatusPresentation('none').src).toContain('care-none.svg')

    expect(carePlanListStatusPresentation('ok')).toEqual({
      status: 'ok',
      title: 'No care plan outstanding',
      src: '/care-plan-icons/quick-select/care-low.svg',
    })

    expect(carePlanListStatusPresentation('due_within_week')).toEqual({
      status: 'due_within_week',
      title: 'Care plan review due within a week',
      src: '/care-plan-icons/quick-select/care-medium.svg',
    })

    expect(carePlanListStatusPresentation('overdue')).toEqual({
      status: 'overdue',
      title: 'Care plans outstanding',
      src: '/care-plan-icons/quick-select/care-high.svg',
    })
  })
})

import * as React from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import { schedulingKeys } from '@/features/scheduling/keys'
import {
  activateServiceUserVisitPlan,
  createServiceUserVisitPlan,
  endServiceUserVisitPlan,
  fetchActiveServiceUserVisitPlan,
  fetchServiceUserVisitPlans,
  fetchWorkingServiceUserVisitPlan,
  generateScheduleFromVisitPlan,
  prefillVisitPlanFromDomCare,
  suspendServiceUserVisitPlan,
  updateServiceUserVisitPlan,
} from '@/features/service-users/visit-plan/api'
import { fetchAcceptedCarePlans } from '@/features/service-users/initial-assessment/api'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import type { ServiceUserVisitPlan, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  parseWeeklyContractedHours,
  visitPlanWeeklyPlannedMinutes,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

export type VisitPlanContractContext = {
  contractedHours: number | null
  slots: VisitPlanSlot[]
  plannedMinutes: number
}

function mergePlanIntoList(list: ServiceUserVisitPlan[] | undefined, plan: ServiceUserVisitPlan) {
  const rows = Array.isArray(list) ? list : []
  const idx = rows.findIndex((p) => p.id === plan.id)
  if (idx < 0) return [plan, ...rows]
  const next = [...rows]
  next[idx] = plan
  return next
}

export function useServiceUserVisitPlans(serviceUserId: string) {
  return useQuery({
    queryKey: serviceUserKeys.visitPlans(serviceUserId),
    queryFn: () => fetchServiceUserVisitPlans(serviceUserId),
    enabled: Boolean(serviceUserId),
  })
}

export function useActiveServiceUserVisitPlan(serviceUserId: string) {
  return useQuery({
    queryKey: serviceUserKeys.visitPlanActive(serviceUserId),
    queryFn: () => fetchActiveServiceUserVisitPlan(serviceUserId),
    enabled: Boolean(serviceUserId),
  })
}

export function useVisitPlanContractByServiceUser(serviceUserIds: string[]) {
  const uniqueIds = [...new Set(serviceUserIds.filter(Boolean))]
  const queries = useQueries({
    queries: uniqueIds.map((serviceUserId) => ({
      queryKey: serviceUserKeys.visitPlanWorking(serviceUserId),
      queryFn: () => fetchWorkingServiceUserVisitPlan(serviceUserId),
      enabled: Boolean(serviceUserId),
      staleTime: 60_000,
    })),
  })

  return React.useMemo(() => {
    const map = new Map<string, VisitPlanContractContext>()
    for (const query of queries) {
      const plan = query.data
      if (!plan) continue
      const slots = plan.slots ?? []
      map.set(plan.serviceUserId, {
        contractedHours: parseWeeklyContractedHours(plan.weeklyContractedHours),
        slots,
        plannedMinutes: visitPlanWeeklyPlannedMinutes(slots),
      })
    }
    return map
  }, [queries])
}

export function useVisitPlanContractedHoursByServiceUser(serviceUserIds: string[]) {
  const contractByServiceUser = useVisitPlanContractByServiceUser(serviceUserIds)
  return React.useMemo(() => {
    const map = new Map<string, number>()
    for (const [serviceUserId, context] of contractByServiceUser) {
      if (context.contractedHours != null) map.set(serviceUserId, context.contractedHours)
    }
    return map
  }, [contractByServiceUser])
}

export function useAcceptedCarePlansByServiceUser(serviceUserIds: string[]) {
  const uniqueIds = [...new Set(serviceUserIds.filter(Boolean))]
  const queries = useQueries({
    queries: uniqueIds.map((serviceUserId) => ({
      queryKey: initialAssessmentKeys.acceptedCarePlans(serviceUserId),
      queryFn: () => fetchAcceptedCarePlans(serviceUserId),
      enabled: Boolean(serviceUserId),
      staleTime: 60_000,
    })),
  })

  return React.useMemo(() => {
    const map = new Map<string, AcceptedCarePlanItem[]>()
    for (let i = 0; i < uniqueIds.length; i++) {
      const serviceUserId = uniqueIds[i]!
      const items = queries[i]?.data?.items
      if (items?.length) map.set(serviceUserId, items)
    }
    return map
  }, [queries, uniqueIds])
}

export function useServiceUserVisitPlanMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
    void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlanActive(serviceUserId) })
    void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlanWorking(serviceUserId) })
  }

  const create = useMutation({
    mutationFn: (body: Parameters<typeof createServiceUserVisitPlan>[1]) =>
      createServiceUserVisitPlan(serviceUserId, body),
    onSuccess: (plan: ServiceUserVisitPlan) => {
      qc.setQueryData(serviceUserKeys.visitPlans(serviceUserId), (old: ServiceUserVisitPlan[] | undefined) =>
        mergePlanIntoList(old, plan),
      )
      invalidate()
    },
  })

  const update = useMutation({
    mutationFn: ({ planId, ...body }: Parameters<typeof updateServiceUserVisitPlan>[2] & { planId: string }) =>
      updateServiceUserVisitPlan(serviceUserId, planId, body),
    onSuccess: (plan: ServiceUserVisitPlan) => {
      qc.setQueryData(serviceUserKeys.visitPlans(serviceUserId), (old: ServiceUserVisitPlan[] | undefined) =>
        mergePlanIntoList(old, plan),
      )
      if (plan.status === 'ACTIVE') {
        qc.setQueryData(serviceUserKeys.visitPlanActive(serviceUserId), plan)
      }
      invalidate()
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })

  const activate = useMutation({
    mutationFn: (planId: string) => activateServiceUserVisitPlan(serviceUserId, planId),
    onSuccess: invalidate,
  })

  const suspend = useMutation({
    mutationFn: ({
      planId,
      reason,
      cancelFutureVisits,
    }: {
      planId: string
      reason: string
      cancelFutureVisits?: boolean
    }) => suspendServiceUserVisitPlan(serviceUserId, planId, reason, cancelFutureVisits),
    onSuccess: () => {
      invalidate()
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })

  const end = useMutation({
    mutationFn: ({
      planId,
      reason,
      cancelFutureVisits,
    }: {
      planId: string
      reason: string
      cancelFutureVisits?: boolean
    }) => endServiceUserVisitPlan(serviceUserId, planId, reason, cancelFutureVisits),
    onSuccess: () => {
      invalidate()
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })

  const prefillDomCare = useMutation({
    mutationFn: (planId: string) => prefillVisitPlanFromDomCare(serviceUserId, planId),
    onSuccess: invalidate,
  })

  const generateSchedule = useMutation({
    mutationFn: ({
      planId,
      ...body
    }: { planId: string; fromDate: string; toDate: string; scheduleAreaId?: string | null; backfillDays?: number }) =>
      generateScheduleFromVisitPlan(serviceUserId, planId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })

  return { create, update, activate, suspend, end, prefillDomCare, generateSchedule }
}

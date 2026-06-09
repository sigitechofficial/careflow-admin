import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  activateServiceUserVisitPlan,
  createServiceUserVisitPlan,
  fetchActiveServiceUserVisitPlan,
  fetchServiceUserVisitPlans,
  generateScheduleFromVisitPlan,
  prefillVisitPlanFromDomCare,
  updateServiceUserVisitPlan,
} from '@/features/service-users/visit-plan/api'
import type { ServiceUserVisitPlan } from '@/features/service-users/visit-plan/types'

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

export function useServiceUserVisitPlanMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
    void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlanActive(serviceUserId) })
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
    },
  })

  const activate = useMutation({
    mutationFn: (planId: string) => activateServiceUserVisitPlan(serviceUserId, planId),
    onSuccess: invalidate,
  })

  const prefillDomCare = useMutation({
    mutationFn: (planId: string) => prefillVisitPlanFromDomCare(serviceUserId, planId),
    onSuccess: invalidate,
  })

  const generateSchedule = useMutation({
    mutationFn: ({
      planId,
      ...body
    }: { planId: string; fromDate: string; toDate: string; scheduleAreaId?: string | null }) =>
      generateScheduleFromVisitPlan(serviceUserId, planId, body),
  })

  return { create, update, activate, prefillDomCare, generateSchedule }
}

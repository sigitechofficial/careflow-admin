import { useQuery } from '@tanstack/react-query'
import {
  fetchCarerTimebankDetail,
  fetchCarerTimebankList,
  fetchJobTimebank,
  fetchTimebankBalance,
  fetchTimebankDetail,
  fetchTimebankList,
  type CarerTimebankListParams,
  type TimebankListParams,
} from '@/features/timebank/api/timebank.api'

export const timebankKeys = {
  all: ['timebank'] as const,
  list: (params: TimebankListParams) => [...timebankKeys.all, 'list', params] as const,
  detail: (serviceUserId: string, weekStart?: string) =>
    [...timebankKeys.all, 'detail', serviceUserId, weekStart ?? null] as const,
  carerList: (params: CarerTimebankListParams) => [...timebankKeys.all, 'carer-list', params] as const,
  carerDetail: (employeeId: string) => [...timebankKeys.all, 'carer-detail', employeeId] as const,
  balance: (serviceUserId: string) => [...timebankKeys.all, 'balance', serviceUserId] as const,
  job: (scheduledJobId: string) => [...timebankKeys.all, 'job', scheduledJobId] as const,
}

/** One service user's timebank: earned, held by visits, available (and whether it is used automatically). */
export function useTimebankBalance(serviceUserId: string | null | undefined) {
  return useQuery({
    queryKey: timebankKeys.balance(serviceUserId ?? ''),
    queryFn: () => fetchTimebankBalance(serviceUserId!),
    enabled: Boolean(serviceUserId),
  })
}

/** Hours one rota visit took from the timebank, and gave back (visit workspace). */
export function useJobTimebank(scheduledJobId: string | null | undefined) {
  return useQuery({
    queryKey: timebankKeys.job(scheduledJobId ?? ''),
    queryFn: () => fetchJobTimebank(scheduledJobId!),
    enabled: Boolean(scheduledJobId),
  })
}

export function useTimebankList(params: TimebankListParams, enabled = true) {
  return useQuery({
    queryKey: timebankKeys.list(params),
    queryFn: () => fetchTimebankList(params),
    enabled,
    placeholderData: previous => previous,
  })
}

export function useTimebankDetail(serviceUserId: string, weekStart?: string) {
  return useQuery({
    queryKey: timebankKeys.detail(serviceUserId, weekStart),
    queryFn: () => fetchTimebankDetail(serviceUserId, weekStart),
    enabled: Boolean(serviceUserId),
    placeholderData: previous => previous,
  })
}

export function useCarerTimebankList(params: CarerTimebankListParams, enabled = true) {
  return useQuery({
    queryKey: timebankKeys.carerList(params),
    queryFn: () => fetchCarerTimebankList(params),
    enabled,
    placeholderData: previous => previous,
  })
}

export function useCarerTimebankDetail(employeeId: string) {
  return useQuery({
    queryKey: timebankKeys.carerDetail(employeeId),
    queryFn: () => fetchCarerTimebankDetail(employeeId),
    enabled: Boolean(employeeId),
  })
}

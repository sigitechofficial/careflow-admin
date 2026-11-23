import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchCqcDashboard, fetchCqcReports } from './api'

export const cqcDashboardKeys = {
  all: () => ['cqc-dashboard'] as const,
  dashboard: (p: { locationId?: string }) => [...cqcDashboardKeys.all(), 'dashboard', p] as const,
  reports: (p: { locationId?: string; months?: number }) => [...cqcDashboardKeys.all(), 'reports', p] as const,
}

export function useCqcDashboard(p: { locationId?: string }) {
  return useQuery({ queryKey: cqcDashboardKeys.dashboard(p), queryFn: () => fetchCqcDashboard(p), placeholderData: keepPreviousData })
}

export function useCqcReports(p: { locationId?: string; months?: number }) {
  return useQuery({ queryKey: cqcDashboardKeys.reports(p), queryFn: () => fetchCqcReports(p), placeholderData: keepPreviousData })
}

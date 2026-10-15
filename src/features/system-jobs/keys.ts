import type { RunStatusFilter } from '@/features/system-jobs/types'

export const systemJobsKeys = {
  all: ['system-jobs'] as const,
  list: () => [...systemJobsKeys.all, 'list'] as const,
  runsRoot: (name: string) => [...systemJobsKeys.all, 'runs', name] as const,
  runs: (name: string, status: RunStatusFilter, limit: number) =>
    [...systemJobsKeys.runsRoot(name), status, limit] as const,
}

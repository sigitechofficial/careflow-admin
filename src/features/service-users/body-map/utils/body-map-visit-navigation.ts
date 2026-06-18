export type BodyMapVisitSearch = {
  from?: 'schedule-visit' | 'initial-assessment'
  scheduledJobId?: string
  scheduledVisitId?: string
  returnTo?: string
  submissionId?: string
}

export function scheduleVisitBodyMapSearch(params: {
  scheduledJobId: string
  scheduledVisitId?: string
  returnTo?: string
}): BodyMapVisitSearch {
  return {
    from: 'schedule-visit',
    scheduledJobId: params.scheduledJobId,
    ...(params.scheduledVisitId ? { scheduledVisitId: params.scheduledVisitId } : {}),
    ...(params.returnTo ? { returnTo: params.returnTo } : {}),
  }
}

export function parseBodyMapVisitSearch(
  search: Record<string, unknown> | BodyMapVisitSearch,
): BodyMapVisitSearch {
  return {
    from: search.from === 'schedule-visit' ? 'schedule-visit' : search.from === 'initial-assessment' ? 'initial-assessment' : undefined,
    scheduledJobId: typeof search.scheduledJobId === 'string' ? search.scheduledJobId : undefined,
    scheduledVisitId: typeof search.scheduledVisitId === 'string' ? search.scheduledVisitId : undefined,
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
    submissionId: typeof search.submissionId === 'string' ? search.submissionId : undefined,
  }
}

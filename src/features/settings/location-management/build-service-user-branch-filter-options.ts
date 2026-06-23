import type { ScheduleAreaRow } from '@/features/scheduling/types/scheduling.types'
import { formatServiceUserBranchLabel } from './format-service-user-branch-label'

export type ServiceUserBranchSummary = {
  locationId: string
  locationName?: string | null
  zoneName?: string | null
  branchName?: string | null
  branchLayers?: string[]
  displayLabel?: string | null
  totalCount: number
}

export type BranchFilterOption = {
  id: string
  label: string
  count: number
  displayLabel: string
}

type BranchLabelInput = {
  locationId?: string | null
  locationName?: string | null
  zoneName?: string | null
  branchName?: string | null
  branchLayers?: string[] | null
  displayLabel?: string | null
}

export function formatBranchFilterLabel(input: BranchLabelInput, count: number): string {
  return `${formatServiceUserBranchLabel(input)} (${count})`
}

export function buildServiceUserBranchFilterOptions(params: {
  scheduleAreas: ScheduleAreaRow[]
  zones?: Array<{ name: string; branches: Array<{ id: string; name: string }> }>
  summariesByLocationId: Map<string, ServiceUserBranchSummary>
}): BranchFilterOption[] {
  const { scheduleAreas, zones = [], summariesByLocationId } = params
  const options: BranchFilterOption[] = []
  const seen = new Set<string>()

  const pushOption = (locationId: string, labelInput: BranchLabelInput, count: number) => {
    options.push({
      id: locationId,
      label: formatBranchFilterLabel(labelInput, count),
      count,
      displayLabel: formatServiceUserBranchLabel(labelInput),
    })
  }

  for (const area of scheduleAreas) {
    const locId = area.location?.id
    if (!locId) continue
    seen.add(locId)
    const row = summariesByLocationId.get(locId)
    pushOption(locId, {
      displayLabel: row?.displayLabel,
      locationId: locId,
      locationName: row?.locationName ?? area.location?.name,
      zoneName: row?.zoneName ?? area.zone?.name,
      branchName: row?.branchName ?? area.name,
      branchLayers: row?.branchLayers,
    }, row?.totalCount ?? 0)
  }

  for (const zone of zones) {
    for (const branch of zone.branches) {
      if (seen.has(branch.id)) continue
      seen.add(branch.id)
      const row = summariesByLocationId.get(branch.id)
      pushOption(branch.id, {
        displayLabel: row?.displayLabel,
        locationId: branch.id,
        locationName: row?.locationName ?? branch.name,
        zoneName: row?.zoneName ?? zone.name,
        branchName: row?.branchName ?? branch.name,
        branchLayers: row?.branchLayers,
      }, row?.totalCount ?? 0)
    }
  }

  for (const row of summariesByLocationId.values()) {
    if (seen.has(row.locationId)) continue
    seen.add(row.locationId)
    pushOption(row.locationId, {
      displayLabel: row.displayLabel,
      locationId: row.locationId,
      locationName: row.locationName,
      zoneName: row.zoneName,
      branchName: row.branchName,
      branchLayers: row.branchLayers,
    }, row.totalCount)
  }

  return options.sort((a, b) => {
    const aHas = a.count > 0
    const bHas = b.count > 0
    if (aHas !== bHas) return aHas ? -1 : 1
    if (a.count !== b.count) return b.count - a.count
    return a.displayLabel.localeCompare(b.displayLabel)
  })
}

export function buildBranchSummariesFromTimelineJobs(
  jobs: Array<{
    serviceUser: {
      locationId?: string | null
      location?: { id: string; name: string } | null
      zoneName?: string | null
      branchName?: string | null
      branchLayers?: string[]
      displayLabel?: string | null
    }
    scheduleArea?: { locationId?: string | null } | null
  }>,
  resolveLocationIds: (job: {
    serviceUser: { locationId?: string | null }
    scheduleArea?: { locationId?: string | null } | null
  }) => string[] = defaultResolveTimelineJobLocationIds,
): Map<string, ServiceUserBranchSummary> {
  const countById = new Map<string, number>()
  const metaById = new Map<string, Omit<ServiceUserBranchSummary, 'totalCount'>>()

  for (const job of jobs) {
    for (const locationId of resolveLocationIds(job)) {
      countById.set(locationId, (countById.get(locationId) ?? 0) + 1)
      if (!metaById.has(locationId)) {
        metaById.set(locationId, {
          locationId,
          locationName: job.serviceUser.location?.name ?? null,
          zoneName: job.serviceUser.zoneName ?? null,
          branchName: job.serviceUser.branchName ?? null,
          branchLayers: job.serviceUser.branchLayers ?? [],
          displayLabel: job.serviceUser.displayLabel ?? null,
        })
      }
    }
  }

  const summaries = new Map<string, ServiceUserBranchSummary>()
  for (const [locationId, totalCount] of countById) {
    const meta = metaById.get(locationId)
    if (!meta) continue
    summaries.set(locationId, { ...meta, totalCount })
  }
  return summaries
}

function defaultResolveTimelineJobLocationIds(job: {
  serviceUser: { locationId?: string | null }
  scheduleArea?: { locationId?: string | null } | null
}): string[] {
  const ids: string[] = []
  const serviceUserLocationId = job.serviceUser.locationId
  const scheduleAreaLocationId = job.scheduleArea?.locationId ?? null
  if (serviceUserLocationId) ids.push(serviceUserLocationId)
  if (scheduleAreaLocationId && scheduleAreaLocationId !== serviceUserLocationId) {
    ids.push(scheduleAreaLocationId)
  }
  return ids
}

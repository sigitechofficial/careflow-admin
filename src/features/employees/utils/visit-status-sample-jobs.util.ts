import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { assessVisitDeliveryFromJobLike } from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { DEFAULT_ADMINISTRATION_ROUNDS } from '@/features/service-users/medication/medication-time-slots'

export const VISIT_STATUS_SAMPLE_ID_PREFIX = 'verify-sample-'

export function isVisitStatusSampleJob(job: Pick<TimelineJob, 'id'>): boolean {
  return job.id.startsWith(VISIT_STATUS_SAMPLE_ID_PREFIX)
}

type SampleDef = {
  id: string
  label: string
  dayOffset: number
  /** Index into DEFAULT_ADMINISTRATION_ROUNDS (lookup time slots). */
  roundIndex: number
  jobStatus: string
  visitStatus: string
  /** Override planned duration; default 60. Use <30 for planned-short samples. */
  plannedMinutes?: number
  /** Minutes after planned start for actual start; null = no actual. */
  actualStartOffsetMin: number | null
  /** Minutes after actual start for duration; null = no checkout. */
  actualDurationMin: number | null
  allocated: boolean
  hasVisitPlanSlot?: boolean
  enRoute?: boolean
  timeCritical?: boolean
}

/**
 * One synthetic visit per major lifecycle / timing / duration code for UI verification.
 * Slot labels/codes come from DEFAULT_ADMINISTRATION_ROUNDS (same lookup as visit plan / MAR).
 */
const SAMPLE_DEFS: SampleDef[] = [
  {
    id: 'scheduled',
    label: 'Sample · Scheduled',
    dayOffset: 20,
    roundIndex: 0,
    jobStatus: 'UNALLOCATED',
    visitStatus: 'PLANNED',
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: false,
  },
  {
    id: 'assigned',
    label: 'Sample · Assigned',
    dayOffset: 21,
    roundIndex: 1,
    jobStatus: 'ALLOCATED',
    visitStatus: 'PLANNED',
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'en-route',
    label: 'Sample · En route',
    dayOffset: 10,
    roundIndex: 2,
    jobStatus: 'ALLOCATED',
    visitStatus: 'PLANNED',
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: true,
    enRoute: true,
  },
  {
    id: 'in-progress',
    label: 'Sample · In progress',
    dayOffset: 9,
    roundIndex: 3,
    jobStatus: 'IN_PROGRESS',
    visitStatus: 'STARTED',
    actualStartOffsetMin: 2,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'on-time',
    label: 'Sample · On time',
    dayOffset: 2,
    roundIndex: 0,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 5,
    actualDurationMin: 60,
    allocated: true,
  },
  {
    id: 'early-arrival',
    label: 'Sample · Early arrival',
    dayOffset: 3,
    roundIndex: 1,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: -25,
    actualDurationMin: 60,
    allocated: true,
  },
  {
    id: 'late-start',
    label: 'Sample · Late start',
    dayOffset: 4,
    roundIndex: 2,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 22,
    actualDurationMin: 60,
    allocated: true,
  },
  {
    id: 'critically-late',
    label: 'Sample · Critically late',
    dayOffset: 5,
    roundIndex: 3,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 45,
    actualDurationMin: 60,
    allocated: true,
  },
  {
    id: 'completed',
    label: 'Sample · Completed',
    dayOffset: 1,
    roundIndex: 4,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    plannedMinutes: 45,
    actualStartOffsetMin: 0,
    actualDurationMin: 45,
    allocated: true,
  },
  {
    id: 'partial',
    label: 'Sample · Partially completed',
    dayOffset: 6,
    roundIndex: 0,
    jobStatus: 'PARTIALLY_COMPLETED',
    visitStatus: 'PARTIALLY_COMPLETED',
    actualStartOffsetMin: 0,
    actualDurationMin: 40,
    allocated: true,
  },
  {
    id: 'missed',
    label: 'Sample · Missed',
    dayOffset: 7,
    roundIndex: 1,
    jobStatus: 'MISSED',
    visitStatus: 'MISSED',
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'cancelled',
    label: 'Sample · Cancelled',
    dayOffset: 8,
    roundIndex: 2,
    jobStatus: 'CANCELLED',
    visitStatus: 'CANCELLED',
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'called-off',
    label: 'Sample · Called off',
    dayOffset: 11,
    roundIndex: 3,
    jobStatus: 'CALLED_OFF',
    visitStatus: 'CALLED_OFF',
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'unplanned',
    label: 'Sample · Unplanned visit',
    dayOffset: 12,
    roundIndex: 4,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 0,
    actualDurationMin: 55,
    allocated: true,
    hasVisitPlanSlot: false,
  },
  {
    id: 'needs-attention',
    label: 'Sample · Needs attention',
    dayOffset: 13,
    roundIndex: 0,
    jobStatus: 'NEEDS_ATTENTION',
    visitStatus: 'NEEDS_ATTENTION',
    actualStartOffsetMin: 10,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'planned-short',
    label: 'Sample · Planned short visit',
    dayOffset: 14,
    roundIndex: 0,
    jobStatus: 'ALLOCATED',
    visitStatus: 'PLANNED',
    plannedMinutes: 20,
    actualStartOffsetMin: null,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'actual-short',
    label: 'Sample · Actual short visit',
    dayOffset: 15,
    roundIndex: 1,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 0,
    actualDurationMin: 30,
    allocated: true,
  },
  {
    id: 'early-end',
    label: 'Sample · Early end',
    dayOffset: 16,
    roundIndex: 2,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: -10,
    actualDurationMin: 45,
    allocated: true,
  },
  {
    id: 'late-end',
    label: 'Sample · Late end',
    dayOffset: 22,
    roundIndex: 0,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    // Late start + same duration → late end without duration overrun.
    actualStartOffsetMin: 20,
    actualDurationMin: 60,
    allocated: true,
  },
  {
    id: 'overrun',
    label: 'Sample · Overrun',
    dayOffset: 17,
    roundIndex: 3,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 0,
    actualDurationMin: 90,
    allocated: true,
  },
  {
    id: 'abnormally-long-open',
    label: 'Sample · Abnormally long open',
    dayOffset: 0,
    roundIndex: 0,
    jobStatus: 'IN_PROGRESS',
    visitStatus: 'STARTED',
    plannedMinutes: 45,
    actualStartOffsetMin: 0,
    actualDurationMin: null,
    allocated: true,
  },
  {
    id: 'zero-duration',
    label: 'Sample · Zero-duration',
    dayOffset: 18,
    roundIndex: 1,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 0,
    actualDurationMin: 0,
    allocated: true,
  },
  {
    id: 'invalid-duration',
    label: 'Sample · Invalid duration',
    dayOffset: 19,
    roundIndex: 2,
    jobStatus: 'COMPLETED',
    visitStatus: 'COMPLETED',
    actualStartOffsetMin: 60,
    actualDurationMin: -30,
    allocated: true,
  },
]

const SAMPLE_SERVICE_USERS = [
  { firstName: 'Margaret', lastName: 'Clarke', number: 'SU-SAMPLE-01' },
  { firstName: 'Arthur', lastName: 'Bennett', number: 'SU-SAMPLE-02' },
  { firstName: 'Dorothy', lastName: 'Hughes', number: 'SU-SAMPLE-03' },
  { firstName: 'Harold', lastName: 'Patel', number: 'SU-SAMPLE-04' },
  { firstName: 'Irene', lastName: 'Walsh', number: 'SU-SAMPLE-05' },
  { firstName: 'Stanley', lastName: 'Ng', number: 'SU-SAMPLE-06' },
  { firstName: 'Barbara', lastName: 'Okonkwo', number: 'SU-SAMPLE-07' },
  { firstName: 'Frank', lastName: 'Murphy', number: 'SU-SAMPLE-08' },
] as const

function isoAt(year: number, monthIndex: number, day: number, hour: number, minute = 0): string {
  const safeDay = Math.min(Math.max(day, 1), 28)
  return new Date(Date.UTC(year, monthIndex, safeDay, hour, minute, 0, 0)).toISOString()
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

function resolveSampleRound(roundIndex: number) {
  const rounds = DEFAULT_ADMINISTRATION_ROUNDS
  const round = rounds[((roundIndex % rounds.length) + rounds.length) % rounds.length]!
  const [hour, minute] = round.time.split(':').map(Number)
  return {
    code: round.code,
    name: round.name,
    hour: Number.isFinite(hour) ? (hour as number) : 8,
    minute: Number.isFinite(minute) ? (minute as number) : 0,
  }
}

export function buildVisitStatusSampleJobs(month: string, employeeId: string): TimelineJob[] {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return []
  const monthIndex = m - 1

  return SAMPLE_DEFS.map((def, index) => {
    const round = resolveSampleRound(def.roundIndex)
    const plannedMinutes = def.plannedMinutes ?? 60
    const plannedStart = isoAt(y, monthIndex, def.dayOffset || 1, round.hour, round.minute)
    const plannedEnd = addMinutes(plannedStart, plannedMinutes)
    const actualStart =
      def.actualStartOffsetMin == null
        ? null
        : addMinutes(plannedStart, def.actualStartOffsetMin)
    const actualEnd =
      actualStart == null || def.actualDurationMin == null
        ? null
        : addMinutes(actualStart, def.actualDurationMin)

    const scenarioLabel = def.label.replace(/^Sample · /, '')
    const su = SAMPLE_SERVICE_USERS[index % SAMPLE_SERVICE_USERS.length]!

    const visitPlan =
      def.hasVisitPlanSlot === false
        ? null
        : {
            slotId: `sample-slot-${def.id}`,
            slotCode: round.code,
            medicationRoundCode: round.code,
            label: round.name,
            linkedCarePlanFormIds: [] as string[],
            timeCritical: def.timeCritical ?? false,
            timeToleranceMinutes: def.timeCritical ? 5 : undefined,
          }

    const job: TimelineJob = {
      id: `${VISIT_STATUS_SAMPLE_ID_PREFIX}${def.id}`,
      jobName: `${round.name} — ${su.firstName}`,
      status: def.jobStatus,
      serviceUserId: `verify-sample-su-${su.number}`,
      serviceUser: {
        id: `verify-sample-su-${su.number}`,
        firstName: su.firstName,
        lastName: su.lastName,
        preferredName: null,
        serviceUserNumber: su.number,
      },
      scheduledStartDateTime: plannedStart,
      scheduledEndDateTime: plannedEnd,
      durationMinutes: plannedMinutes,
      requiredCarers: 1,
      allocatedCarers: def.allocated ? 1 : 0,
      visitPlan,
      visits: [
        {
          id: `${VISIT_STATUS_SAMPLE_ID_PREFIX}visit-${def.id}`,
          visitName: round.name,
          visitPlanSlotId: visitPlan?.slotId ?? null,
          status: def.visitStatus,
          scheduledStartDateTime: plannedStart,
          scheduledEndDateTime: plannedEnd,
          actualStartDateTime: actualStart,
          actualEndDateTime: actualEnd,
        },
      ],
      actualStartDateTime: actualStart,
      actualEndDateTime: actualEnd,
      allocations: def.allocated
        ? [
            {
              id: `${VISIT_STATUS_SAMPLE_ID_PREFIX}alloc-${def.id}`,
              employeeId,
              status: 'ALLOCATED',
              employee: {
                id: employeeId,
                firstName: 'Sample',
                lastName: 'Carer',
              },
            },
          ]
        : [],
      address: '12 Sample Lane, Verification Town',
      postcode: 'SA1 1AA',
      notes: `Verification sample · ${scenarioLabel}`,
    }

    const assessment = assessVisitDeliveryFromJobLike({
      status: job.status,
      requiredCarers: job.requiredCarers,
      allocatedCarers: job.allocatedCarers,
      allocations: job.allocations,
      scheduledStartDateTime: job.scheduledStartDateTime,
      scheduledEndDateTime: job.scheduledEndDateTime,
      actualStartDateTime: job.actualStartDateTime,
      actualEndDateTime: job.actualEndDateTime,
      visitPlan: job.visitPlan,
      visits: job.visits,
      latestAttendanceEventType: def.enRoute ? 'EN_ROUTE' : null,
      now:
        def.id === 'abnormally-long-open'
          ? new Date(addMinutes(plannedEnd, 90))
          : undefined,
    })

    return {
      ...job,
      deliveryAssessment: assessment,
    }
  })
}

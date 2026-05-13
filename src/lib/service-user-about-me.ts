import type { ServiceUserDetailReference, ServiceUserReferenceItemPayload } from '@/lib/service-users-api'

/** Single JSON blob on `ServiceUserReference` — preserved when saving other reference groups. */
export const ABOUT_ME_REF_TYPE = 'SU_ABOUT_ME_V1' as const

export const ROUTINE_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
export type RoutineDay = (typeof ROUTINE_DAYS)[number]

export const ROUTINE_SLOTS = ['getUp', 'breakfast', 'lunch', 'afternoon', 'teaTime', 'bedtime'] as const
export type RoutineSlot = (typeof ROUTINE_SLOTS)[number]

export const ROUTINE_DAY_LABEL: Record<RoutineDay, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
}

export const ROUTINE_SLOT_LABEL: Record<RoutineSlot, string> = {
  getUp: 'Get up',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  teaTime: 'Tea time',
  bedtime: 'Bedtime',
}

export type AboutMeV1 = {
  version: 1
  whatIsMostImportantToMe: string
  peopleImportantToMe: string
  externalAboutMeUrl: string
  howICommunicate: string
  myWellness: string
  whatMakesAGoodDay: string
  whatMakesMeHappy: string
  whatMakesMeUnhappy: string
  whatMakesABadDay: string
  howAndWhenToSupportMe: string
  alsoWorthKnowing: string
  supportedToWriteThisBy: string
  hobbiesAndInterests: string
  religiousSpiritualPreferences: string
  whereIAmFrom: string
  whatILikeToTalkAbout: string
  familyAndFriends: string
  myChildhood: string
  myEducation: string
  myOccupation: string
  myAdulthood: string
  lifeHistoryFavourites: string
  personalHygiene: string
  domesticSupport: string
  shoppingArrangements: string
  nightSupport: string
  supportOther: string
  foodDrinksLike: string
  foodDrinksDontLike: string
  favouriteItems: string
  tvProgrammes: string
  favouriteActivities: string
  favouriteRooms: string
  favouriteOther: string
  identificationCharacteristics: string
  routine: Record<RoutineDay, Record<RoutineSlot, string>>
}

const STRING_KEYS = [
  'whatIsMostImportantToMe',
  'peopleImportantToMe',
  'externalAboutMeUrl',
  'howICommunicate',
  'myWellness',
  'whatMakesAGoodDay',
  'whatMakesMeHappy',
  'whatMakesMeUnhappy',
  'whatMakesABadDay',
  'howAndWhenToSupportMe',
  'alsoWorthKnowing',
  'supportedToWriteThisBy',
  'hobbiesAndInterests',
  'religiousSpiritualPreferences',
  'whereIAmFrom',
  'whatILikeToTalkAbout',
  'familyAndFriends',
  'myChildhood',
  'myEducation',
  'myOccupation',
  'myAdulthood',
  'lifeHistoryFavourites',
  'personalHygiene',
  'domesticSupport',
  'shoppingArrangements',
  'nightSupport',
  'supportOther',
  'foodDrinksLike',
  'foodDrinksDontLike',
  'favouriteItems',
  'tvProgrammes',
  'favouriteActivities',
  'favouriteRooms',
  'favouriteOther',
  'identificationCharacteristics',
] as const satisfies ReadonlyArray<keyof Omit<AboutMeV1, 'version' | 'routine'>>

function emptyRoutine(): AboutMeV1['routine'] {
  const routine = {} as AboutMeV1['routine']
  for (const d of ROUTINE_DAYS) {
    const row = {} as Record<RoutineSlot, string>
    for (const s of ROUTINE_SLOTS) row[s] = ''
    routine[d] = row
  }
  return routine
}

export function defaultAboutMe(): AboutMeV1 {
  return {
    version: 1,
    whatIsMostImportantToMe: '',
    peopleImportantToMe: '',
    externalAboutMeUrl: '',
    howICommunicate: '',
    myWellness: '',
    whatMakesAGoodDay: '',
    whatMakesMeHappy: '',
    whatMakesMeUnhappy: '',
    whatMakesABadDay: '',
    howAndWhenToSupportMe: '',
    alsoWorthKnowing: '',
    supportedToWriteThisBy: '',
    hobbiesAndInterests: '',
    religiousSpiritualPreferences: '',
    whereIAmFrom: '',
    whatILikeToTalkAbout: '',
    familyAndFriends: '',
    myChildhood: '',
    myEducation: '',
    myOccupation: '',
    myAdulthood: '',
    lifeHistoryFavourites: '',
    personalHygiene: '',
    domesticSupport: '',
    shoppingArrangements: '',
    nightSupport: '',
    supportOther: '',
    foodDrinksLike: '',
    foodDrinksDontLike: '',
    favouriteItems: '',
    tvProgrammes: '',
    favouriteActivities: '',
    favouriteRooms: '',
    favouriteOther: '',
    identificationCharacteristics: '',
    routine: emptyRoutine(),
  }
}

export function normalizeAboutMe(raw: unknown): AboutMeV1 {
  const d = defaultAboutMe()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  for (const k of STRING_KEYS) {
    const v = r[k]
    ;(d as unknown as Record<string, string>)[k] = typeof v === 'string' ? v : ''
  }
  const incomingRoutine = r.routine
  if (incomingRoutine && typeof incomingRoutine === 'object') {
    for (const day of ROUTINE_DAYS) {
      const row = (incomingRoutine as Record<string, unknown>)[day]
      if (row && typeof row === 'object') {
        for (const slot of ROUTINE_SLOTS) {
          const cell = (row as Record<string, unknown>)[slot]
          if (typeof cell === 'string') d.routine[day][slot] = cell
        }
      }
    }
  }
  return d
}

export function parseAboutMeFromReferences(refs: ServiceUserDetailReference[]): AboutMeV1 {
  const row = refs.find((x) => x.referenceType === ABOUT_ME_REF_TYPE)
  if (!row?.referenceValue?.trim()) return defaultAboutMe()
  try {
    const j = JSON.parse(row.referenceValue) as unknown
    if (j && typeof j === 'object' && (j as { version?: unknown }).version === 1) {
      return normalizeAboutMe(j)
    }
  } catch {
    /* ignore */
  }
  return defaultAboutMe()
}

export function isAboutMeEmpty(a: AboutMeV1): boolean {
  for (const k of STRING_KEYS) {
    if ((a[k] as string).trim()) return false
  }
  for (const day of ROUTINE_DAYS) {
    for (const slot of ROUTINE_SLOTS) {
      if (a.routine[day][slot].trim()) return false
    }
  }
  return true
}

function refToPayload(r: ServiceUserDetailReference): ServiceUserReferenceItemPayload {
  return {
    id: r.id,
    referenceType: r.referenceType,
    referenceValue: r.referenceValue,
    notes: r.notes ?? undefined,
  }
}

/** Replace `SU_ABOUT_ME_V1` while keeping every other reference row for `PATCH /service-users/:id`. */
export function mergeAboutMeReference(refs: ServiceUserDetailReference[], about: AboutMeV1): ServiceUserReferenceItemPayload[] {
  const base = refs.filter((r) => r.referenceType !== ABOUT_ME_REF_TYPE).map(refToPayload)
  if (isAboutMeEmpty(about)) return base
  const prev = refs.find((r) => r.referenceType === ABOUT_ME_REF_TYPE)
  const json = JSON.stringify(about)
  if (prev) base.push({ id: prev.id, referenceType: ABOUT_ME_REF_TYPE, referenceValue: json })
  else base.push({ referenceType: ABOUT_ME_REF_TYPE, referenceValue: json })
  return base
}

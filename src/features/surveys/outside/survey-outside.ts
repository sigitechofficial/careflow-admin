import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** API: careflow-api src/surveys/survey-outside-people.{service,controller}.ts */
export type OutsideKind = 'FAMILY' | 'PROFESSIONAL' | 'COMMISSIONER' | 'OTHER'
export const OUTSIDE_KIND_LABEL: Record<OutsideKind, string> = {
  FAMILY: 'Family or representative',
  PROFESSIONAL: 'Professional',
  COMMISSIONER: 'Commissioner',
  OTHER: 'Other',
}

export type OutsideContact = {
  id: string
  kind: OutsideKind
  name: string
  organisation: string | null
  role: string | null
  email: string | null
  mobile: string | null
  phone: string | null
  sourceType: 'TYPED' | 'SERVICE_USER_CONTACT' | 'FUNDER' | 'PATHWAY_PROFESSIONAL'
  /** A family member's People involved record (sourceType SERVICE_USER_CONTACT); matches FamilyContact.sourceId. */
  sourceId?: string | null
  serviceUserId: string | null
  locationIds: string[]
  listIds: string[]
  optedOut: string[]
  canChange: boolean
}
export type OutsideList = { id: string; name: string; description: string | null; locationIds: string[]; members: number; canChange: boolean }
export type OutsideSource = { id: string; name: string; organisation: string | null; role: string | null; email: string | null; phone: string | null; added: boolean }
export type FamilyContact = {
  sourceId: string
  serviceUserId: string
  name: string
  relationship: string | null
  email: string | null
  mobile: string | null
  /** Agreed to be contacted ("Can receive care updates" on People involved). */
  consent: boolean
  reachable: boolean
  aboutName: string | null
}
export type ContactInput = {
  kind: OutsideKind
  name: string
  organisation?: string | null
  role?: string | null
  email?: string | null
  mobile?: string | null
  phone?: string | null
}
export type SendOutsideInput = {
  contactIds?: string[]
  listIds?: string[]
  familyContactIds?: string[]
  aboutServiceUserId?: string | null
  contactRuleOverride?: { reason: string }
  /** A survey about one person who has died: why these people are asked now (audited). */
  afterDeathReason?: string
}
export type SendOutsideCheck = {
  total: number
  sendNow: number
  heldBack: number
  held: Array<{ id: string; name: string; freeFrom: string }>
  already: number
  optedOut: number
  noDetails: number
  /** Who cannot be reached by this survey; hasMobile: they have a mobile, but this survey is not sent by text. */
  noDetailsPeople?: Array<{ id: string; name: string; sourceType: string; sourceId: string | null; serviceUserId: string | null; hasMobile: boolean }>
  /** This survey is also sent by text (its reminders use texts and texts are switched on). */
  textOn?: boolean
  noConsent: number
  /** Family members whose person we supported has died (only the bereaved-family survey goes to them). */
  died?: number
  /** People who are sent a survey about one person who has died only with a reason. */
  afterDeath?: number
}

const key = ['surveys', 'outside'] as const

export function useOutsideContacts(search = '', kind = '') {
  return useQuery({
    queryKey: [...key, 'contacts', search, kind],
    queryFn: async () => {
      const q = new URLSearchParams()
      if (search.trim()) q.set('search', search.trim())
      if (kind) q.set('kind', kind)
      return (await apiJson<ApiEnvelope<OutsideContact[]>>(`/survey-outside-people/contacts?${q}`, { method: 'GET' })).data
    },
  })
}

export function useOutsideLists() {
  return useQuery({
    queryKey: [...key, 'lists'],
    queryFn: async () => (await apiJson<ApiEnvelope<OutsideList[]>>('/survey-outside-people/lists', { method: 'GET' })).data,
  })
}

export function useOutsideSources(type: 'FUNDER' | 'PATHWAY_PROFESSIONAL', search: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'sources', type, search],
    enabled,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<OutsideSource[]>>(`/survey-outside-people/sources?type=${type}&search=${encodeURIComponent(search)}`, { method: 'GET' })).data,
  })
}

export function useFamiliesOf(serviceUserIds: string[]) {
  return useQuery({
    queryKey: [...key, 'families', serviceUserIds],
    enabled: serviceUserIds.length > 0,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<FamilyContact[]>>(`/survey-outside-people/families?serviceUserIds=${serviceUserIds.join(',')}`, { method: 'GET' })).data,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: key })
    // Who can be sent a survey may change (e.g. an email added from Send to people).
    void qc.invalidateQueries({ queryKey: ['surveys', 'send-outside-check'] })
  }
}

export function useSaveOutsideContact() {
  const done = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: ContactInput }) =>
      apiJson(id ? `/survey-outside-people/contacts/${id}` : '/survey-outside-people/contacts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }),
    onSuccess: done,
  })
}

export function useRemoveOutsideContact() {
  const done = useInvalidate()
  return useMutation({ mutationFn: (id: string) => apiJson(`/survey-outside-people/contacts/${id}`, { method: 'DELETE' }), onSuccess: done })
}

export function useOutsideOptOut() {
  const done = useInvalidate()
  return useMutation({
    mutationFn: ({ id, channels }: { id: string; channels: string[] }) =>
      apiJson(`/survey-outside-people/contacts/${id}/opt-out`, { method: 'PUT', body: JSON.stringify({ channels }) }),
    onSuccess: done,
  })
}

export function useAddOutsideSource() {
  const done = useInvalidate()
  return useMutation({
    mutationFn: (input: { type: 'FUNDER' | 'PATHWAY_PROFESSIONAL'; sourceId: string }) =>
      apiJson('/survey-outside-people/sources', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: done,
  })
}

export function useSaveOutsideList() {
  const done = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: { name: string; description?: string | null; contactIds: string[] } }) =>
      apiJson(id ? `/survey-outside-people/lists/${id}` : '/survey-outside-people/lists', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }),
    onSuccess: done,
  })
}

export function useRemoveOutsideList() {
  const done = useInvalidate()
  return useMutation({ mutationFn: (id: string) => apiJson(`/survey-outside-people/lists/${id}`, { method: 'DELETE' }), onSuccess: done })
}

export function useSendOutsideCheck(surveyId: string, input: SendOutsideInput, enabled: boolean) {
  return useQuery({
    queryKey: ['surveys', 'send-outside-check', surveyId, input],
    enabled,
    retry: false,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<SendOutsideCheck>>(`/surveys/${surveyId}/send-outside/check`, { method: 'POST', body: JSON.stringify(input) })).data,
  })
}

export function useSendOutside(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendOutsideInput) =>
      apiJson<ApiEnvelope<{ sent: number }>>(`/surveys/${surveyId}/send-outside`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export type SurveyAboutPerson = { id: string; title: string; status: string; targetKind: string; createdAt: string; closesAt: string | null; sentTo: number }

export function useSurveysAboutPerson(serviceUserId: string) {
  return useQuery({
    queryKey: ['surveys', 'about-person', serviceUserId],
    retry: false,
    queryFn: async () => (await apiJson<ApiEnvelope<SurveyAboutPerson[]>>(`/surveys/about-person/${serviceUserId}`, { method: 'GET' })).data,
  })
}

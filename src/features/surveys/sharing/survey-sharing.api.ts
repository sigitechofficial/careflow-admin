/**
 * Sharing a survey: the shared link (and branch links), turning the shared link on for staff and
 * service-user surveys, a new main link, people's own links (copy / mail merge / new link), and the
 * audit row for a printed paper copy. API: survey-share-links.service.ts,
 * survey-recipient-links.service.ts (every action audited).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { surveyKeys } from '@/features/surveys/keys'

export type ShareLinks = {
  /** Null when a staff / service-user survey's shared link is off. */
  main: { token: string } | null
  enabled: boolean
  /** One answer per device (a marker kept only on the device). */
  oncePerDevice?: boolean
  /** Answers per 10 minutes through each link: standard, or raised for a planned sitting until a time. */
  linkLimit?: { standard: number; inForce: number; raisedUntil: string | null; max: number; maxDays: number }
  branches: Array<{ id: string; token: string; locationId: string | null; locationName: string | null; createdAt: string }>
  availableBranches: Array<{ id: string; name: string }>
}

export type PersonalLink = {
  recipientId: string
  name: string
  kind: 'EMPLOYEE' | 'SERVICE_USER'
  /** "/survey/<token>": add the app's address (buildSurveyShareUrl takes the token). */
  path: string
  /** Null when this user may not see who has answered. */
  answered: boolean | null
}

export const shareLinksKey = (surveyId: string) => [...surveyKeys.all(), 'share-links', surveyId] as const

/** The app address of a "/survey/<token>" path. */
export function absoluteSurveyUrl(path: string): string {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export function useShareLinks(surveyId: string, enabled = true) {
  return useQuery({
    queryKey: shareLinksKey(surveyId),
    enabled,
    queryFn: async () => (await apiJson<ApiEnvelope<ShareLinks>>(`/surveys/${surveyId}/share-links`, { method: 'GET' })).data as ShareLinks,
  })
}

function useRefreshLinks(surveyId: string) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: shareLinksKey(surveyId) })
    void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
  }
}

export function useSetSharedLink(surveyId: string) {
  const refresh = useRefreshLinks(surveyId)
  return useMutation({
    mutationFn: async (enabled: boolean) =>
      apiJson(`/surveys/${surveyId}/share-links/enabled`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
    onSuccess: refresh,
  })
}

export function useRenewMainLink(surveyId: string) {
  const refresh = useRefreshLinks(surveyId)
  return useMutation({
    mutationFn: async () => apiJson(`/surveys/${surveyId}/share-links/main/renew`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

/** Fetches people's own links. Each call is audited (survey_links_copied), so call it only on a click. */
export async function fetchPersonalLinks(
  surveyId: string,
  input: { purpose: 'ONE' | 'ALL' | 'CSV'; recipientIds?: string[]; onlyNotAnswered?: boolean },
): Promise<PersonalLink[]> {
  const res = await apiJson<ApiEnvelope<{ links: PersonalLink[] }>>(`/surveys/${surveyId}/recipient-links`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return (res.data as { links: PersonalLink[] }).links
}

export async function renewPersonalLink(surveyId: string, recipientId: string): Promise<{ recipientId: string; path: string }> {
  const res = await apiJson<ApiEnvelope<{ recipientId: string; path: string }>>(
    `/surveys/${surveyId}/recipient-links/${recipientId}/renew`,
    { method: 'POST' },
  )
  return res.data as { recipientId: string; path: string }
}

/** Tell the API a paper copy is being printed (audited as survey_paper_copy_printed). Never blocks printing. */
export async function notePaperCopyPrinted(surveyId: string): Promise<void> {
  await apiJson(`/surveys/${surveyId}/share-links/paper-copy`, { method: 'POST' })
}

/** Record a results download (audited as survey_results_exported). Throws when refused: then do not download. */
export async function recordResultsExport(
  surveyId: string,
  input: { kind: 'RESULTS_CSV'; period?: string; respondentGroup?: string },
): Promise<void> {
  await apiJson(`/surveys/${surveyId}/access/exports`, { method: 'POST', body: JSON.stringify(input) })
}

export type LinksCopiedEntry = { at: string; by: string; what: 'ONE' | 'ALL' | 'MAIL_MERGE' | 'NEW_LINK'; count: number }

/** Who copied people's own links or made a new one (never the links). */
export function useLinksCopiedHistory(surveyId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...surveyKeys.all(), 'links-copied', surveyId],
    enabled,
    queryFn: async () =>
      (await apiJson<ApiEnvelope<LinksCopiedEntry[]>>(`/surveys/${surveyId}/recipient-links/history`, { method: 'GET' })).data as LinksCopiedEntry[],
  })
}

/** Raise the per-link limit for a planned sitting (limit + until), or put the standard back (limit null). Audited. */
export function useSharedLinkLimit(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { limit: number | null; until?: string | null }) =>
      apiJson(`/surveys/${surveyId}/share-links/limit`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: shareLinksKey(surveyId) }),
  })
}

export function useSharedLinkSettings(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (settings: { oncePerDevice: boolean }) =>
      apiJson(`/surveys/${surveyId}/share-links/settings`, { method: 'PUT', body: JSON.stringify(settings) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: shareLinksKey(surveyId) })
      void qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { policyKeys } from '@/features/policies/keys'

/** A complete, researched policy an organisation can adopt (Policies → Ready-made policies). */
export type LibraryPolicy = {
  id: string
  reference: string
  title: string
  summary: string
  documentType: 'POLICY' | 'PROCEDURE' | 'PROTOCOL' | 'GUIDELINE'
  category: { id: string; name: string; code: string | null; displayOrder: number }
  researchedOn: string
  wordCount: number
  /** Library revision; raised whenever the text changes after release. */
  revision: number
  revisionNote: string | null
  keyPoints: { intro: string; points: string[] }
  reviewFrequencyMonths: number
  acknowledgementRequired: boolean
  audience: string[]
  moduleLinks: string[]
  sectionHeadings: string[]
  regulatoryBasis: Array<{ source: string; url: string }>
  related: Array<{ reference: string; title: string | null }>
  /** The organisation's draft or policy made from this one, if adopted. */
  adoptedPolicyId: string | null
  /** The library revision the adopted policy is based on. */
  adoptedRevision: number | null
  updateAvailable: boolean
}

/** The ready-made policy an organisation's policy was adopted from. */
export type LibraryLink = {
  libraryId: string
  reference: string
  title: string
  adoptedRevision: number
  currentRevision: number
  revisionNote: string | null
  updateAvailable: boolean
}

export type LibraryPolicyDetail = LibraryPolicy & { contentHtml: string }

export type AdoptResult = {
  created: Array<{ libraryId: string; policyId: string; reference: string; title: string }>
  skipped: Array<{ libraryId: string; reference: string; title: string; reason: string }>
}

export async function fetchLibraryPolicies(): Promise<LibraryPolicy[]> {
  return (await apiJson<ApiEnvelope<LibraryPolicy[]>>('/policy-library', { method: 'GET' })).data
}

export async function fetchLibraryPolicy(id: string): Promise<LibraryPolicyDetail> {
  return (await apiJson<ApiEnvelope<LibraryPolicyDetail>>(`/policy-library/${encodeURIComponent(id)}`, { method: 'GET' })).data
}

export async function adoptLibraryPolicies(policyIds: string[]): Promise<AdoptResult> {
  return (
    await apiJson<ApiEnvelope<AdoptResult>>('/policy-library/adopt', {
      method: 'POST',
      body: JSON.stringify({ policyIds }),
    })
  ).data
}

export async function fetchLibraryLink(policyId: string): Promise<LibraryLink | null> {
  return (
    await apiJson<ApiEnvelope<LibraryLink | null>>(`/policy-library/for-policy/${encodeURIComponent(policyId)}`, {
      method: 'GET',
    })
  ).data
}

export async function applyLibraryUpdate(policyId: string): Promise<{ policyId: string; revision: number }> {
  return (
    await apiJson<ApiEnvelope<{ policyId: string; revision: number }>>(
      `/policy-library/apply-update/${encodeURIComponent(policyId)}`,
      { method: 'POST' },
    )
  ).data
}

const libraryKey = [...policyKeys.all, 'ready-made'] as const

export function useLibraryPolicies() {
  return useQuery({ queryKey: libraryKey, queryFn: fetchLibraryPolicies, staleTime: 60_000 })
}

export function useLibraryPolicy(id: string | null) {
  return useQuery({
    queryKey: [...libraryKey, id],
    queryFn: () => fetchLibraryPolicy(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useAdoptLibraryPolicies() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adoptLibraryPolicies,
    onSuccess: () => void qc.invalidateQueries({ queryKey: policyKeys.all }),
  })
}

export function useLibraryLink(policyId: string, enabled = true) {
  return useQuery({
    queryKey: [...libraryKey, 'link', policyId],
    queryFn: () => fetchLibraryLink(policyId),
    enabled,
    staleTime: 60_000,
  })
}

export function useApplyLibraryUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: applyLibraryUpdate,
    onSuccess: () => void qc.invalidateQueries({ queryKey: policyKeys.all }),
  })
}

export const MODULE_LABELS: Record<string, string> = {
  CARE_PLAN: 'Care plans',
  INITIAL_ASSESSMENT: 'Initial assessments',
  RISK_ASSESSMENT: 'Risk assessments',
  MEDICATION: 'Medication',
  INCIDENT: 'Incidents',
  SAFEGUARDING: 'Safeguarding',
  VISIT: 'Visits',
  EMPLOYEE: 'Employees',
  HR: 'HR',
  TRAINING: 'Training',
  RECRUITMENT: 'Recruitment',
  AUDIT: 'Audit',
  BUSINESS_CONTINUITY: 'Business continuity',
  BRANCH: 'Branches',
  EQUIPMENT: 'Equipment',
  INFECTION_CONTROL: 'Infection control',
}

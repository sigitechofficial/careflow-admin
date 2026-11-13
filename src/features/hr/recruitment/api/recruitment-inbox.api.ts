import { apiJson, getApiBaseUrl, type ApiEnvelope } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import type { CandidateStage, EmploymentHistoryEntry } from '@/features/hr/recruitment/api/recruitment.api'

export type RecruitmentEmailStatus =
  | 'RECEIVED'
  | 'READ'
  | 'FAILED'
  | 'NOT_AN_APPLICATION'
  | 'CANDIDATE_CREATED'
  | 'DISMISSED'

export type RecruitmentInboxTab = 'open' | 'created' | 'closed'

export type RecruitmentEmailRow = {
  id: string
  fromName: string | null
  fromEmail: string | null
  subject: string | null
  receivedAt: string
  status: RecruitmentEmailStatus
  applicantName: string
  summary: string | null
  attachmentCount: number
  candidateId: string | null
}

/** The form filled from what Claude read (null = not stated). */
export type ApplicationDraft = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  vacancyId: string
  hasRightToWork: boolean | null
  drivesForWork: boolean | null
  coverLetter: string
  cvFileName: string
}

export type RecruitmentEmailDetail = {
  id: string
  status: RecruitmentEmailStatus
  fromName: string | null
  fromEmail: string | null
  subject: string | null
  receivedAt: string
  bodyText: string
  error: string | null
  attachments: { index: number; fileName: string; mimeType: string; size: number; available: boolean; skippedReason: string | null }[]
  extraction: { isApplication: boolean; summary: string; vacancyReason: string; checkNotes: string[] } | null
  draft: ApplicationDraft
  employmentHistory: EmploymentHistoryEntry[]
  incompleteHistoryRows: number
  existingCandidates: { id: string; name: string; stage: CandidateStage; vacancyTitle: string | null }[]
  existingEmployee: { employeeId: string; name: string } | null
  candidate: { id: string; name: string } | null
}

export type CreateFromEmailInput = Omit<ApplicationDraft, 'cvFileName'> & {
  cvFileName?: string
  includeEmploymentHistory: boolean
  attachmentIndexes: number[]
}

async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

export async function fetchRecruitmentInbox(tab: RecruitmentInboxTab) {
  const res = await apiJson<ApiEnvelope<RecruitmentEmailRow[]> & { meta: { counts: Record<RecruitmentInboxTab, number> } }>(
    `/hr/recruitment-inbox?tab=${tab}`,
  )
  return { rows: res.data, counts: res.meta.counts }
}

export const fetchRecruitmentEmail = (id: string) => data<RecruitmentEmailDetail>(`/hr/recruitment-inbox/${id}`)

export const readRecruitmentEmailAgain = (id: string) =>
  data<RecruitmentEmailDetail>(`/hr/recruitment-inbox/${id}/read`, { method: 'POST' })

export const createCandidateFromEmail = (id: string, body: CreateFromEmailInput) =>
  data<{ candidateId: string; documentsCopied: number; historyRows: number; emailed: boolean }>(
    `/hr/recruitment-inbox/${id}/candidate`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        email: body.email.trim() || undefined,
        phone: body.phone.trim() || undefined,
        address: body.address.trim() || undefined,
        coverLetter: body.coverLetter.trim() || undefined,
        cvFileName: body.cvFileName || undefined,
      }),
    },
  )

export const dismissRecruitmentEmail = (id: string) => apiJson(`/hr/recruitment-inbox/${id}/dismiss`, { method: 'POST' })
export const reopenRecruitmentEmail = (id: string) => apiJson(`/hr/recruitment-inbox/${id}/reopen`, { method: 'POST' })

/** Open an attachment from private storage (signed-in fetch) in a new tab. */
export async function openRecruitmentAttachment(id: string, index: number) {
  const headers = new Headers()
  const token = useAuthStore.getState().accessToken
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const win = window.open('', '_blank')
  const res = await fetch(`${getApiBaseUrl()}/hr/recruitment-inbox/${id}/attachments/${index}`, { headers })
  if (!res.ok) {
    win?.close()
    throw new Error(`Could not open the attachment (${res.status})`)
  }
  const url = URL.createObjectURL(await res.blob())
  if (win) win.location.href = url
  else window.location.href = url
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

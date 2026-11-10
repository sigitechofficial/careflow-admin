import { apiJson, ApiError, getApiBaseUrl, type ApiEnvelope } from '@/shared/api/api-client'
import { formatApiErrorMessage } from '@/shared/api/api-error-format'
import { useAuthStore } from '@/features/auth/store'
import type {
  ApplicablePoliciesParams,
  MyPolicyAcknowledgements,
  PaginatedResult,
  PaginationMeta,
  PolicyCategory,
  PolicyCategoryInput,
  PolicyAcknowledgementReport,
  PolicyAcknowledgementStatusResult,
  PolicyAcknowledgementSummaryRow,
  PolicyPublishPreview,
  PolicyCategoryListParams,
  PolicyDocument,
  PolicyListParams,
  PolicyTag,
  PolicyTagListParams,
  PolicyVersion,
  PolicyWriteInput,
} from '@/features/policies/types/policy.types'

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  if (!params) return ''
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function fetchPaginated<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<PaginatedResult<T>> {
  const res = await apiJson<ApiEnvelope<T[]>>(`${path}${buildQuery(params)}`, { method: 'GET' })
  return { rows: res.data ?? [], meta: res.meta as PaginationMeta | undefined }
}

async function fetchData<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

export async function fetchPolicies(params?: PolicyListParams): Promise<PaginatedResult<PolicyDocument>> {
  return fetchPaginated<PolicyDocument>('/policies', params)
}

export async function fetchApplicablePolicies(
  params?: ApplicablePoliciesParams,
): Promise<PaginatedResult<PolicyDocument>> {
  return fetchPaginated<PolicyDocument>('/policies/applicable', params)
}

export async function fetchPolicy(id: string): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}`)
}

export async function createPolicy(body: PolicyWriteInput): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>('/policies', {
    method: 'POST',
    body: JSON.stringify({ ...body, source: body.source ?? 'EDITOR' }),
  })
}

export async function updatePolicy(id: string, body: Partial<PolicyWriteInput>): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchPolicyVersions(id: string): Promise<PolicyVersion[]> {
  return fetchData<PolicyVersion[]>(`/policies/${id}/versions`)
}

export async function fetchPolicyVersion(id: string, versionId: string): Promise<PolicyVersion> {
  return fetchData<PolicyVersion>(`/policies/${id}/versions/${versionId}`)
}

export async function createPolicyVersion(
  id: string,
  body: { bump: 'minor' | 'major'; changeSummary?: string; reusePreviousContent?: boolean },
): Promise<PolicyVersion> {
  return fetchData<PolicyVersion>(`/policies/${id}/versions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function uploadPolicyVersionDocument(
  policyId: string,
  versionId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PolicyVersion> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/policies/${policyId}/versions/${versionId}/upload`)
    const token = useAuthStore.getState().accessToken
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = event => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onerror = () => reject(new ApiError('Network error', 0))
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = xhr.responseText
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const msg = formatApiErrorMessage(body, xhr.statusText || 'Upload failed')
        reject(new ApiError(msg || 'Upload failed', xhr.status, body))
        return
      }
      const envelope = body as ApiEnvelope<PolicyVersion>
      resolve(envelope.data)
    }
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

export async function removePolicyVersionDocument(policyId: string, versionId: string): Promise<PolicyVersion> {
  return fetchData<PolicyVersion>(`/policies/${policyId}/versions/${versionId}/document`, { method: 'DELETE' })
}

export async function fetchPolicyDocumentBlob(
  policyId: string,
  versionId: string,
  disposition: 'inline' | 'attachment' = 'attachment',
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(
    `${base}/policies/${policyId}/versions/${versionId}/document?disposition=${disposition}`,
    { headers },
  )
  if (!res.ok) {
    throw new ApiError(res.status === 403 ? 'Permission denied' : 'Download failed', res.status)
  }
  const blob = await res.blob()
  const dispositionHeader = res.headers.get('Content-Disposition') ?? ''
  const match = dispositionHeader.match(/filename\*?=(?:UTF-8'')?([^";]+)/i)
  const fileName = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : 'policy-document'
  return { blob, fileName, mimeType: res.headers.get('Content-Type') ?? blob.type }
}

export async function submitPolicyForReview(id: string, comments?: string): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}/submit-review`, {
    method: 'POST',
    body: JSON.stringify(comments ? { comments } : {}),
  })
}

export async function requestPolicyChanges(id: string, comments: string): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}/request-changes`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  })
}

export async function approvePolicy(id: string, comments?: string): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(comments ? { comments } : {}),
  })
}

export async function publishPolicy(id: string, changeSummary?: string): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(changeSummary ? { changeSummary } : {}),
  })
}

export async function archivePolicy(id: string): Promise<PolicyDocument> {
  return fetchData<PolicyDocument>(`/policies/${id}/archive`, { method: 'POST' })
}

export async function deletePolicy(id: string): Promise<{ id: string; deleted: true }> {
  return fetchData<{ id: string; deleted: true }>(`/policies/${id}`, { method: 'DELETE' })
}

export async function fetchPolicyCategories(
  params?: PolicyCategoryListParams,
): Promise<PaginatedResult<PolicyCategory>> {
  return fetchPaginated<PolicyCategory>('/policy-categories', params)
}

export async function createPolicyCategory(body: PolicyCategoryInput): Promise<PolicyCategory> {
  return fetchData<PolicyCategory>('/policy-categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updatePolicyCategory(
  id: string,
  body: Partial<PolicyCategoryInput>,
): Promise<PolicyCategory> {
  return fetchData<PolicyCategory>(`/policy-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deletePolicyCategory(id: string): Promise<void> {
  await apiJson(`/policy-categories/${id}`, { method: 'DELETE' })
}

export async function fetchPolicyTags(params?: PolicyTagListParams): Promise<PaginatedResult<PolicyTag>> {
  return fetchPaginated<PolicyTag>('/policy-tags', params)
}

export async function createPolicyTag(body: { name: string }): Promise<PolicyTag> {
  return fetchData<PolicyTag>('/policy-tags', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updatePolicyTag(id: string, body: { name: string }): Promise<PolicyTag> {
  return fetchData<PolicyTag>(`/policy-tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deletePolicyTag(id: string): Promise<void> {
  await apiJson(`/policy-tags/${id}`, { method: 'DELETE' })
}

// Staff read-and-acknowledge

export async function fetchMyPolicyAcknowledgements(): Promise<MyPolicyAcknowledgements> {
  return fetchData<MyPolicyAcknowledgements>('/policy-acknowledgements/mine')
}

export async function recordPolicyViewed(documentId: string): Promise<PolicyAcknowledgementStatusResult> {
  return fetchData<PolicyAcknowledgementStatusResult>(`/policy-acknowledgements/${documentId}/viewed`, {
    method: 'POST',
  })
}

export async function acknowledgePolicy(documentId: string): Promise<PolicyAcknowledgementStatusResult> {
  return fetchData<PolicyAcknowledgementStatusResult>(`/policy-acknowledgements/${documentId}/acknowledge`, {
    method: 'POST',
  })
}

export async function fetchPolicyAcknowledgementReport(documentId: string): Promise<PolicyAcknowledgementReport> {
  return fetchData<PolicyAcknowledgementReport>(`/policy-acknowledgements/policies/${documentId}`)
}

export async function fetchPolicyPublishPreview(documentId: string): Promise<PolicyPublishPreview> {
  return fetchData<PolicyPublishPreview>(`/policy-acknowledgements/policies/${documentId}/publish-preview`)
}

export async function fetchPolicyAcknowledgementSummary(): Promise<PolicyAcknowledgementSummaryRow[]> {
  return fetchData<PolicyAcknowledgementSummaryRow[]>('/policy-acknowledgements/summary')
}

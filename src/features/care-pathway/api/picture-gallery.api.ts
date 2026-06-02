import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CarePictureRow = {
  id: string
  name: string
  type?: 'STANDARD' | 'UPLOADED'
  pictureType?: 'STANDARD' | 'UPLOADED'
  fileUrl: string
  categoryId?: string | null
  categoryName?: string
}

type GalleryListResponse = ApiEnvelope<CarePictureRow[]> & {
  meta?: { total?: number; page?: number; limit?: number; totalPages?: number }
}

export async function listCarePictures(params?: {
  type?: 'standard' | 'uploaded'
  search?: string
}): Promise<CarePictureRow[]> {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  q.set('limit', '100')
  const basePath =
    params?.type === 'uploaded' ? '/picture-gallery/uploaded' : '/picture-gallery/standard'

  const all: CarePictureRow[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    q.set('page', String(page))
    const res = await apiJson<GalleryListResponse>(`${basePath}?${q}`, { method: 'GET' })
    const rows = res.data ?? []
    all.push(...rows)
    totalPages = res.meta?.totalPages ?? (rows.length < 100 ? page : page + 1)
    if (!rows.length) break
    page += 1
  }

  return all
}

export async function uploadCarePicture(file: File, name: string, categoryId?: string): Promise<CarePictureRow> {
  const form = new FormData()
  form.append('file', file)
  form.append('name', name)
  if (categoryId) form.append('categoryId', categoryId)
  const res = await apiJson<ApiEnvelope<CarePictureRow>>('/picture-gallery/uploaded', {
    method: 'POST',
    body: form,
  })
  return res.data
}

export async function deleteUploadedPicture(id: string): Promise<void> {
  await apiJson(`/picture-gallery/uploaded/${id}`, { method: 'DELETE' })
}

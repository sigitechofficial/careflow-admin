/** UK postcode lookup via postcodes.io (no API key). */

export type PostcodeLookupResult =
  | { ok: true; postcode: string; parish?: string; adminDistrict?: string; region?: string }
  | { ok: false; error: string }

type PostcodesIoResponse = {
  status?: number
  result?: {
    postcode?: string
    parish?: string
    admin_district?: string
    region?: string
  }
  error?: string
}

export async function lookupUkPostcode(raw: string): Promise<PostcodeLookupResult> {
  const pc = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!pc) return { ok: false, error: 'Enter a postcode first.' }
  const encoded = encodeURIComponent(pc.replace(' ', ''))
  const url = `https://api.postcodes.io/postcodes/${encoded}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const body = (await res.json()) as PostcodesIoResponse
    if (!res.ok || body.status !== 200 || !body.result) {
      return { ok: false, error: body.error ?? 'Postcode not found.' }
    }
    const r = body.result
    return {
      ok: true,
      postcode: r.postcode ?? pc,
      parish: r.parish,
      adminDistrict: r.admin_district,
      region: r.region,
    }
  } catch {
    return { ok: false, error: 'Lookup failed. Check your connection or try again.' }
  }
}

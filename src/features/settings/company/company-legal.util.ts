import type { CompanyProfile, UpdateCompanyProfilePayload } from '@/features/settings/api/company-settings-api'

/** Editable "Legal & regulatory" fields (all strings for form inputs). */
export type CompanyLegalDraft = {
  legalName: string
  companyNumber: string
  cqcProviderId: string
  companyStatus: string
  companyType: string
  /** YYYY-MM-DD or '' */
  incorporationDate: string
  /** Comma / space separated SIC codes. */
  sicCodes: string
  registeredAddressLine1: string
  registeredAddressLine2: string
  registeredTown: string
  registeredCounty: string
  registeredPostcode: string
  registeredCountry: string
  countryCode: string
  currency: string
  locale: string
}

export function companyLegalDraft(p: CompanyProfile): CompanyLegalDraft {
  return {
    legalName: p.legalName ?? '',
    companyNumber: p.companyNumber ?? '',
    cqcProviderId: p.cqcProviderId ?? '',
    companyStatus: p.companyStatus ?? '',
    companyType: p.companyType ?? '',
    incorporationDate: p.incorporationDate ?? '',
    sicCodes: (p.sicCodes ?? []).join(', '),
    registeredAddressLine1: p.registeredAddressLine1 ?? '',
    registeredAddressLine2: p.registeredAddressLine2 ?? '',
    registeredTown: p.registeredTown ?? '',
    registeredCounty: p.registeredCounty ?? '',
    registeredPostcode: p.registeredPostcode ?? '',
    registeredCountry: p.registeredCountry ?? '',
    countryCode: p.countryCode ?? 'GB',
    currency: p.currency ?? 'GBP',
    locale: p.locale ?? 'en-GB',
  }
}

/** "86900, 87100" / "86900 87100" → ['86900', '87100'] (trimmed, de-duplicated). */
export function parseSicCodes(raw: string): string[] {
  const out: string[] = []
  for (const part of raw.split(/[\s,;]+/)) {
    const code = part.trim()
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}

/**
 * PATCH payload for the legal section. Optional text fields are always sent (empty string clears);
 * countryCode / currency / locale are required on the server, so blanks are omitted (keeps the saved value).
 */
export function companyLegalPayload(d: CompanyLegalDraft): UpdateCompanyProfilePayload {
  const optional = (v: string) => v.trim()
  const required = (v: string) => v.trim() || undefined
  return {
    legalName: optional(d.legalName),
    companyNumber: optional(d.companyNumber),
    cqcProviderId: optional(d.cqcProviderId),
    companyStatus: optional(d.companyStatus),
    companyType: optional(d.companyType),
    incorporationDate: d.incorporationDate.trim() || null,
    sicCodes: parseSicCodes(d.sicCodes),
    registeredAddressLine1: optional(d.registeredAddressLine1),
    registeredAddressLine2: optional(d.registeredAddressLine2),
    registeredTown: optional(d.registeredTown),
    registeredCounty: optional(d.registeredCounty),
    registeredPostcode: optional(d.registeredPostcode),
    registeredCountry: optional(d.registeredCountry),
    countryCode: required(d.countryCode)?.toUpperCase(),
    currency: required(d.currency)?.toUpperCase(),
    locale: required(d.locale),
  }
}

/** IANA timezones offered in Organisation General Settings. */

type TimezoneDef = {
  value: string
  /** Country or territory shown to the user. */
  country: string
  /** Representative city / area within that zone. */
  city: string
}

/**
 * Keep in sync with
 * `careadmin-backend/src/organisation-general-settings/organisation-timezone.ts`
 */
const ORGANISATION_TIMEZONE_DEFS: readonly TimezoneDef[] = [
  // UTC
  { value: 'UTC', country: 'UTC', city: 'Coordinated Universal Time' },

  // Americas
  { value: 'America/Los_Angeles', country: 'United States', city: 'Los Angeles (Pacific)' },
  { value: 'America/Denver', country: 'United States', city: 'Denver (Mountain)' },
  { value: 'America/Chicago', country: 'United States', city: 'Chicago (Central)' },
  { value: 'America/New_York', country: 'United States', city: 'New York (Eastern)' },
  { value: 'America/Toronto', country: 'Canada', city: 'Toronto (Eastern)' },
  { value: 'America/Vancouver', country: 'Canada', city: 'Vancouver (Pacific)' },
  { value: 'America/Mexico_City', country: 'Mexico', city: 'Mexico City' },
  { value: 'America/Sao_Paulo', country: 'Brazil', city: 'São Paulo' },

  // Europe / UK / Ireland
  { value: 'Europe/London', country: 'United Kingdom', city: 'London' },
  { value: 'Europe/Dublin', country: 'Ireland', city: 'Dublin' },
  { value: 'Europe/Lisbon', country: 'Portugal', city: 'Lisbon' },
  { value: 'Europe/Paris', country: 'France', city: 'Paris' },
  { value: 'Europe/Berlin', country: 'Germany', city: 'Berlin' },
  { value: 'Europe/Amsterdam', country: 'Netherlands', city: 'Amsterdam' },
  { value: 'Europe/Brussels', country: 'Belgium', city: 'Brussels' },
  { value: 'Europe/Madrid', country: 'Spain', city: 'Madrid' },
  { value: 'Europe/Rome', country: 'Italy', city: 'Rome' },
  { value: 'Europe/Zurich', country: 'Switzerland', city: 'Zurich' },
  { value: 'Europe/Vienna', country: 'Austria', city: 'Vienna' },
  { value: 'Europe/Stockholm', country: 'Sweden', city: 'Stockholm' },
  { value: 'Europe/Oslo', country: 'Norway', city: 'Oslo' },
  { value: 'Europe/Warsaw', country: 'Poland', city: 'Warsaw' },
  { value: 'Europe/Athens', country: 'Greece', city: 'Athens' },
  { value: 'Europe/Bucharest', country: 'Romania', city: 'Bucharest' },
  { value: 'Europe/Helsinki', country: 'Finland', city: 'Helsinki' },

  // Africa
  { value: 'Africa/Accra', country: 'Ghana', city: 'Accra' },
  { value: 'Africa/Lagos', country: 'Nigeria', city: 'Lagos' },
  { value: 'Africa/Johannesburg', country: 'South Africa', city: 'Johannesburg' },
  { value: 'Africa/Cairo', country: 'Egypt', city: 'Cairo' },
  { value: 'Africa/Nairobi', country: 'Kenya', city: 'Nairobi' },

  // Middle East
  { value: 'Asia/Riyadh', country: 'Saudi Arabia', city: 'Riyadh' },
  { value: 'Asia/Qatar', country: 'Qatar', city: 'Doha' },
  { value: 'Asia/Kuwait', country: 'Kuwait', city: 'Kuwait City' },
  { value: 'Asia/Bahrain', country: 'Bahrain', city: 'Manama' },
  { value: 'Asia/Dubai', country: 'United Arab Emirates', city: 'Dubai' },
  { value: 'Asia/Muscat', country: 'Oman', city: 'Muscat' },
  { value: 'Asia/Tehran', country: 'Iran', city: 'Tehran' },

  // South / Central Asia
  { value: 'Asia/Karachi', country: 'Pakistan', city: 'Karachi' },
  { value: 'Asia/Kolkata', country: 'India', city: 'Kolkata / New Delhi' },
  { value: 'Asia/Colombo', country: 'Sri Lanka', city: 'Colombo' },
  { value: 'Asia/Dhaka', country: 'Bangladesh', city: 'Dhaka' },

  // East / SE Asia
  { value: 'Asia/Bangkok', country: 'Thailand', city: 'Bangkok' },
  { value: 'Asia/Jakarta', country: 'Indonesia', city: 'Jakarta' },
  { value: 'Asia/Singapore', country: 'Singapore', city: 'Singapore' },
  { value: 'Asia/Hong_Kong', country: 'Hong Kong', city: 'Hong Kong' },
  { value: 'Asia/Manila', country: 'Philippines', city: 'Manila' },
  { value: 'Asia/Shanghai', country: 'China', city: 'Shanghai / Beijing' },
  { value: 'Asia/Tokyo', country: 'Japan', city: 'Tokyo' },
  { value: 'Asia/Seoul', country: 'South Korea', city: 'Seoul' },

  // Oceania
  { value: 'Australia/Perth', country: 'Australia', city: 'Perth (Western)' },
  { value: 'Australia/Adelaide', country: 'Australia', city: 'Adelaide (Central)' },
  { value: 'Australia/Brisbane', country: 'Australia', city: 'Brisbane (Eastern)' },
  { value: 'Australia/Sydney', country: 'Australia', city: 'Sydney (Eastern)' },
  { value: 'Australia/Melbourne', country: 'Australia', city: 'Melbourne (Eastern)' },
  { value: 'Pacific/Auckland', country: 'New Zealand', city: 'Auckland' },
] as const

export type OrganisationTimezone = (typeof ORGANISATION_TIMEZONE_DEFS)[number]['value']

/**
 * Current UTC offset for an IANA zone, e.g. `UTC+5`, `UTC+5:30`, `UTC-4`, `UTC`.
 * Reflects DST when applicable for `at`.
 */
export function formatTimezoneUtcOffset(
  timeZone: string,
  at: Date = new Date(),
): string {
  if (timeZone === 'UTC') return 'UTC'

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(at)
    const raw = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    const match = raw.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i)
    if (!match) {
      if (/^(GMT|UTC)$/i.test(raw.trim())) return 'UTC'
      return raw.replace(/^GMT/i, 'UTC') || 'UTC'
    }
    const sign = match[1]!
    const hours = Number.parseInt(match[2]!, 10)
    const minutes = match[3] ? Number.parseInt(match[3], 10) : 0
    if (hours === 0 && minutes === 0) return 'UTC'
    if (minutes === 0) return `UTC${sign}${hours}`
    return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
  } catch {
    return 'UTC'
  }
}

/** Minutes east of UTC (negative = west). Used for sorting. */
function utcOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  if (timeZone === 'UTC') return 0
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(at)
    const raw = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    const match = raw.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i)
    if (!match) return 0
    const sign = match[1] === '-' ? -1 : 1
    const hours = Number.parseInt(match[2]!, 10)
    const minutes = match[3] ? Number.parseInt(match[3], 10) : 0
    return sign * (hours * 60 + minutes)
  } catch {
    return 0
  }
}

function buildTimezoneLabel(def: TimezoneDef, at: Date = new Date()): string {
  const offset = formatTimezoneUtcOffset(def.value, at)
  if (def.value === 'UTC') return `UTC — Coordinated Universal Time (${offset})`
  return `${def.country} — ${def.city} (${offset})`
}

export const ORGANISATION_TIMEZONE_OPTIONS = ORGANISATION_TIMEZONE_DEFS.map(def => ({
  value: def.value,
  label: buildTimezoneLabel(def),
})) as ReadonlyArray<{ value: OrganisationTimezone; label: string }>

export const ORGANISATION_TIMEZONE_VALUES = ORGANISATION_TIMEZONE_DEFS.map(
  o => o.value,
) as OrganisationTimezone[]

export const DEFAULT_ORGANISATION_TIMEZONE: OrganisationTimezone = 'Europe/London'

export function isOrganisationTimezone(value: string): value is OrganisationTimezone {
  return (ORGANISATION_TIMEZONE_VALUES as string[]).includes(value)
}

/** Fresh labels with current DST-aware offsets, sorted west → east. */
export function organisationTimezoneOptions(at: Date = new Date()) {
  return [...ORGANISATION_TIMEZONE_DEFS]
    .map(def => ({
      value: def.value as OrganisationTimezone,
      label: buildTimezoneLabel(def, at),
      _sort: utcOffsetMinutes(def.value, at),
    }))
    .sort((a, b) => a._sort - b._sort || a.label.localeCompare(b.label))
    .map(({ value, label }) => ({ value, label }))
}

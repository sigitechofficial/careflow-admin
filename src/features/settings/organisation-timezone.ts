/** IANA timezones offered in Organisation General Settings. */
export const ORGANISATION_TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'United Kingdom (Europe/London)' },
  { value: 'Europe/Dublin', label: 'Ireland (Europe/Dublin)' },
  { value: 'Europe/Paris', label: 'Central Europe (Europe/Paris)' },
  { value: 'Europe/Berlin', label: 'Germany (Europe/Berlin)' },
  { value: 'Europe/Amsterdam', label: 'Netherlands (Europe/Amsterdam)' },
  { value: 'Europe/Madrid', label: 'Spain (Europe/Madrid)' },
  { value: 'Europe/Rome', label: 'Italy (Europe/Rome)' },
  { value: 'Europe/Warsaw', label: 'Poland (Europe/Warsaw)' },
  { value: 'Europe/Bucharest', label: 'Romania (Europe/Bucharest)' },
  { value: 'Asia/Karachi', label: 'Pakistan (Asia/Karachi)' },
  { value: 'Asia/Dubai', label: 'UAE (Asia/Dubai)' },
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { value: 'Africa/Lagos', label: 'Nigeria (Africa/Lagos)' },
  { value: 'Africa/Johannesburg', label: 'South Africa (Africa/Johannesburg)' },
  { value: 'America/New_York', label: 'US Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'US Central (America/Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (America/Los_Angeles)' },
  { value: 'America/Toronto', label: 'Canada Eastern (America/Toronto)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (Australia/Sydney)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Pacific/Auckland)' },
  { value: 'UTC', label: 'UTC' },
] as const

export type OrganisationTimezone = (typeof ORGANISATION_TIMEZONE_OPTIONS)[number]['value']

export const ORGANISATION_TIMEZONE_VALUES = ORGANISATION_TIMEZONE_OPTIONS.map(
  o => o.value,
) as OrganisationTimezone[]

export const DEFAULT_ORGANISATION_TIMEZONE: OrganisationTimezone = 'Europe/London'

export function isOrganisationTimezone(value: string): value is OrganisationTimezone {
  return (ORGANISATION_TIMEZONE_VALUES as string[]).includes(value)
}

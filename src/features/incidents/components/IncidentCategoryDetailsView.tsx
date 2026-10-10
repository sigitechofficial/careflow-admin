import {
  ALLEGED_PERSON_OPTIONS,
  PRESSURE_ULCER_GRADES,
  WOUND_STATUS_OPTIONS,
  type AllegedPerson,
} from '@/features/incidents/category-details'

const yesNo = (v: unknown) => (v === true ? 'Yes' : v === false ? 'No' : '—')
const label = (list: { value: string; label: string }[], v: unknown) =>
  list.find((o) => o.value === v)?.label ?? (v ? String(v) : '—')

/** Read-only rows for the category-specific answers captured at raise. */
export function IncidentCategoryDetailsView({
  details,
  staffNameById,
}: {
  details: Record<string, unknown> | null | undefined
  /** Resolve an alleged staff member's name when known. */
  staffNameById?: (id: string) => string | undefined
}) {
  if (!details || Object.keys(details).length === 0) return null
  const ap = details.allegedPerson as AllegedPerson | undefined
  const rows: [string, string][] = []
  const add = (text: string, v: unknown) => {
    if (v !== undefined && v !== null && v !== '') rows.push([text, String(v)])
  }

  add('Medication', details.medicationName)
  add('Scheduled dose', details.scheduledDose)
  add('Scheduled time', details.scheduledTime)
  add('Actual dose', details.actualDose)
  if ('marEntryAffected' in details) rows.push(['MAR entry affected', yesNo(details.marEntryAffected)])
  if (ap?.kind) {
    const who =
      ap.kind === 'STAFF'
        ? (ap.employeeId && staffNameById?.(ap.employeeId)) || 'Staff member'
        : ap.kind === 'OTHER_PERSON'
          ? [ap.name, ap.relationship && `(${ap.relationship})`].filter(Boolean).join(' ')
          : label(ALLEGED_PERSON_OPTIONS, ap.kind)
    rows.push(['Alleged person causing harm', who])
  }
  if (details.woundStatus) rows.push(['New / existing / deteriorated', label(WOUND_STATUS_OPTIONS, details.woundStatus)])
  if (details.pressureUlcerGrade) rows.push(['Pressure ulcer grade', label(PRESSURE_ULCER_GRADES, details.pressureUlcerGrade)])
  add('Reason', details.reason)
  add('Why no visit matches', details.noMatchingVisitReason)
  if (details.confirmedByName)
    rows.push(['Death confirmed / notified by', `${details.confirmedByName}${details.confirmedByRole ? ` (${details.confirmedByRole})` : ''}`])
  add('Symptoms / details', details.symptoms)
  add('Symptoms started on', details.symptomsStartedOn)
  add('PPE / infection-control action', details.infectionControlAction)
  add('Information affected', details.informationType)
  add('People affected', details.peopleAffected)
  if ('recoveredOrSecured' in details) rows.push(['Recovered / secured', yesNo(details.recoveredOrSecured)])

  if (rows.length === 0) return null
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

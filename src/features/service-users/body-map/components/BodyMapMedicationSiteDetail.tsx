import { Link } from '@tanstack/react-router'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'
import { BodyMapMarAdministrationLink } from '@/features/service-users/body-map/components/BodyMapMarAdministrationLink'
import { isPatchSubType } from '@/features/service-users/body-map/utils/body-map-medication-subtype'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

type Props = {
  record: BodyMapRecordRow
  serviceUserId: string
}

export function BodyMapMedicationSiteDetail({ record, serviceUserId }: Props) {
  const site = record.medicationSite
  if (!site) return null

  const medName =
    site.medication?.medicationName ?? site.medicineNameSnapshot ?? 'Medication'

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-xs">
      <p className="font-semibold text-blue-900">MAR medication site</p>
      <ul className="mt-2 space-y-1 text-blue-950">
        <li>
          <span className="font-medium">Medicine: </span>
          {medName}
          {site.strength ? ` (${site.strength})` : ''}
        </li>
        {site.frequencyText ? (
          <li>
            <span className="font-medium">Frequency: </span>
            {site.frequencyText}
          </li>
        ) : null}
        {site.appliedAt ? (
          <li>
            <span className="font-medium">Applied: </span>
            {formatGbDateTime(site.appliedAt)}
            {site.appliedByName ? ` · ${site.appliedByName}` : ''}
          </li>
        ) : null}
        {site.consentGiven != null ? (
          <li>Consent: {site.consentGiven ? 'Yes' : 'No'}</li>
        ) : null}
        {site.fireRiskEmollient ? (
          <li>Emollient fire risk: {site.fireRiskEmollient.replace(/_/g, ' ')}</li>
        ) : null}
        {site.amountOrThickness ? <li>Amount: {site.amountOrThickness}</li> : null}
        {record.subType && isPatchSubType(record.subType) ? (
          <>
            {site.oldPatchPresent != null ? (
              <li>Old patch present: {site.oldPatchPresent ? 'Yes' : 'No'}</li>
            ) : null}
            {site.oldPatchRemoved != null ? (
              <li>Old patch removed: {site.oldPatchRemoved ? 'Yes' : 'No'}</li>
            ) : null}
            {site.disposalRecorded != null ? (
              <li>Disposal recorded: {site.disposalRecorded ? 'Yes' : 'No'}</li>
            ) : null}
            {site.nextChangeDue ? (
              <li>Next change due: {formatGbDateTime(site.nextChangeDue)}</li>
            ) : null}
            {site.siteRotationChecked ? <li>Site rotation checked</li> : null}
          </>
        ) : null}
      </ul>
      {site.serviceUserMedicationId ? (
        <BodyMapMarAdministrationLink
          serviceUserId={serviceUserId}
          medicationId={site.serviceUserMedicationId}
          bodyMapRecordId={record.id}
          linkedEventId={site.lastAdministrationEventId}
          linkedEvent={site.lastAdministrationEvent ?? null}
          mode="manage"
        />
      ) : null}
      <Link
        to="/service-users/$serviceUserId/medication"
        params={{ serviceUserId }}
        className="mt-2 inline-block text-xs font-semibold text-indigo-700 hover:underline"
      >
        Open MAR chart ({medName}) →
      </Link>
    </div>
  )
}

export function medicationSiteMarkerLabel(
  record: BodyMapRecordRow,
  fallbackSubType: string,
  bodyPart: string,
): string {
  const name =
    record.medicationSite?.medication?.medicationName ??
    record.medicationSite?.medicineNameSnapshot
  if (name) return `${name} — ${bodyPart}`
  return `${fallbackSubType} — ${bodyPart}`
}

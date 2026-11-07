import type { LookupRow } from '@/features/employees/types'
import type { ServiceUserDetail, ServiceUserLookupsBundle } from '@/features/service-users/types'
import { ServiceUserAboutMeForm } from '@/features/service-users/components/ServiceUserAboutMeForm'
import { ServiceUserAbsencesTab } from '@/features/service-users/components/ServiceUserAbsencesTab'
import { ServiceUserAllergiesTab } from '@/features/service-users/components/ServiceUserAllergiesTab'
import { ServiceUserCalendarTab } from '@/features/service-users/calendar/components/ServiceUserCalendarTab'
import { ServiceUserContactsTab } from '@/features/service-users/components/ServiceUserContactsTab'
import { ServiceUserDomCareTab } from '@/features/service-users/components/ServiceUserDomCareTab'
import { ServiceUserEditChargeCardPanel } from '@/features/service-users/components/ServiceUserEditChargeCardPanel'
import { ServiceUserEditVisitsPanel } from '@/features/service-users/components/ServiceUserEditVisitsPanel'
import { ServiceUserFundingTab } from '@/features/service-users/components/ServiceUserFundingTab'
import { ServiceUserInventoryTab } from '@/features/service-users/components/ServiceUserInventoryTab'
import { ServiceUserLiveInProfileTab } from '@/features/service-users/components/ServiceUserLiveInProfileTab'
import { ServiceUserNfcTagsSection } from '@/features/service-users/components/ServiceUserNfcTagsSection'
import { ServiceUserPersonalDetailsForm } from '@/features/service-users/components/ServiceUserPersonalDetailsForm'
import { ServiceUserPhotosTab } from '@/features/service-users/components/ServiceUserPhotosTab'
import { ServiceUserPortalAccessSection } from '@/features/service-users/components/ServiceUserPortalAccessSection'
import { SurveyContactPreferencesSection } from '@/features/surveys/reminders/SurveyContactPreferencesSection'
import { PersonSurveysSection } from '@/features/surveys/reminders/PersonSurveysSection'
import { SurveysAboutPersonSection } from '@/features/surveys/outside/SurveysAboutPersonSection'
import { ServiceUserIncidentsComplaintsPanel } from '@/features/service-users/components/ServiceUserIncidentsComplaintsPanel'
import { ServiceUserInitialAssessmentEnterpriseTab } from '@/features/service-users/initial-assessment/components/ServiceUserInitialAssessmentEnterpriseTab'
import { ServiceUserReferralsTab } from '@/features/service-users/referrals/components/ServiceUserReferralsTab'
import type { ServiceUserProfileTabId } from '@/features/service-users/service-user-profile-tabs'

type Props = {
  tab: ServiceUserProfileTabId
  serviceUserId: string
  detail: ServiceUserDetail
  lookups: ServiceUserLookupsBundle | null
  locations: LookupRow[]
  onSaved: () => void
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
      {title} data is not available in the API yet. This section is reserved for future CareAdmin modules.
    </div>
  )
}

/** Shared section bodies for workspace Profile and the legacy Edit Service User page. */
export function ServiceUserProfileSectionContent({
  tab,
  serviceUserId,
  detail,
  lookups,
  locations,
  onSaved,
}: Props) {
  return (
    <div data-testid={`service-user-profile-section-${tab}`}>
      {tab === 'personal' &&
        (lookups ? (
          <div className="space-y-6">
            <ServiceUserPersonalDetailsForm
              detail={detail}
              lookups={lookups}
              locations={locations}
              serviceUserId={serviceUserId}
              onSaved={onSaved}
            />
            <ServiceUserPortalAccessSection serviceUserId={serviceUserId} defaultEmail={detail.email} />
            <SurveyContactPreferencesSection subjectKind="SERVICE_USER" subjectId={serviceUserId} />
            <PersonSurveysSection serviceUserId={serviceUserId} />
            <SurveysAboutPersonSection serviceUserId={serviceUserId} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ))}

      {tab === 'contacts' &&
        (lookups ? (
          <ServiceUserContactsTab
            serviceUserId={serviceUserId}
            detail={detail}
            lookups={lookups}
            onSaved={onSaved}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ))}

      {tab === 'about' && (
        <ServiceUserAboutMeForm serviceUserId={serviceUserId} detail={detail} onSaved={onSaved} />
      )}

      {tab === 'photos' && <ServiceUserPhotosTab detail={detail} />}

      {tab === 'inventory' && <ServiceUserInventoryTab serviceUserId={serviceUserId} />}

      {tab === 'allergies' && (
        <ServiceUserAllergiesTab serviceUserId={serviceUserId} allergyCatalog={lookups?.allergies ?? []} />
      )}

      {tab === 'absences' && (
        <ServiceUserAbsencesTab
          serviceUserId={serviceUserId}
          absenceReasons={lookups?.absenceReasons ?? []}
        />
      )}

      {tab === 'incidents' && <ServiceUserIncidentsComplaintsPanel serviceUserId={serviceUserId} />}

      {tab === 'calendar' && <ServiceUserCalendarTab serviceUserId={serviceUserId} />}

      {tab === 'privacy' && <PlaceholderTab title="Privacy" />}

      {tab === 'dom' && (
        <ServiceUserDomCareTab serviceUserId={serviceUserId} detail={detail} onSaved={onSaved} />
      )}

      {tab === 'nfc' && <ServiceUserNfcTagsSection serviceUserId={serviceUserId} />}

      {tab === 'assessment' && (
        <ServiceUserInitialAssessmentEnterpriseTab
          serviceUserId={serviceUserId}
          displayName={(detail.preferredName?.trim() || detail.firstName || 'Client').trim()}
        />
      )}

      {tab === 'referrals' && (
        <ServiceUserReferralsTab
          serviceUserId={serviceUserId}
          displayName={(detail.preferredName?.trim() || [detail.firstName, detail.lastName].filter(Boolean).join(' ')).trim()}
        />
      )}

      {tab === 'funding' && (
        <ServiceUserFundingTab
          serviceUserId={serviceUserId}
          displayName={(detail.preferredName?.trim() || [detail.firstName, detail.lastName].filter(Boolean).join(' ')).trim()}
          contacts={detail.contacts}
          initialNhsNumber={detail.nhsNumber}
          initialSocialServicesRef={detail.socialServicesRef}
          onDetailPatch={onSaved}
        />
      )}

      {tab === 'charge-card' && <ServiceUserEditChargeCardPanel serviceUserId={serviceUserId} />}

      {tab === 'visits' && <ServiceUserEditVisitsPanel serviceUserId={serviceUserId} />}

      {tab === 'livein' && (
        <ServiceUserLiveInProfileTab serviceUserId={serviceUserId} contacts={detail.contacts ?? []} />
      )}
    </div>
  )
}

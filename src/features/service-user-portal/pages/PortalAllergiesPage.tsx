import { usePortalAllergies } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import { PortalReadOnlyField, PortalSection } from '@/features/service-user-portal/components/portal-display.util'

export default function PortalAllergiesPage() {
  const { data, isLoading } = usePortalAllergies()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading allergies…</p>
  }

  const allergies = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Allergies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Allergies recorded on your care record. Speak to your care team if anything needs updating.
        </p>
      </div>

      {allergies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No allergies recorded.</p>
      ) : (
        <div className="space-y-4">
          {allergies.map(a => (
            <PortalSection key={a.id} title={a.allergyName}>
              <PortalReadOnlyField label="Comment" value={a.comment} />
            </PortalSection>
          ))}
        </div>
      )}
    </div>
  )
}

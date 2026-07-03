import * as React from 'react'
import { Plus } from 'lucide-react'
import { usePortalAllergies } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import { PortalAddAllergyDialog } from '@/features/service-user-portal/components/PortalAddAllergyDialog'
import { PortalReadOnlyField, PortalSection } from '@/features/service-user-portal/components/portal-display.util'
import { Button } from '@/shared/ui/button'

export default function PortalAllergiesPage() {
  const { data, isLoading } = usePortalAllergies()
  const [addOpen, setAddOpen] = React.useState(false)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading allergies…</p>
  }

  const allergies = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Allergies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Allergies on your care record. Add any allergies your care team should know about.
          </p>
        </div>
        <Button type="button" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Add allergy
        </Button>
      </div>

      {allergies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">No allergies recorded yet.</p>
          <Button type="button" variant="outline" className="mt-4 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add your first allergy
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {allergies.map(a => (
            <PortalSection key={a.id} title={a.allergyName}>
              <PortalReadOnlyField label="Comment" value={a.comment} />
            </PortalSection>
          ))}
        </div>
      )}

      <PortalAddAllergyDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

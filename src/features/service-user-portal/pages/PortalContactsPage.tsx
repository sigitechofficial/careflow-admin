import * as React from 'react'
import { Plus } from 'lucide-react'
import { usePortalContacts } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import { PortalAddContactDialog } from '@/features/service-user-portal/components/PortalAddContactDialog'
import { PortalReadOnlyField, PortalSection } from '@/features/service-user-portal/components/portal-display.util'
import { Button } from '@/shared/ui/button'

export default function PortalContactsPage() {
  const { data, isLoading } = usePortalContacts()
  const [addOpen, setAddOpen] = React.useState(false)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading contacts…</p>
  }

  const contacts = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People linked to your care record. You can add family, friends, or other contacts here.
          </p>
        </div>
        <Button type="button" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Add contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">No contacts on your record yet.</p>
          <Button type="button" variant="outline" className="mt-4 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add your first contact
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map(c => (
            <PortalSection key={c.id} title={c.name || 'Contact'}>
              <div className="mb-3 flex flex-wrap gap-2">
                {c.isPrimary ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Primary
                  </span>
                ) : null}
                {c.isEmergencyContact ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Emergency
                  </span>
                ) : null}
                {c.canReceiveUpdates ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Receives updates
                  </span>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PortalReadOnlyField label="Relationship" value={c.relationship} />
                <PortalReadOnlyField label="Phone" value={c.phone} />
                <PortalReadOnlyField label="Mobile" value={c.mobile} />
                <PortalReadOnlyField label="Email" value={c.email} />
                <PortalReadOnlyField label="Address" value={c.address} />
                <PortalReadOnlyField label="Notes" value={c.notes} />
              </div>
            </PortalSection>
          ))}
        </div>
      )}

      <PortalAddContactDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

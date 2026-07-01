import { PortalAboutMeForm } from '@/features/service-user-portal/components/PortalAboutMeForm'
import { usePortalAboutMe } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import { defaultAboutMe } from '@/features/service-users/service-user-about-me'

export default function PortalAboutMePage() {
  const { data, isLoading, refetch } = usePortalAboutMe()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading About Me…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">About Me</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell your care team what matters to you — daily routines, preferences, and how you like to be supported.
        </p>
      </div>
      <PortalAboutMeForm initialAboutMe={data ?? defaultAboutMe()} onSaved={() => void refetch()} />
    </div>
  )
}

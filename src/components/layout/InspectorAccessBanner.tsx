import { Eye } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'

/**
 * A temporary inspector's sessions: says the access is read-only, whose records it covers and when it ends. Shown
 * under the top bar on every page; nothing for other accounts.
 */
export function InspectorAccessBanner() {
  const user = useAuthStore(s => s.user)
  if (user?.role !== 'temporary_inspector') return null
  const access = user.inspectorAccess
  const count = access?.serviceUserIds.length ?? 0
  const until = access?.validTo ? formatOrganisationDateTime(access.validTo) : null
  return (
    <div
      role="status"
      data-testid="inspector-access-banner"
      className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground md:px-[22px]"
    >
      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-medium text-foreground">Read-only inspector access</span>
        {' · '}
        {count ? `${count} chosen service user${count === 1 ? '' : 's'}` : 'all service users'}
        {until ? ` · until ${until}` : ''}
      </span>
    </div>
  )
}

import { cn } from '@/shared/lib/utils'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { useCompanyStore } from '@/store/company.store'

type Props = {
  collapsed?: boolean
  className?: string
}

/** Sidebar / auth header brand: display logo + organisation name from company profile. */
export function CompanyBrandMark({ collapsed, className }: Props) {
  const branding = useCompanyStore(s => s.branding)
  const title = branding?.displayName?.trim() || 'CareAdmin'
  const subtitle = branding?.groupName?.trim() || 'Care Management'
  const logoSrc = resolveMediaUrl(branding?.displayLogoUrl, branding?.updatedAt)

  return (
    <div className={cn('flex items-center gap-3 overflow-hidden', className)}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {title.slice(0, 2).toUpperCase()}
        </div>
      )}
      {!collapsed && (
        <div className="flex min-w-0 flex-col animate-fade-in">
          <span className="truncate font-display text-sm font-bold leading-tight text-foreground">
            {title}
          </span>
          <span className="truncate text-[10px] leading-tight text-muted-foreground">{subtitle}</span>
        </div>
      )}
    </div>
  )
}

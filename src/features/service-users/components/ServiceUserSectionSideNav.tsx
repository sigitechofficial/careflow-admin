import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function ServiceUserSectionSideNav<T extends string>({
  tabs,
  activeId,
  onSelect,
  ariaLabel,
  testId,
  tabTestIdPrefix,
}: {
  tabs: { id: T; label: string; Icon: LucideIcon; iconClassName?: string }[]
  activeId: T
  onSelect: (id: T) => void
  ariaLabel: string
  testId: string
  tabTestIdPrefix: string
}) {
  return (
    <nav
      className={cn(
        'flex shrink-0 gap-0.5 overflow-x-auto',
        'border-b border-border bg-muted/30 p-2',
        'md:sticky md:top-0 md:h-fit md:max-h-[calc(100dvh-5rem)] md:w-60 md:flex-col md:overflow-y-auto md:overflow-x-visible',
        'md:border-b-0 md:border-r',
      )}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {tabs.map(tab => {
        const Icon = tab.Icon
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`${tabTestIdPrefix}${tab.id}`}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
              isActive
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border md:border-l-2 md:border-l-primary md:pl-[10px] md:ring-0'
                : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0',
                tab.iconClassName ?? (isActive ? 'text-primary' : 'text-muted-foreground'),
              )}
              strokeWidth={2}
              aria-hidden
            />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

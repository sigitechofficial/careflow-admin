import * as React from "react"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  maxVisible?: number
  separator?: React.ReactNode
  className?: string
}

export function Breadcrumbs({ items, maxVisible = 4, separator, className }: BreadcrumbsProps) {
  const [expanded, setExpanded] = React.useState(false)

  const sep = separator ?? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

  let visible = items
  if (!expanded && items.length > maxVisible) {
    visible = [items[0], { label: "...", href: undefined }, ...items.slice(-(maxVisible - 2))]
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1 flex-wrap">
        {visible.map((item, i) => {
          const isLast = i === visible.length - 1
          const isEllipsis = item.label === "..."
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>{sep}</span>}
              {isEllipsis ? (
                <button
                  onClick={() => setExpanded(true)}
                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent transition-colors"
                  title="Show all"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ) : isLast ? (
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.icon && <span>{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  {item.icon && <span>{item.icon}</span>}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

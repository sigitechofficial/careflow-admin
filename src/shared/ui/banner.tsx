import * as React from "react"
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, Megaphone } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type BannerVariant = "info" | "warning" | "success" | "destructive" | "announcement"

interface BannerProps {
  variant?: BannerVariant
  title?: string
  message: React.ReactNode
  action?: { label: string; onClick: () => void }
  dismissible?: boolean
  onDismiss?: () => void
  icon?: React.ReactNode
  sticky?: boolean
  className?: string
}

const variantConfig: Record<BannerVariant, { bg: string; text: string; icon: React.ReactNode }> = {
  info:         { bg: "bg-info/10 border-info/30",         text: "text-info",        icon: <Info className="h-4 w-4" /> },
  warning:      { bg: "bg-warning/10 border-warning/30",   text: "text-warning",     icon: <AlertTriangle className="h-4 w-4" /> },
  success:      { bg: "bg-success/10 border-success/30",   text: "text-success",     icon: <CheckCircle className="h-4 w-4" /> },
  destructive:  { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", icon: <AlertCircle className="h-4 w-4" /> },
  announcement: { bg: "bg-primary/10 border-primary/30",   text: "text-primary",     icon: <Megaphone className="h-4 w-4" /> },
}

export function Banner({ variant = "info", title, message, action, dismissible, onDismiss, icon, sticky, className }: BannerProps) {
  const [dismissed, setDismissed] = React.useState(false)
  const cfg = variantConfig[variant]

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div className={cn(
      "flex items-start gap-3 border px-4 py-3",
      cfg.bg,
      sticky && "sticky top-0 z-40",
      className
    )}>
      <span className={cn("mt-0.5 shrink-0", cfg.text)}>{icon ?? cfg.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={cn("text-sm font-semibold", cfg.text)}>{title}</p>}
        <p className={cn("text-sm", title ? "text-foreground/80 mt-0.5" : cfg.text)}>{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action && (
          <button
            onClick={action.onClick}
            className={cn("text-sm font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity", cfg.text)}
          >
            {action.label}
          </button>
        )}
        {dismissible && (
          <button onClick={handleDismiss} className={cn("rounded hover:opacity-70 transition-opacity p-0.5", cfg.text)}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Banner group (stacked) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface BannerGroupProps {
  banners: (BannerProps & { id: string })[]
  className?: string
}

export function BannerGroup({ banners, className }: BannerGroupProps) {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set())
  return (
    <div className={cn("space-y-0", className)}>
      {banners.filter(b => !dismissed.has(b.id)).map(b => (
        <Banner key={b.id} {...b} onDismiss={() => setDismissed(s => new Set([...s, b.id]))} />
      ))}
    </div>
  )
}

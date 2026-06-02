import * as React from "react"
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export interface SparklineCardProps {
  title: string
  value: string | number
  change?: number       // percentage e.g. 12.5 = +12.5%
  changeLabel?: string  // e.g. "vs last month"
  data: { value: number }[]
  color?: string
  prefix?: string
  suffix?: string
  className?: string
}

export function SparklineCard({
  title, value, change, changeLabel = "vs last period",
  data, color = "var(--color-primary)", prefix, suffix, className,
}: SparklineCardProps) {
  const isPositive = (change ?? 0) > 0
  const isNeutral = change === 0 || change === undefined

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-display font-bold text-foreground tabular-nums">
            {prefix}{value}{suffix}
          </p>
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold shrink-0",
            isNeutral && "bg-muted text-muted-foreground",
            !isNeutral && isPositive && "bg-success/10 text-success",
            !isNeutral && !isPositive && "bg-destructive/10 text-destructive",
          )}>
            {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isNeutral ? "â€”" : `${isPositive ? "+" : ""}${change}%`}
          </div>
        )}
      </div>

      {/* Sparkline */}
      {data.length > 0 && (
        <div className="h-12 w-full -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: 4 }}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ display: "none" }}
                cursor={false}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${title})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {change !== undefined && (
        <p className="text-[10px] text-muted-foreground">{changeLabel}</p>
      )}
    </div>
  )
}

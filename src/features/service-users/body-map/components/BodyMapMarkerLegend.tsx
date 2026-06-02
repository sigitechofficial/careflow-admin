import { ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'

const LEGEND_ITEMS: { swatch: string; label: string }[] = [
  { swatch: 'bg-red-600', label: 'Injury / mark' },
  { swatch: 'bg-violet-600', label: 'Wound' },
  { swatch: 'bg-orange-600', label: 'Pressure area' },
  { swatch: 'bg-blue-600', label: 'Medication site' },
  { swatch: 'bg-blue-500', label: 'Patch site' },
  { swatch: 'bg-teal-600', label: 'Injection site' },
  { swatch: 'bg-cyan-600', label: 'Spray site' },
  { swatch: 'bg-pink-600', label: 'Pain' },
  { swatch: 'bg-yellow-600', label: 'Skin condition' },
  { swatch: 'bg-red-900', label: 'Safeguarding' },
]

export function BodyMapMarkerLegend() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[10px] text-muted-foreground">
          Legend
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-2">
        <p className="mb-1.5 px-1 text-[10px] font-medium text-muted-foreground">
          Pin colour = record type (subtype for meds)
        </p>
        <ul className="space-y-1">
          {LEGEND_ITEMS.map(item => (
            <li key={item.label} className="flex items-center gap-2 text-xs">
              <span className={cn('size-3 shrink-0 rounded-full border border-white shadow-sm', item.swatch)} />
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
          Numbers are the order records were opened (oldest = 1). Each record has one pin on the map.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

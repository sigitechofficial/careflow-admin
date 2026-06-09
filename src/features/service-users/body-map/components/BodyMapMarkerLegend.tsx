import { ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import {
  bodyMapLegendItems,
  buildBodyMapMarkerColorCatalog,
} from '@/features/service-users/body-map/utils/body-map-marker-colors'

export function BodyMapMarkerLegend() {
  const lookupsQuery = useBodyMapLookups()
  const catalog = buildBodyMapMarkerColorCatalog(lookupsQuery.data?.recordTypes)
  const items = bodyMapLegendItems(catalog)

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
          {items.map(item => (
            <li key={item.label} className="flex items-center gap-2 text-xs">
              <span
                className="size-3 shrink-0 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
          Colours are managed in Settings → Lookup Data → Record types.
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Numbers are the order records were opened (oldest = 1). Each record has one pin on the map.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { Search } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { LocationLookup } from '@/features/settings/location-management/location-management.types'

export const BULK_GENERATE_ROTA_LOCATION_ALL = '__all__'

type Props = {
  search: string
  locationId: string
  locationFilterDisabled?: boolean
  listReadyOnly: boolean
  locations: LocationLookup[]
  onSearchChange: (value: string) => void
  onLocationIdChange: (value: string) => void
  onListReadyOnlyChange: (value: boolean) => void
}

export function BulkGenerateRotaCandidatesToolbar({
  search,
  locationId,
  locationFilterDisabled = false,
  listReadyOnly,
  locations,
  onSearchChange,
  onLocationIdChange,
  onListReadyOnlyChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search service users…"
          className="h-9 w-52 pl-8"
        />
      </div>
      <Select
        value={locationId || BULK_GENERATE_ROTA_LOCATION_ALL}
        onValueChange={(v) => onLocationIdChange(v === BULK_GENERATE_ROTA_LOCATION_ALL ? '' : v)}
        disabled={locationFilterDisabled}
      >
        <SelectTrigger className="h-9 w-44" data-testid="bulk-rota-location-filter">
          <SelectValue placeholder="All locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BULK_GENERATE_ROTA_LOCATION_ALL}>All locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
        <input
          type="checkbox"
          checked={listReadyOnly}
          onChange={(e) => onListReadyOnlyChange(e.target.checked)}
        />
        Ready only
      </label>
    </div>
  )
}

import * as React from "react"
import { MapPin, Navigation, ExternalLink, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"

export interface MapLocation {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: "service-user" | "office" | "carer" | "other"
  badge?: string
}

interface MapViewProps {
  locations?: MapLocation[]
  selectedId?: string
  onSelect?: (location: MapLocation) => void
  showList?: boolean
  height?: number
  className?: string
}

const typeColors: Record<string, string> = {
  "service-user": "bg-primary",
  "office": "bg-info",
  "carer": "bg-success",
  "other": "bg-muted-foreground",
}

const typeLabels: Record<string, string> = {
  "service-user": "Service User",
  "office": "Office",
  "carer": "Carer",
  "other": "Other",
}

function buildMapUrl(locations: MapLocation[], selected?: string) {
  if (locations.length === 0) return `https://www.openstreetmap.org/export/embed.html?bbox=-2.5,51.4,-2.0,51.6&layer=mapnik`
  const loc = locations.find(l => l.id === selected) ?? locations[0]
  const zoom = 14
  const bbox = {
    minLon: loc.lng - 0.02, maxLon: loc.lng + 0.02,
    minLat: loc.lat - 0.01, maxLat: loc.lat + 0.01,
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&layer=mapnik&marker=${loc.lat},${loc.lng}`
}

export function MapView({ locations = [], selectedId, onSelect, showList = true, height = 320, className }: MapViewProps) {
  const [copied, setCopied] = React.useState(false)
  const selected = locations.find(l => l.id === selectedId) ?? locations[0]

  const copyAddress = () => {
    if (!selected) return
    navigator.clipboard.writeText(selected.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("rounded-xl border border-border overflow-hidden bg-background", className)}>
      <div className={cn("flex", showList && locations.length > 1 ? "flex-col md:flex-row" : "flex-col")}>
        {/* Map iframe */}
        <div className="flex-1 relative" style={{ height }}>
          <iframe
            src={buildMapUrl(locations, selectedId)}
            className="w-full h-full border-0"
            title="Map"
            loading="lazy"
          />
          {/* Overlay info */}
          {selected && (
            <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className={cn("mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0", typeColors[selected.type ?? "other"])}>
                    <MapPin className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{selected.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selected.address}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon-sm" variant="ghost" onClick={copyAddress} title="Copy address">
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">
                    <Button size="icon-sm" variant="ghost" title="Open in Google Maps">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location list */}
        {showList && locations.length > 1 && (
          <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-border overflow-y-auto" style={{ maxHeight: height }}>
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => onSelect?.(loc)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2.5 text-left border-b border-border last:border-b-0 transition-colors",
                  loc.id === (selectedId ?? locations[0].id)
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-accent/50"
                )}
              >
                <div className={cn("mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0", typeColors[loc.type ?? "other"])}>
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{loc.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{loc.address}</p>
                  {loc.type && <span className="text-[9px] text-muted-foreground">{typeLabels[loc.type]}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

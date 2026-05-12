import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Country {
  code: string
  name: string
  dial: string
  flag: string
}

const COUNTRIES: Country[] = [
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { code: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
]

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  defaultCountry?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "GB",
  disabled,
  placeholder = "Phone number",
  className,
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [country, setCountry] = React.useState<Country>(
    () => COUNTRIES.find(c => c.code === defaultCountry) ?? COUNTRIES[0]
  )
  const [number, setNumber] = React.useState(value)

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleChange = (v: string) => {
    const cleaned = v.replace(/[^\d\s\-()]/g, "")
    setNumber(cleaned)
    onChange?.(`${country.dial}${cleaned}`)
  }

  const selectCountry = (c: Country) => {
    setCountry(c)
    setOpen(false)
    onChange?.(`${c.dial}${number}`)
  }

  return (
    <div className={cn(
      "flex h-10 items-center rounded-lg border border-border bg-background text-sm transition-colors",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      {/* Country selector */}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            disabled={disabled}
            className={cn(
              "flex h-full items-center gap-1.5 border-r border-border px-3 text-sm transition-colors",
              "hover:bg-muted/50 rounded-l-lg"
            )}
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-muted-foreground text-xs">{country.dial}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className="z-50 w-72 rounded-lg border border-border bg-popover shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            align="start"
            sideOffset={4}
          >
            <div className="border-b border-border px-3 py-2">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-60 overflow-y-auto p-1">
              {filtered.map(c => (
                <li key={c.code}>
                  <button
                    onClick={() => selectCountry(c)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      c.code === country.code && "bg-accent/50"
                    )}
                  >
                    <span>{c.flag}</span>
                    <span className="flex-1 text-left">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.dial}</span>
                    {c.code === country.code && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={e => handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

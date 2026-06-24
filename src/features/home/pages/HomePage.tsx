import * as React from 'react'
import {
  MessageSquare, ClipboardList, LayoutDashboard,
  AlertTriangle, Calendar, Search, X, ChevronLeft,
  ChevronRight, ChevronsLeft, Dot,
  Filter,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'

/* â”€â”€â”€ Sample data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const handoverEntries = [
  {
    id: 1,
    name: 'Jerome Bartholomew',
    time: '21:00 (07/05/2026)',
    task: 'Bed Time Checks',
    carer: 'Ahmad Alam',
    notes:
      'Ahmad Alam: Jerome started off his time sitting in the living room and watching TV. After a while, he headed outside to grab some snacks and drinks for himself. When he came back inside, he went straight to the back room to smoke and eat what he had bought. He then walked into the living room to collect his speaker and brought it back with him to the back room. He spent some time there playing music and relaxing. After that, he went upstairs to his room with the speaker for the rest of the time.',
  },
  {
    id: 2,
    name: 'Kaiyan Young',
    time: '19:30 (07/05/2026)',
    task: 'bed checks',
    carer: 'Ahmad Alam',
    notes:
      'Ahmad Alam: Kaiyan spent a long time in the living area focusing on his games before deciding to switch over to the TV. While relaxing, he ordered a pizza and continued watching his shows once the food arrived. After he finished eating, he followed a quick reminder to throw away the empty box to keep the space tidy. For the rest of the evening, he stayed settled on the sofa, keeping himself busy by multitasking between the TV and his phone.',
  },
  {
    id: 3,
    name: 'Marcus Reid',
    time: '18:00 (07/05/2026)',
    task: 'Evening Support',
    carer: 'Briana adjei',
    notes:
      'Briana adjei: Marcus had a calm and comfortable evening. He prepared a light meal for himself with some assistance and watched his favourite programmes on TV. He was in good spirits throughout the shift and engaged well with staff. He retired to bed at his usual time without any issues.',
  },
  {
    id: 4,
    name: 'Sophie Langley',
    time: '17:00 (07/05/2026)',
    task: 'Personal Care',
    carer: 'Saima Ahmad',
    notes:
      'Saima Ahmad: Sophie received full personal care this evening. She was cooperative and in a positive mood. After care she sat in the lounge and enjoyed a cup of tea while listening to the radio. She expressed that she was feeling well and had no complaints.',
  },
]

const systemUpgrades = [
  {
    section: 'New Navigation',
    items: [
      'Streamlined menus to navigate the care system',
      'Updated look and feel of the settings screen',
    ],
  },
  {
    section: 'PainChek Enhancements',
    items: ['Send Service User location information to your PainChek product'],
  },
]

type SortBy = 'name' | 'earliest' | 'latest'

/* â”€â”€â”€ Home Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function HomePage() {
  const [showFilter, setShowFilter] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortBy>('name')
  const [dateRange, setDateRange] = React.useState('07/05/2026 - 08/05/2026')
  const [serviceUserSearch, setServiceUserSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [dismissed, setDismissed] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDismissed(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  const PAGE_SIZE = 2
  const totalPages = Math.ceil(handoverEntries.length / PAGE_SIZE)

  const sorted = [...handoverEntries].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'earliest') return a.time.localeCompare(b.time)
    return b.time.localeCompare(a.time)
  })

  const filtered = serviceUserSearch
    ? sorted.filter(e => e.name.toLowerCase().includes(serviceUserSearch.toLowerCase()))
    : sorted

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilter = () => {
    setServiceUserSearch('')
    setDateRange('07/05/2026 - 08/05/2026')
  }

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            My Action Page
          </div>
          <p className="text-sm text-muted-foreground">
            Your daily overview, handovers, and quick actions.
          </p>
        </div>
      </div>

      {/* â”€â”€ System Maintenance Banner â”€â”€ */}
      {!dismissed && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-6 py-4 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              <h2 className="text-xl font-bold text-foreground">System Maintenance</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">
              We'll be carrying out scheduled system maintenance on Monday 11th May. During this time, the system will be unavailable for approximately one hour between 4:00am and 6:00am.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl">
              We recommend saving any work and ensuring you have the information you need in advance, as access will be temporarily interrupted.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl">
              We apologise for any inconvenience this may cause and appreciate your understanding while we complete these essential updates.
            </p>
          </div>
        </div>
      )}

      {/* â”€â”€ Two-column layout â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* â”€â”€ Left column (2/3) â”€â”€ */}
        <div className="lg:col-span-2 space-y-5">

          {/* My Actions card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>My Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActionRow
                icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
                text={<>You have <strong>0</strong> new message. <ActionLink>Read Message(s)</ActionLink></>}
              />
              <ActionRow
                icon={<ClipboardList className="h-5 w-5 text-teal-500" />}
                text={<>You have <strong>9</strong> Audit Actions pending. <ActionLink>Audit Action(s)</ActionLink></>}
              />
              <ActionRow
                icon={<LayoutDashboard className="h-5 w-5 text-green-500" />}
                text={<ActionLink>View my Management Dashboard</ActionLink>}
              />
            </CardContent>
          </Card>

          {/* Handover Report card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Handover Report</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowFilter(f => !f)}
                >
                  {showFilter ? 'Hide Filter' : 'Show Filter'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter panel */}
              {showFilter && (
                <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                  {/* Date range */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium w-36 shrink-0">Select Date</label>
                    <div className="flex gap-2 flex-1 min-w-[220px]">
                      <input
                        type="text"
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="dd/mm/yyyy - dd/mm/yyyy"
                      />
                      <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary/90 transition-colors">
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Service user name */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium w-36 shrink-0">Service User Name</label>
                    <div className="flex gap-2 flex-1 min-w-[220px]">
                      <input
                        type="text"
                        value={serviceUserSearch}
                        onChange={e => setServiceUserSearch(e.target.value)}
                        placeholder="Service User Name"
                        className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary/90 transition-colors">
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Clear filter */}
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilter}
                      className="flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear Filter
                    </button>
                  </div>
                </div>
              )}

              {/* Sort options */}
              <div className="flex items-center gap-5 flex-wrap">
                <span className="text-sm text-muted-foreground">Sort report by</span>
                {([
                  { value: 'name',     label: 'Service User Name' },
                  { value: 'earliest', label: 'Sort by Time Earliest' },
                  { value: 'latest',   label: 'Sort by Time Latest' },
                ] as { value: SortBy; label: string }[]).map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      checked={sortBy === opt.value}
                      onChange={() => { setSortBy(opt.value); setPage(1) }}
                      className="h-4 w-4 accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              {/* Entries */}
              <div className="space-y-5 divide-y divide-border">
                {paged.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No entries found.</p>
                ) : paged.map(entry => (
                  <div key={entry.id} className="pt-4 first:pt-0">
                    <button className="text-primary hover:underline font-semibold text-sm text-left">
                      {entry.name}
                    </button>
                    <p className="text-sm font-medium mt-0.5">
                      {entry.time} - {entry.task} - {entry.carer}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-4">
                      {entry.notes}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-1 pt-2">
                  <PaginationBtn onClick={() => setPage(1)} disabled={page === 1}>
                    <ChevronsLeft className="h-3.5 w-3.5" />
                    <span>First Page</span>
                  </PaginationBtn>
                  <PaginationBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </PaginationBtn>
                  <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                  <PaginationBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </PaginationBtn>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* â”€â”€ Right column (1/3) â”€â”€ */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-5">
              <h2 className="font-bold text-base mb-4">System Upgrades 27/01/2026</h2>
              <div className="space-y-4">
                {systemUpgrades.map(group => (
                  <div key={group.section}>
                    <p className="text-sm font-medium mb-2">{group.section}</p>
                    <ul className="space-y-1.5">
                      {group.items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Dot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* â”€â”€ Version footer â”€â”€ */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Version Number - 5.9.2</span>
        <span>Licence expire on 31 Dec 50</span>
      </div>
    </div>
  )
}

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ActionRow({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function ActionLink({ children }: { children: React.ReactNode }) {
  return (
    <button className="font-bold text-foreground hover:text-primary hover:underline transition-colors">
      {children}
    </button>
  )
}

function PaginationBtn({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded border border-border text-xs transition-colors',
        disabled
          ? 'opacity-40 cursor-not-allowed bg-muted'
          : 'hover:bg-muted bg-background'
      )}
    >
      {children}
    </button>
  )
}

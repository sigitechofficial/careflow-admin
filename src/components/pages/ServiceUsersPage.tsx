import * as React from 'react'
import {
  Search, SlidersHorizontal, Eye, Heart, User, Calendar,
  Paperclip, Plus, Users, Trash2, UserCheck, UserX, Circle,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Types ──────────────────────────────────────────────────── */
type BorderColor = 'teal' | 'gold' | 'grey'

interface ServiceUser {
  id: number
  name: string
  forResus: boolean
  dob: string
  nhs?: string
  address: string
  keyWorker?: string
  namedNurse?: string
  alertActive: boolean
  suspended: boolean
  border: BorderColor
}

/* ─── Data ───────────────────────────────────────────────────── */
const BORDER: Record<BorderColor, string> = {
  teal: '#2a9d8f',
  gold: '#e9a825',
  grey: '#9ca3af',
}

const serviceUsers: ServiceUser[] = [
  { id: 1,  name: 'Nana Ababio',                    forResus: true,  dob: '30-01-1951', address: '2 Gonville Road, CR7 6DA',       keyWorker: 'Croydon Four', namedNurse: 'Renee Powell',   alertActive: false, suspended: false, border: 'teal' },
  { id: 2,  name: 'Amina Abbasi',                   forResus: true,  dob: '02-12-2023', address: '7 Hutton Road, B20 3RB',          alertActive: false, suspended: false, border: 'gold' },
  { id: 3,  name: 'Yaqut Abdulqadir',               forResus: true,  dob: '01-01-2001', address: '4b Bramley Close, CR2 6NQ',       keyWorker: 'Croydon One',  namedNurse: 'Sabeeh Zanair',  alertActive: false, suspended: false, border: 'gold' },
  { id: 4,  name: 'Gideon Agyeman Dua',             forResus: true,  dob: '02-09-1989', nhs: '6386842294', address: '290 Longheath Gardens, CR0 7TZ', keyWorker: 'Croydon Two', namedNurse: 'Grace Tanimomo', alertActive: true, suspended: false, border: 'teal' },
  { id: 5,  name: 'Sarah Alasomuka',                forResus: true,  dob: '10-02-1943', nhs: '4866205253', address: '1 Aspen Court, CR2 0NH',         keyWorker: 'Croydon One',  alertActive: false, suspended: true,  border: 'grey' },
  { id: 6,  name: 'Dion Allen',                     forResus: true,  dob: '24-02-1968', address: 'Flat 4, SE19 3LR',               keyWorker: 'Croydon Five',  alertActive: false, suspended: true,  border: 'grey' },
  { id: 7,  name: 'Preston Allen',                  forResus: true,  dob: '28-04-2010', address: 'Flat 23, SE9 2PF',               alertActive: false, suspended: true,  border: 'grey' },
  { id: 8,  name: 'Sathyabhama Amma Pillai PRIVATE',forResus: true,  dob: '01-01-1935', address: '76 Nightingale Road, CR2 8PT',   alertActive: false, suspended: true,  border: 'grey' },
  { id: 9,  name: 'Matilda Cole And Emma Cole',     forResus: true,  dob: '24-03-2010', address: 'The Mansion, DA6 8HL',           alertActive: false, suspended: false, border: 'teal' },
  { id: 10, name: 'Sonia Anson',                    forResus: true,  dob: '23-02-1967', nhs: '432 968 7615', address: '10 Lavender Road, CR0 3BH', keyWorker: 'Croydon Three', namedNurse: 'Briana adjei', alertActive: false, suspended: false, border: 'teal' },
  { id: 11, name: 'Ezekiel Asare',                  forResus: true,  dob: '18-05-2015', nhs: '000000',     address: '14 Elgin Road, CR0 6XA',        alertActive: false, suspended: false, border: 'teal' },
  { id: 12, name: 'Thomas Ashby',                   forResus: false, dob: '14-07-1958', address: '22 Manor Road, SE23 1PH',        keyWorker: 'Croydon Two',   alertActive: false, suspended: false, border: 'gold' },
]

/* ─── Teal circular button ───────────────────────────────────── */
const TEAL = '#4db8c8'
const TEAL_DARK = '#3aa8b8'

function TealCircleBtn({
  children, title, active = false, activeClass = '',
}: {
  children: React.ReactNode
  title?: string
  active?: boolean
  activeClass?: string
}) {
  return (
    <button
      title={title}
      className={cn(
        'h-8 w-8 rounded-full border flex items-center justify-center shrink-0 transition-colors',
        active
          ? cn('text-white border-transparent', activeClass)
          : 'text-[#4db8c8] border-[#4db8c8] hover:bg-[#4db8c8]/10'
      )}
    >
      <span className="flex items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
        {children}
      </span>
    </button>
  )
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function SuAvatar({ border }: { border: BorderColor }) {
  return (
    <div
      className="h-16 w-16 rounded-full flex flex-col items-center justify-center shrink-0 bg-gray-100 border-2 overflow-hidden"
      style={{ borderColor: BORDER[border] }}
    >
      <User className="h-6 w-6 text-gray-400 mb-0.5" strokeWidth={1.5} />
      <span className="text-[6.5px] text-gray-400 font-medium text-center leading-tight px-1">
        NO IMAGE<br />AVAILABLE
      </span>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ServiceUsersPage() {
  const [search, setSearch]           = React.useState('')
  const [kwSearch, setKwSearch]       = React.useState('')
  const [status, setStatus]           = React.useState('In service')

  const filtered = serviceUsers.filter(u => {
    const matchName = u.name.toLowerCase().includes(search.toLowerCase())
    const matchKW   = !kwSearch || (u.keyWorker ?? '').toLowerCase().includes(kwSearch.toLowerCase())
    return matchName && matchKW
  })

  return (
    <div className="flex flex-col min-h-full w-full">
      <div className="p-4">
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Service User Management
            </div>
            <p className="text-sm text-muted-foreground">
              Search, filter, and manage service users.
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="bg-background border-b border-border px-4 py-2.5 flex items-center gap-2 flex-wrap">

        {/* Filter icon */}
        <button className="h-8 w-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
        </button>

        {/* Search: service user */}
        <div className="flex shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Service User/Location/U..."
            className="h-9 w-52 rounded-l-md border border-border border-r-0 bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            style={{ background: TEAL, borderColor: TEAL }}
            className="h-9 px-3 border rounded-r-md text-white hover:opacity-90 transition-opacity"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Search: key worker */}
        <div className="flex shrink-0">
          <input
            value={kwSearch}
            onChange={e => setKwSearch(e.target.value)}
            placeholder="Search Key Worker/Named Nu..."
            className="h-9 w-48 rounded-l-md border border-border border-r-0 bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            style={{ background: TEAL, borderColor: TEAL }}
            className="h-9 px-3 border rounded-r-md text-white hover:opacity-90 transition-opacity"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Select + filter icon row */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground font-medium mr-0.5">Select</span>
          {/* 8 filter icons */}
          {[
            { icon: <User />,       title: 'All users' },
            { icon: <UserCheck />,  title: 'Active users' },
            { icon: <Users />,      title: 'Group' },
            { icon: <Heart />,      title: 'Health' },
            { icon: <Circle />,     title: 'Unassigned' },
            { icon: <Users />,      title: 'Team' },
            { icon: <UserX />,      title: 'Discharged' },
            { icon: <Trash2 />,     title: 'Deleted' },
          ].map((item, i) => (
            <TealCircleBtn key={i} title={item.title}>
              {item.icon}
            </TealCircleBtn>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {['In service', 'All', 'Discharged', 'Suspended', 'Deceased'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Service user table (match EmployeePage table design) ─ */}
      <div className="p-4">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[
                  { label: 'Picture', filter: false },
                  { label: 'Service User Name', filter: true },
                  { label: 'DOB / NHS', filter: true },
                  { label: 'Address', filter: true },
                  { label: 'Key Worker', filter: true },
                  { label: 'Named Nurse', filter: true },
                  { label: 'Actions', filter: false },
                ].map(col => (
                  <th
                    key={col.label}
                    className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.filter && <Filter className="h-3 w-3 opacity-60" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr className="border-b border-border last:border-0">
                  <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    No service users found.
                  </td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <SuAvatar border={user.border} />
                    </td>

                    <td className="px-3 py-3 font-medium whitespace-nowrap">
                      <button className="hover:underline text-left">
                        {user.name}
                      </button>
                      {user.forResus && (
                        <span className="text-red-500 font-medium">, For Resus</span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      <div className="leading-snug">
                        <div>DOB: {user.dob}</div>
                        {user.nhs && <div>NHS: {user.nhs}</div>}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-muted-foreground min-w-[260px]">
                      {user.address}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {user.keyWorker ?? '—'}
                    </td>

                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {user.namedNurse ?? '—'}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <TealCircleBtn title="View"><Eye /></TealCircleBtn>
                        <TealCircleBtn title="Health"><Heart /></TealCircleBtn>
                        <TealCircleBtn title="Profile"><User /></TealCircleBtn>
                        <TealCircleBtn title="Appointments"><Calendar /></TealCircleBtn>
                        <TealCircleBtn title="Documents"><Paperclip /></TealCircleBtn>
                        <TealCircleBtn title="Incident" active={user.alertActive} activeClass="bg-red-500">
                          <Plus />
                        </TealCircleBtn>
                        <TealCircleBtn title="Team"><Users /></TealCircleBtn>
                        <TealCircleBtn
                          title={user.suspended ? 'Suspended' : 'Suspend'}
                          active={user.suspended}
                          activeClass="bg-red-500"
                        >
                          <Trash2 />
                        </TealCircleBtn>

                        <div className="w-px h-7 bg-border/80 mx-1 hidden sm:block" />

                        <div className="flex items-center gap-1">
                          {['CS', 'D', 'O', 'A', 'C', 'H'].map(l => (
                            <button
                              key={l}
                              className="h-8 w-8 rounded-full border border-[#4db8c8] text-[#4db8c8] flex items-center justify-center text-[10px] font-bold hover:bg-[#4db8c8]/10 transition-colors shrink-0"
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

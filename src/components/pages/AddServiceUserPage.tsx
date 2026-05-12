import * as React from 'react'
import { Info, Plus, Calendar, Search, Upload, User, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/* ─── Design tokens ─────────────────────────────────────────── */
const BLUE_DARK = '#4a6fa5'

/* ─── Atomic building blocks ────────────────────────────────── */

/** Blue circle info icon */
function InfoIcon() {
  return (
    <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 cursor-pointer select-none"
      style={{ background: '#3b82f6' }}>i</div>
  )
}

/** Blue circle + button */
function AddCircle({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0 hover:opacity-90 transition-opacity"
      style={{ background: '#3b82f6' }}>
      <Plus className="h-4 w-4" />
    </button>
  )
}

/** Text input */
function TInput({ placeholder = '', disabled }: { placeholder?: string; disabled?: boolean }) {
  return (
    <input
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400',
        disabled && 'bg-slate-100 cursor-not-allowed text-slate-400'
      )}
    />
  )
}

/** Select dropdown */
function TSelect({ placeholder, options = [] }: { placeholder?: string; options?: string[] }) {
  return (
    <select className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} className="text-slate-900">{o}</option>)}
    </select>
  )
}

/** Date input with calendar button */
function TDate() {
  return (
    <div className="flex w-full">
      <input placeholder="DD-MM-YYYY"
        className="h-9 flex-1 min-w-0 rounded-l border border-r-0 border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
      <button className="h-9 w-10 flex items-center justify-center rounded-r text-white shrink-0" style={{ background: BLUE_DARK }}>
        <Calendar className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Search input with search button */
function TSearch({ placeholder }: { placeholder?: string }) {
  return (
    <div className="flex w-full">
      <input placeholder={placeholder}
        className="h-9 flex-1 min-w-0 rounded-l border border-r-0 border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
      <button className="h-9 w-10 flex items-center justify-center rounded-r text-white shrink-0" style={{ background: BLUE_DARK }}>
        <Search className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Section card */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {children}
    </div>
  )
}

/** Blue section heading */
function SHead({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-blue-600 mb-6">{children}</h2>
}

/** Field label */
function FL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-medium text-slate-700 mb-1.5 whitespace-nowrap">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </p>
  )
}

/** Field wrapper – vertical stack of label then control */
function F({ label, required, info, children, className }: {
  label: string; required?: boolean; info?: boolean
  children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <FL required={required}>{label}</FL>
      <div className={cn('flex items-center gap-2', info && 'gap-1.5')}>
        <div className="flex-1 min-w-0">{children}</div>
        {info && <InfoIcon />}
      </div>
    </div>
  )
}

/** YES/NO toggle */
function Toggle() {
  const [on, setOn] = React.useState(false)
  return (
    <button onClick={() => setOn(v => !v)}
      className={cn('relative h-7 w-16 rounded-full transition-colors flex items-center shrink-0', on ? 'bg-blue-500' : 'bg-slate-400')}>
      <span className={cn('absolute h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-[calc(100%-22px)]' : 'left-1')} />
      <span className={cn('absolute text-[9px] font-bold text-white', on ? 'left-2' : 'right-2')}>{on ? 'YES' : 'NO'}</span>
    </button>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function AddServiceUserPage() {
  return (
    <div className="space-y-4 pb-16">
      {/* Consistent page header + spacing */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-muted-foreground" />
            Add Service User
          </div>
          <p className="text-sm text-muted-foreground">
            Enter personal, contact, and reference details to create a new service user.
          </p>
        </div>
      </div>

      {/* ── Top: Picture / NHS / Status ── */}
      <Section>
        <div className="flex flex-wrap items-center gap-8">
          {/* Picture */}
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-sm font-medium text-slate-700">Picture</p>
            <div className="h-16 w-16 rounded-full border-2 border-slate-300 bg-slate-100 flex flex-col items-center justify-center">
              <User className="h-5 w-5 text-slate-400 mb-0.5" strokeWidth={1.5} />
              <span className="text-[6.5px] text-slate-400 font-medium text-center leading-tight px-1">NO IMAGE<br />AVAILABLE</span>
            </div>
            <button className="h-9 w-9 rounded border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <Upload className="h-4 w-4" />
            </button>
          </div>

          {/* NHS Number */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <p className="text-sm font-medium text-slate-700 shrink-0">NHS Number</p>
            <div className="flex-1 max-w-sm"><TInput /></div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <p className="text-sm font-medium text-slate-700 shrink-0">
              Status<span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="flex-1 max-w-sm">
              <TSelect placeholder="Please select a Service User Status"
                options={['In Service','Discharged','Deceased','Suspended']} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Personal Details ── */}
      <Section>
        <SHead>Personal Details</SHead>

        {/* Row 1: First / Middle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="First Name" required info><TInput /></F>
          <F label="Middle Name" info><TInput /></F>
        </div>

        {/* Row 2: Last / Preferred */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Last Name" required info><TInput /></F>
          <F label="Preferred Name"><TInput /></F>
        </div>

        {/* Row 3: Title / Suffix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Title" required info>
            <TSelect placeholder="Select" options={['Mr','Mrs','Miss','Ms','Dr','Prof']} />
          </F>
          <F label="Suffix" info><TInput /></F>
        </div>

        {/* Row 4: Maiden / Place of Birth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Maiden Name" info><TInput /></F>
          <F label="Place of Birth">
            <TSelect placeholder="Please select place of birth" />
          </F>
        </div>

        {/* Row 5: DOB / Marital */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          {/* DOB with age */}
          <div className="flex flex-col">
            <FL required>Date of Birth</FL>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><TDate /></div>
              <span className="text-sm text-slate-500 whitespace-nowrap shrink-0">0 years</span>
            </div>
          </div>
          <F label="Marital Status">
            <TSelect placeholder="Please select a Marital Status"
              options={['Single','Married','Divorced','Widowed','Civil Partnership']} />
          </F>
        </div>

        {/* Row 6: Gender / Religion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Gender" required>
            <TSelect placeholder="Please select a Gender"
              options={['Male','Female','Non-binary','Prefer not to say']} />
          </F>
          <F label="Religion">
            <TSelect placeholder="Please select a Religion"
              options={['Christianity','Islam','Hinduism','Buddhism','Judaism','Sikhism','No religion','Other']} />
          </F>
        </div>

        {/* Row 7: Ethnicity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <F label="Ethnicity">
            <TSelect placeholder="Please select a Ethnicity" />
          </F>
          <div />
        </div>
      </Section>

      {/* ── Contact Details ── */}
      <Section>
        <SHead>Contact Details</SHead>

        {/* Preferred contact */}
        <div className="flex items-center gap-4 mb-5">
          <p className="text-sm font-medium text-slate-700 shrink-0">Preferred Contact Method</p>
          <div className="w-56">
            <TSelect placeholder="Please select contact method"
              options={['Phone','Email','Post','In Person']} />
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center gap-3 mb-5">
          <p className="text-sm font-medium text-slate-700">
            Address<span className="text-red-500 ml-0.5">*</span>
          </p>
          <AddCircle />
        </div>

        {/* Phone row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5 items-end">
          <F label="Phone Number"><TInput /></F>
          <F label="Phone Type">
            <TSelect placeholder="Please select phone type."
              options={['Mobile','Home','Work','Other']} />
          </F>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5 items-end">
          <div className="flex flex-col">
            <FL>Preference</FL>
            <div className="flex items-center gap-2">
              <div className="w-16"><TInput /></div>
              <AddCircle />
            </div>
          </div>
          <div />
        </div>

        {/* Email row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5 items-end">
          <F label="Email"><TInput /></F>
          <F label="Email Type">
            <TSelect placeholder="Please select email type."
              options={['Personal','Work','Other']} />
          </F>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5 items-end">
          <div className="flex flex-col">
            <FL>Preference</FL>
            <div className="flex items-center gap-2">
              <div className="w-16"><TInput /></div>
              <AddCircle />
            </div>
          </div>
          <div />
        </div>

        {/* Other contact */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col flex-1 max-w-2xl">
            <FL>Other Contact Method</FL>
            <TInput />
          </div>
          <AddCircle />
        </div>
      </Section>

      {/* ── Service User Login App Settings ── */}
      <Section>
        <SHead>Service User Login App Settings</SHead>
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-slate-700">Access Service User Application</p>
          <Toggle />
          <InfoIcon />
        </div>
      </Section>

      {/* ── Reference Information ── */}
      <Section>
        <SHead>Reference Information</SHead>

        {/* Row 1: ID / Location */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Service User ID"><TInput /></F>
          <F label="Location">
            <TSelect placeholder="Please select location" />
          </F>
        </div>

        {/* Row 2: Start / End / Death */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Service Start Date" required><TDate /></F>
          <F label="Service End Date"><TDate /></F>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Date of Death"><TDate /></F>
          <div />
        </div>

        {/* Row 3: Key Worker / Named Nurse */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Key Worker"><TSearch placeholder="Employee name..." /></F>
          <F label="Named Nurse"><TSearch placeholder="Nurse name..." /></F>
        </div>

        {/* Row 4: Funding / Category / NI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Funding Route">
            <TSelect placeholder="Please select a Funding Route"
              options={['Self-funded','Local Authority','NHS','Other']} />
          </F>
          <F label="Category of Care">
            <TSelect placeholder="Please select a Category of Care" />
          </F>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="NI Number"><TInput /></F>
          <div />
        </div>

        {/* Change Preference */}
        <div className="flex items-start gap-2 mb-5">
          <div className="flex flex-col flex-1 max-w-xs">
            <FL>Change Preference</FL>
            <textarea rows={4}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y" />
          </div>
          <div className="mt-8"><InfoIcon /></div>
        </div>

        {/* Row: Order / AS Number */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Order Number"><TInput /></F>
          <F label="AS Number"><TInput /></F>
        </div>

        {/* Row: Scan Type / Scan Code */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Scan Type">
            <TSelect placeholder="None" options={['None','Barcode','QR Code']} />
          </F>
          <F label="Scan Code"><TInput disabled /></F>
        </div>

        {/* Row: Case / SPROC / LAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Case Number"><TInput /></F>
          <F label="SPROC Number"><TInput /></F>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="LAS number"><TInput /></F>
          <div />
        </div>

        {/* Row: NHS refs / Sexual Orientation / Disability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="NHS references"><TInput /></F>
          <F label="Sexual Orientation"><TInput /></F>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <F label="Disability"><TInput /></F>
          <div />
        </div>

        {/* Row: Pregnant / Language */}
        <div className="grid grid-cols-2 gap-x-6">
          <F label="Pregnant/Maternity"><TInput /></F>
          <F label="Language"><TInput /></F>
        </div>
      </Section>

      {/* ── Footer ── */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" className="px-8">Close</Button>
        <Button className="px-8">Save</Button>
      </div>

      {/* Scroll-to-top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 h-10 w-10 rounded bg-slate-600 text-white flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors z-50">
        <span className="text-lg leading-none">↑</span>
      </button>
    </div>
  )
}

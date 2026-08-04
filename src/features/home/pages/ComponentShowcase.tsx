import * as React from 'react'
import {
  Plus, Download, Trash2, Edit, Eye, Search, Filter, Mail, Phone,
  Lock, User, AlertCircle, CheckCircle, Star, Heart, Share2, MoreHorizontal,
  ChevronDown, Loader2, ArrowRight, Upload, Calendar, Clock, MapPin,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea, FormField } from '@/shared/ui/form-field'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/shared/ui/select'
import { Badge } from '@/shared/ui/badge'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, StatCard,
} from '@/shared/ui/card'
import { UserAvatar, AvatarGroup } from '@/shared/ui/avatar'
import { Switch, Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription, DialogTrigger,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/shared/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Progress, Skeleton, Separator, TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/misc'
import { Alert } from '@/shared/ui/feedback'
import { toastError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { PageHeader, EmptyState, LoadingSpinner, Section, StatusIndicator } from '@/shared/ui/page-elements'
import {
  ContentCard,
  ContentSectionHeader,
  contentAlertClass,
  contentAlertHeadingClass,
  contentBadgeClass,
  contentBodyClass,
  contentEmphasisClass,
  contentHelperClass,
  contentHelperErrorClass,
  contentKickerClass,
  contentOverlineClass,
  contentSummaryClass,
  contentTableRowLabelClass,
  contentTagClass,
  contentTitleClass,
  contentTitleDisplayClass,
} from '@/shared/ui/content-section'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/data-table'
import { cn } from '@/shared/lib/utils'
import { PinInput } from '@/shared/ui/pin-input'
import { Rating, RatingDisplay } from '@/shared/ui/rating'
import { Slider } from '@/shared/ui/slider'
import { ColorPicker } from '@/shared/ui/color-picker'
import { SignaturePad } from '@/shared/ui/signature-pad'
import { RichTextEditor } from '@/shared/ui/rich-text-editor'
import { Breadcrumbs } from '@/shared/ui/breadcrumbs'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger, ContextMenuShortcut } from '@/shared/ui/context-menu'
import { Fab } from '@/shared/ui/fab'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable'
import { SparklineCard } from '@/shared/ui/sparkline-card'
import { Timeline } from '@/shared/ui/timeline'
import { WeekScheduler } from '@/shared/ui/scheduler'
import { RotaGrid } from '@/shared/ui/rota'
import { MapView } from '@/shared/ui/map'
import { DiffViewer } from '@/shared/ui/diff-viewer'
import { Banner, BannerGroup } from '@/shared/ui/banner'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { StatusStepper } from '@/shared/ui/status-stepper'
import { Stethoscope, ClipboardList, NotepadText } from 'lucide-react'
import { MultiSelect } from '@/shared/ui/multi-select'
import { DatePicker, DateRangePicker } from '@/shared/ui/date-picker'
import { TimePicker, TimeRangePicker } from '@/shared/ui/time-picker'
import { Combobox } from '@/shared/ui/combobox'
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, SheetTrigger } from '@/shared/ui/sheet'
import { FileUpload } from '@/shared/ui/file-upload'
import { Stepper, StepperControls } from '@/shared/ui/stepper'
import { NumberInput } from '@/shared/ui/number-input'
import { PhoneInput } from '@/shared/ui/phone-input'
import { ActivityFeed } from '@/shared/ui/activity-feed'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut, useCommandPalette } from '@/shared/ui/command'
import { Users, Home, Settings, HelpCircle, FileText, Bell } from 'lucide-react'

/* â”€â”€â”€ Section Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ShowSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-display font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

function Row({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
  )
}

function TokenRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <code className="shrink-0 text-xs font-mono text-muted-foreground sm:w-56">{name}</code>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function ContentTypographyShowcase() {
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border bg-muted/10 px-4">
      <TokenRow name="contentTitleClass">
        <p className={contentTitleClass}>Visit schedule — section title (DM Sans)</p>
      </TokenRow>
      <TokenRow name="contentTitleDisplayClass">
        <p className={contentTitleDisplayClass}>Empty state title (Outfit display)</p>
      </TokenRow>
      <TokenRow name="contentKickerClass">
        <p className={contentKickerClass}>Step 3</p>
      </TokenRow>
      <TokenRow name="contentBodyClass">
        <p className={contentBodyClass}>Body copy for descriptions and helper paragraphs.</p>
      </TokenRow>
      <TokenRow name="contentHelperClass">
        <p className={contentHelperClass}>Field hint · last updated 2 hours ago</p>
      </TokenRow>
      <TokenRow name="contentHelperErrorClass">
        <p className={contentHelperErrorClass}>End time must be after start time</p>
      </TokenRow>
      <TokenRow name="contentOverlineClass">
        <p className={contentOverlineClass}>Visit runs on</p>
      </TokenRow>
      <TokenRow name="contentBadgeClass">
        <span className={cn('rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200', contentBadgeClass)}>
          Active
        </span>
      </TokenRow>
      <TokenRow name="contentTagClass">
        <span className={cn('rounded bg-teal-100 px-1.5 py-0.5 text-teal-900 dark:bg-teal-950 dark:text-teal-100', contentTagClass)}>
          Mon
        </span>
      </TokenRow>
      <TokenRow name="contentAlertClass">
        <p className={contentAlertClass}>Carer not available on Wednesday</p>
      </TokenRow>
      <TokenRow name="contentAlertHeadingClass">
        <p className={contentAlertHeadingClass}>Visit vs working hours</p>
      </TokenRow>
      <TokenRow name="contentSummaryClass">
        <details className="group">
          <summary className={contentSummaryClass}>Advanced scheduling options</summary>
          <p className={cn('mt-2', contentHelperClass)}>Expandable panel summary line.</p>
        </details>
      </TokenRow>
      <TokenRow name="contentTableRowLabelClass">
        <p className={contentTableRowLabelClass}>Morning visit</p>
      </TokenRow>
      <TokenRow name="contentEmphasisClass">
        <p className={contentBodyClass}>
          Save the plan, then open <span className={contentEmphasisClass}>Call pattern</span>.
        </p>
      </TokenRow>
    </div>
  )
}

/* â”€â”€â”€ Sample data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const sampleUsers = [
  { name: 'Margaret Thompson' },
  { name: 'James Carter' },
  { name: 'Priya Patel' },
  { name: 'Luke O\'Brien' },
  { name: 'Helen Marsh' },
]

export default function ComponentShowcase() {
  const [switchVal, setSwitchVal] = React.useState(true)
  const [switchVal2, setSwitchVal2] = React.useState(false)
  const [checkbox1, setCheckbox1] = React.useState(true)
  const [checkbox2, setCheckbox2] = React.useState(false)
  const [radio, setRadio] = React.useState('full-time')
  const [progress, setProgress] = React.useState(68)

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          title="Component Library"
          description="A full showcase of all UI components available in the CareAdmin design system."
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'Component Library' },
          ]}
          actions={[
            { label: 'Export Tokens', variant: 'outline', icon: <Download className="h-3.5 w-3.5" /> },
            { label: 'New Component', icon: <Plus className="h-3.5 w-3.5" /> },
          ]}
        />

        {/* â”€â”€ Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Buttons" description="All button variants, sizes, and states.">
          {/* Variants */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variants</p>
            <Row>
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="link">Link</Button>
            </Row>
          </div>

          <Separator />

          {/* Sizes */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sizes</p>
            <Row className="items-end">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </Row>
          </div>

          <Separator />

          {/* With Icons */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Icons</p>
            <Row>
              <Button leftIcon={<Plus className="h-4 w-4" />}>Add Service User</Button>
              <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>Export</Button>
              <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>View All</Button>
              <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
              <Button size="icon" variant="outline"><Edit className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
            </Row>
          </div>

          <Separator />

          {/* States */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">States</p>
            <Row>
              <Button loading>Saving...</Button>
              <Button disabled>Disabled</Button>
              <Button variant="outline" loading>Processing</Button>
            </Row>
          </div>
        </ShowSection>

        {/* â”€â”€ Form Fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Form Fields" description="Text inputs, labels, textarea, and form field wrappers.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" htmlFor="name" required>
              <Input id="name" placeholder="Enter full name" leftElement={<User className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Email Address" htmlFor="email">
              <Input id="email" type="email" placeholder="name@example.com" leftElement={<Mail className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Phone Number" htmlFor="phone" hint="Include country code">
              <Input id="phone" type="tel" placeholder="+44 7700 900000" leftElement={<Phone className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Password" htmlFor="password">
              <Input id="password" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" leftElement={<Lock className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Date of Birth" htmlFor="dob">
              <Input id="dob" type="date" leftElement={<Calendar className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Shift Time" htmlFor="time">
              <Input id="time" type="time" leftElement={<Clock className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Address" htmlFor="addr" error="This field is required" className="md:col-span-2">
              <Input id="addr" placeholder="Enter address" leftElement={<MapPin className="h-3.5 w-3.5" />} error />
            </FormField>

            <FormField label="Search" htmlFor="search">
              <Input id="search" placeholder="Search service users..." leftElement={<Search className="h-3.5 w-3.5" />} rightElement={<Filter className="h-3.5 w-3.5" />} />
            </FormField>

            <FormField label="Disabled Input" htmlFor="disabled">
              <Input id="disabled" placeholder="Disabled" disabled />
            </FormField>

            <FormField label="Notes" htmlFor="notes" hint="Max 500 characters" className="md:col-span-2">
              <Textarea id="notes" placeholder="Enter care notes or additional information..." rows={4} />
            </FormField>
          </div>
        </ShowSection>

        {/* â”€â”€ Selects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Select Dropdowns" description="Single-select dropdown menus with grouping support.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Care Type" htmlFor="care-type">
              <Select>
                <SelectTrigger id="care-type">
                  <SelectValue placeholder="Select care type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Residential</SelectLabel>
                    <SelectItem value="nursing">Nursing Care</SelectItem>
                    <SelectItem value="residential">Residential Care</SelectItem>
                    <SelectItem value="dementia">Dementia Care</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Community</SelectLabel>
                    <SelectItem value="domiciliary">Domiciliary Care</SelectItem>
                    <SelectItem value="reablement">Reablement</SelectItem>
                    <SelectItem value="respite">Respite Care</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Staff Role">
              <Select defaultValue="carer">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Care Manager</SelectItem>
                  <SelectItem value="coordinator">Care Coordinator</SelectItem>
                  <SelectItem value="carer">Care Worker</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select>
                <SelectTrigger error>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </ShowSection>

        {/* â”€â”€ Badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Badges" description="Status and category indicators in multiple variants.">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Soft Variants</p>
              <Row>
                <Badge variant="default">Primary</Badge>
                <Badge variant="success">Active</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="destructive">Urgent</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="muted">Muted</Badge>
                <Badge variant="outline">Outline</Badge>
              </Row>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Solid Variants</p>
              <Row>
                <Badge variant="solid">Primary</Badge>
                <Badge variant="solid-success">Active</Badge>
                <Badge variant="solid-warning">Pending</Badge>
                <Badge variant="solid-destructive">Critical</Badge>
                <Badge variant="solid-info">Info</Badge>
              </Row>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Dot</p>
              <Row>
                <Badge variant="success" dot>On Shift</Badge>
                <Badge variant="warning" dot>On Break</Badge>
                <Badge variant="destructive" dot>Unavailable</Badge>
                <Badge variant="muted" dot>Off Duty</Badge>
              </Row>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sizes</p>
              <Row className="items-center">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </Row>
            </div>
          </div>
        </ShowSection>

        {/* â”€â”€ Toggle Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Toggle Controls" description="Switches, checkboxes, and radio groups.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Switches */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Switches</p>
              <div className="flex items-center gap-3">
                <Switch checked={switchVal} onCheckedChange={setSwitchVal} id="sw1" size="sm" />
                <Label htmlFor="sw1" className="cursor-pointer">Small</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={switchVal} onCheckedChange={setSwitchVal} id="sw2" />
                <Label htmlFor="sw2" className="cursor-pointer">Email notifications</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={switchVal2} onCheckedChange={setSwitchVal2} id="sw3" size="lg" />
                <Label htmlFor="sw3" className="cursor-pointer">Two-factor auth</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch disabled id="sw4" />
                <Label htmlFor="sw4" className="cursor-pointer opacity-50">Disabled</Label>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Checkboxes</p>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="cb1"
                  checked={checkbox1}
                  onCheckedChange={(v) => setCheckbox1(v as boolean)}
                />
                <Label htmlFor="cb1" className="cursor-pointer">DBS Checked</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="cb2"
                  checked={checkbox2}
                  onCheckedChange={(v) => setCheckbox2(v as boolean)}
                />
                <Label htmlFor="cb2" className="cursor-pointer">First Aid Certified</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="cb3" disabled />
                <Label htmlFor="cb3" className="cursor-pointer opacity-50">Manual Handling (N/A)</Label>
              </div>
            </div>

            {/* Radio Group */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Radio Group</p>
              <RadioGroup value={radio} onValueChange={setRadio} className="gap-3">
                {[
                  { value: 'full-time', label: 'Full Time' },
                  { value: 'part-time', label: 'Part Time' },
                  { value: 'bank', label: 'Bank Staff' },
                  { value: 'agency', label: 'Agency' },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-3">
                    <RadioGroupItem value={opt.value} id={`r-${opt.value}`} />
                    <Label htmlFor={`r-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </ShowSection>

        {/* â”€â”€ Avatars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Avatars" description="User avatars with sizes, online indicators, and groups.">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sizes</p>
              <Row className="items-end">
                <UserAvatar name="Margaret Thompson" size="xs" />
                <UserAvatar name="James Carter" size="sm" />
                <UserAvatar name="Priya Patel" size="md" />
                <UserAvatar name="Luke O'Brien" size="lg" />
                <UserAvatar name="Helen Marsh" size="xl" />
              </Row>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Online Status</p>
              <Row>
                <UserAvatar name="Sarah Mitchell" size="md" online />
                <UserAvatar name="David Chen" size="md" online />
                <UserAvatar name="Emma Wilson" size="sm" online />
              </Row>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avatar Group</p>
              <AvatarGroup users={sampleUsers} max={4} />
            </div>
          </div>
        </ShowSection>

        {/* â”€â”€ Progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Progress" description="Progress bars with variants and value display.">
          <div className="space-y-3 max-w-md">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Care plan completion</p>
              <Progress value={progress} showValue />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Staff trained</p>
              <Progress value={84} variant="success" showValue />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Shift coverage</p>
              <Progress value={45} variant="warning" showValue />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Incident rate</p>
              <Progress value={18} variant="destructive" showValue size="sm" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgress(Math.floor(Math.random() * 100))}
            >
              Randomise Progress
            </Button>
          </div>
        </ShowSection>

        {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Tabs" description="Three tab variants: default, pills, and underline.">
          <div className="space-y-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="care-plan">Care Plan</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <p className="text-sm text-muted-foreground">Default tab style â€” commonly used for main section navigation.</p>
              </TabsContent>
              <TabsContent value="care-plan">
                <p className="text-sm text-muted-foreground">Care plan content would appear here.</p>
              </TabsContent>
              <TabsContent value="notes">
                <p className="text-sm text-muted-foreground">Notes content goes here.</p>
              </TabsContent>
              <TabsContent value="documents">
                <p className="text-sm text-muted-foreground">Documents list would appear here.</p>
              </TabsContent>
            </Tabs>

            <Tabs defaultValue="all">
              <TabsList variant="pills">
                <TabsTrigger value="all" variant="pills">All</TabsTrigger>
                <TabsTrigger value="active" variant="pills">Active</TabsTrigger>
                <TabsTrigger value="on-leave" variant="pills">On Leave</TabsTrigger>
                <TabsTrigger value="pending" variant="pills">Pending</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <p className="text-sm text-muted-foreground">Pills variant â€” good for filters and view toggles.</p>
              </TabsContent>
              <TabsContent value="active"><p className="text-sm text-muted-foreground">Active employees.</p></TabsContent>
              <TabsContent value="on-leave"><p className="text-sm text-muted-foreground">Employees on leave.</p></TabsContent>
              <TabsContent value="pending"><p className="text-sm text-muted-foreground">Pending approvals.</p></TabsContent>
            </Tabs>

            <Tabs defaultValue="shifts">
              <TabsList variant="underline" className="w-full justify-start">
                <TabsTrigger value="shifts" variant="underline">Shifts</TabsTrigger>
                <TabsTrigger value="rota" variant="underline">Rota</TabsTrigger>
                <TabsTrigger value="availability" variant="underline">Availability</TabsTrigger>
                <TabsTrigger value="leave" variant="underline">Leave</TabsTrigger>
              </TabsList>
              <TabsContent value="shifts">
                <p className="text-sm text-muted-foreground">Underline variant â€” clean for record-level detail pages.</p>
              </TabsContent>
              <TabsContent value="rota"><p className="text-sm text-muted-foreground">Rota view.</p></TabsContent>
              <TabsContent value="availability"><p className="text-sm text-muted-foreground">Availability grid.</p></TabsContent>
              <TabsContent value="leave"><p className="text-sm text-muted-foreground">Leave requests.</p></TabsContent>
            </Tabs>
          </div>
        </ShowSection>

        {/* â”€â”€ Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Alerts" description="Inline status messages for various scenarios.">
          <div className="space-y-2 max-w-2xl">
            <Alert variant="info" title="DBS Renewal Due">
              3 staff members have DBS checks expiring within the next 30 days.
            </Alert>
            <Alert variant="success" title="Shift Assigned">
              Morning shift on 14 Jan has been successfully assigned to Sarah Mitchell.
            </Alert>
            <Alert variant="warning" title="Incomplete Care Plan">
              Service user Margaret Thompson's care plan is missing a risk assessment.
            </Alert>
            <Alert variant="destructive" title="Incident Reported" onClose={() => {}}>
              A fall incident was reported by James Carter at Meadow House at 09:42.
            </Alert>
          </div>
        </ShowSection>

        {/* â”€â”€ Toasts (toastr) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection
          title="Toasts (toastr)"
          description="Transient notifications used after form submits in Service Users and elsewhere. Triggered via toastSuccess / toastError from @/shared/lib/toast."
        >
          <Row>
            <Button type="button" variant="success" onClick={() => toastSuccess('Saved', 'Your changes were applied successfully.')}>
              Show success toast
            </Button>
            <Button type="button" variant="destructive" onClick={() => toastError('Save failed', 'We could not reach the server. Check your connection.')}>
              Show error toast
            </Button>
            <Button type="button" variant="warning" onClick={() => toastWarning('Attention', 'This action will affect live rota data.')}>
              Show warning toast
            </Button>
          </Row>
        </ShowSection>

        {/* â”€â”€ Status Indicators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Status Indicators" description="Compact status dots for lists and tables.">
          <Row>
            <StatusIndicator status="active" />
            <StatusIndicator status="inactive" />
            <StatusIndicator status="pending" />
            <StatusIndicator status="warning" label="Attention needed" />
            <StatusIndicator status="error" label="Requires action" />
          </Row>
        </ShowSection>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <ShowSection
          title="Stat Cards"
          description="Shared KPI card — icon on the left, label/value/hint on the right. Used across payroll and billing. Change this component once to update every page."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard
              label="Service Users"
              value="247"
              change="+12 this month"
              changeType="positive"
              icon={<User className="h-5 w-5" />}
              tone="primary"
            />
            <StatCard
              label="Active Staff"
              value="84"
              change="+3 this week"
              changeType="positive"
              icon={<User className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="Open Shifts"
              value="9"
              hint="2 urgent"
              icon={<Calendar className="h-5 w-5" />}
              tone="warning"
              tooltip="Shifts still needing a carer assignment for the coming week."
            />
            <StatCard
              label="Incidents (MTD)"
              value="3"
              change="-2 vs last month"
              changeType="positive"
              icon={<AlertCircle className="h-5 w-5" />}
              tone="destructive"
              to="/showcase"
              showChevron
            />
          </div>
        </ShowSection>

        {/* â”€â”€ Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Cards" description="Content containers with headers, body, and footer.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Service User Profile</CardTitle>
                  <Badge variant="success" dot>Active</Badge>
                </div>
                <CardDescription>Residential care â€” Room 14</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <UserAvatar name="Margaret Thompson" size="lg" />
                  <div>
                    <p className="font-medium text-sm">Margaret Thompson</p>
                    <p className="text-xs text-muted-foreground">DOB: 12 Mar 1942 (82 yrs)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">NHS: 123 456 7890</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />}>View</Button>
                <Button size="sm" leftIcon={<Edit className="h-3.5 w-3.5" />}>Edit</Button>
              </CardFooter>
            </Card>

            <Card hoverable>
              <CardHeader>
                <CardTitle>Upcoming Shift</CardTitle>
                <CardDescription>Tomorrow Â· Morning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">07:00 â€“ 14:00</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">Meadow House</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned</span>
                  <AvatarGroup users={sampleUsers.slice(0, 3)} max={3} size="xs" />
                </div>
                <Progress value={33} size="sm" />
              </CardContent>
            </Card>
          </div>
        </ShowSection>

        {/* â”€â”€ Dialogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Dialogs & Modals" description="Modal dialogs and confirmation dialogs.">
          <Row>
            {/* Standard Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service User</DialogTitle>
                  <DialogDescription>
                    Enter the service user's details to create their profile.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-3">
                  <FormField label="Full Name" required>
                    <Input placeholder="e.g. Margaret Thompson" leftElement={<User className="h-3.5 w-3.5" />} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Date of Birth">
                      <Input type="date" />
                    </FormField>
                    <FormField label="NHS Number">
                      <Input placeholder="000 000 0000" />
                    </FormField>
                  </div>
                  <FormField label="Care Type">
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="nursing">Nursing</SelectItem>
                        <SelectItem value="domiciliary">Domiciliary</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </DialogBody>
                <DialogFooter>
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Create Profile</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Large Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Large Dialog</Button>
              </DialogTrigger>
              <DialogContent size="lg">
                <DialogHeader>
                  <DialogTitle>Incident Report â€” Full Form</DialogTitle>
                  <DialogDescription>Document the incident details accurately and completely.</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Incident Date" required>
                      <Input type="date" leftElement={<Calendar className="h-3.5 w-3.5" />} />
                    </FormField>
                    <FormField label="Incident Time" required>
                      <Input type="time" leftElement={<Clock className="h-3.5 w-3.5" />} />
                    </FormField>
                  </div>
                  <FormField label="Location" required>
                    <Input placeholder="Where did the incident occur?" leftElement={<MapPin className="h-3.5 w-3.5" />} />
                  </FormField>
                  <FormField label="Incident Type" required>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="medication">Medication Error</SelectItem>
                        <SelectItem value="assault">Assault / Aggression</SelectItem>
                        <SelectItem value="near-miss">Near Miss</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Description" required>
                    <Textarea placeholder="Describe the incident in detail..." rows={4} />
                  </FormField>
                  <FormField label="Immediate Actions Taken">
                    <Textarea placeholder="What was done immediately after the incident?" rows={3} />
                  </FormField>
                </DialogBody>
                <DialogFooter>
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />}>Submit Report</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Alert Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>Delete Record</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Service User Record?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All data associated with this service user,
                    including care plans, notes, and incident reports, will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Delete Permanently</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Row>
        </ShowSection>

        {/* â”€â”€ Dropdown Menus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Dropdown Menus" description="Contextual action menus with grouping and shortcuts.">
          <Row>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" rightIcon={<ChevronDown className="h-4 w-4" />}>
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Service User</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Eye className="h-4 w-4" /> View Profile
                  <DropdownMenuShortcut>âŒ˜V</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="h-4 w-4" /> Edit Details
                  <DropdownMenuShortcut>âŒ˜E</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4" /> Share Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Trash2 className="h-4 w-4" /> Delete Record
                  <DropdownMenuShortcut>âŒ˜âŒ«</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem><Star className="h-4 w-4" /> Mark Priority</DropdownMenuItem>
                <DropdownMenuItem><Mail className="h-4 w-4" /> Send Email</DropdownMenuItem>
                <DropdownMenuItem><Phone className="h-4 w-4" /> Call</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive><AlertCircle className="h-4 w-4" /> Report Issue</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Row>
        </ShowSection>

        {/* â”€â”€ Tooltips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Tooltips" description="Hover tooltips for contextual help.">
          <Row>
            {[
              { label: 'Top', side: 'top' as const },
              { label: 'Right', side: 'right' as const },
              { label: 'Bottom', side: 'bottom' as const },
              { label: 'Left', side: 'left' as const },
            ].map(({ label, side }) => (
              <Tooltip key={side}>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">{label}</Button>
                </TooltipTrigger>
                <TooltipContent side={side}>
                  Tooltip appears on {label.toLowerCase()}
                </TooltipContent>
              </Tooltip>
            ))}
          </Row>
        </ShowSection>

        {/* â”€â”€ Skeletons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Skeleton Loaders" description="Content placeholder animations while data loads.">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-[1px] w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </ShowSection>

        {/* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection
          title="Data Table"
          description="Default headers (uppercase, compact) for list pages; data variant (sentence case) for dense editable grids such as visit plan."
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <p className={contentOverlineClass}>variant=&quot;default&quot;</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Shift</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: 'Margaret Thompson', role: 'Service User', loc: 'Meadow House', status: 'active', shift: '—' },
                      { name: 'James Carter', role: 'Care Worker', loc: 'Community', status: 'active', shift: 'Mon 07:00' },
                      { name: 'Priya Patel', role: 'Nurse', loc: 'Meadow House', status: 'pending', shift: 'Tue 08:00' },
                    ].map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <UserAvatar name={row.name} size="sm" />
                            <span className="font-medium text-sm">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.role}</TableCell>
                        <TableCell className="text-sm">{row.loc}</TableCell>
                        <TableCell>
                          <StatusIndicator status={row.status as 'active' | 'inactive' | 'pending'} />
                        </TableCell>
                        <TableCell className="text-sm font-mono">{row.shift}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon-sm" variant="ghost"><Eye className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <p className={contentOverlineClass}>variant=&quot;data&quot;</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead variant="data">Visit</TableHead>
                      <TableHead variant="data">Start</TableHead>
                      <TableHead variant="data">Duration</TableHead>
                      <TableHead variant="data">End</TableHead>
                      <TableHead variant="data">Carers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: 'Morning', start: '07:30', duration: '45', end: '08:15' },
                      { label: 'Lunch', start: '12:00', duration: '30', end: '12:30' },
                      { label: 'Evening', start: '18:00', duration: '60', end: '19:00' },
                    ].map((row) => (
                      <TableRow key={row.label}>
                        <TableCell variant="data">
                          <span className={contentTableRowLabelClass}>{row.label}</span>
                        </TableCell>
                        <TableCell variant="data">
                          <Input className="h-8 w-24" defaultValue={row.start} aria-label={`${row.label} start`} />
                        </TableCell>
                        <TableCell variant="data">
                          <Input className="h-8 w-16" defaultValue={row.duration} aria-label={`${row.label} duration`} />
                        </TableCell>
                        <TableCell variant="data">
                          <Input className="h-8 w-24" defaultValue={row.end} aria-label={`${row.label} end`} />
                        </TableCell>
                        <TableCell variant="data">
                          <Button size="sm" variant="outline">Assign</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ShowSection>

        {/* â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Empty States" description="Placeholder views when there's no data to display.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <EmptyState
                icon={<User className="h-6 w-6" />}
                title="No service users found"
                description="Add your first service user to get started with care management."
                action={{ label: 'Add Service User', icon: <Plus className="h-4 w-4" /> }}
              />
            </Card>
            <Card>
              <EmptyState
                icon={<CheckCircle className="h-6 w-6" />}
                title="All incidents resolved"
                description="There are no open incident reports to review at this time."
              />
            </Card>
          </div>
        </ShowSection>

        {/* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Loading States" description="Spinners and loading indicators.">
          <Row className="items-center">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
            <LoadingSpinner size="md" label="Loading service users..." />
          </Row>
        </ShowSection>

        {/* â”€â”€ Typography â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Typography" description="Font families and raw scale. Module pages should use content typography tokens (below) for consistency.">
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold">Display Heading — Outfit Bold</h1>
            <h2 className="text-2xl font-display font-semibold">Section Heading — Outfit Semibold</h2>
            <h3 className="text-xl font-display font-semibold">Card Title — Outfit Semibold</h3>
            <h4 className="text-base font-display font-medium">Sub-heading — Outfit Medium</h4>
            <p className="text-base text-foreground">Body text — DM Sans Regular. Used for paragraphs, descriptions, and general content throughout the application.</p>
            <p className="text-sm text-muted-foreground">Small text — DM Sans used for labels, helper text, and secondary information in compact spaces.</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Caption / Overline — Used for section labels and metadata</p>
            <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">Monospace — JetBrains Mono for code and IDs</p>
          </div>
        </ShowSection>

        <ShowSection
          title="Content Typography"
          description="Canonical copy styles from @/shared/ui/content-typography — import via content-section. Do not duplicate these class strings in features."
        >
          <ContentTypographyShowcase />
        </ShowSection>

        <ShowSection
          title="Content Layout"
          description="ContentCard and ContentSectionHeader — standard module page shell (visit plan, employee panels, etc.)."
        >
          <ContentCard className="space-y-4">
            <ContentSectionHeader
              kicker="Step 2"
              title="Visit schedule"
              titleAs="h3"
              description="Turn visits on, set times, and assign carers. Matches Employee Management density (DM Sans titles)."
              action={
                <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add slot
                </Button>
              }
            />
            <p className={contentBodyClass}>
              Card body uses <code className="text-xs font-mono">contentBodyClass</code> for descriptions.
              Section titles use semantic headings with <code className="text-xs font-mono">font-sans</code> so they
              stay on DM Sans inside admin UI.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Wed', 'Fri'].map((day) => (
                <span
                  key={day}
                  className={cn(
                    'rounded bg-teal-100 px-2 py-0.5 text-teal-900 dark:bg-teal-950 dark:text-teal-100',
                    contentTagClass,
                  )}
                >
                  {day}
                </span>
              ))}
            </div>
          </ContentCard>
        </ShowSection>

        {/* ── Multi Select ── */}
        <ShowSection title="Multi Select" description="Dropdown with multiple selection, search, and chips.">
          <MultiSelectDemo />
        </ShowSection>

        {/* â”€â”€ Date Pickers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Date Pickers" description="Single date and date range pickers.">
          <DatePickerDemo />
        </ShowSection>

        {/* â”€â”€ Time Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Time Picker" description="Time input with 24h or AM/PM support.">
          <TimePickerDemo />
        </ShowSection>

        {/* â”€â”€ Combobox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Combobox" description="Searchable single-select with description support.">
          <ComboboxDemo />
        </ShowSection>

        {/* â”€â”€ Sheet / Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Sheet / Drawer" description="Slide-in side panels from any edge.">
          <SheetDemo />
        </ShowSection>

        {/* â”€â”€ File Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="File Upload" description="Drag and drop with validation and file preview.">
          <div className="max-w-md">
            <FileUpload accept="image/*,.pdf" multiple maxSize={5 * 1024 * 1024} maxFiles={5} />
          </div>
        </ShowSection>

        {/* â”€â”€ Stepper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Stepper / Wizard" description="Multi-step progress indicator, horizontal and vertical.">
          <StepperDemo />
        </ShowSection>

        {/* â”€â”€ Number Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Number Input" description="Numeric input with increment/decrement controls.">
          <Row className="items-center flex-wrap">
            <NumberInput min={0} max={100} value={5} />
            <NumberInput min={0} max={24} step={0.5} suffix="hrs" value={8} />
            <NumberInput min={0} prefix="Â£" step={0.01} value={12.50} />
          </Row>
        </ShowSection>

        {/* â”€â”€ Phone Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Phone Input" description="Phone number input with country code selector.">
          <div className="max-w-sm space-y-3">
            <PhoneInput defaultCountry="GB" />
            <PhoneInput defaultCountry="PK" />
          </div>
        </ShowSection>

        {/* â”€â”€ Activity Feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Activity Feed" description="Timeline of care events and audit entries.">
          <ActivityFeedDemo />
        </ShowSection>

        {/* â”€â”€ Command Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Command Palette" description="Press âŒ˜K or Ctrl+K anywhere to open quick search.">
          <CommandPaletteDemo />
        </ShowSection>

        {/* â”€â”€ Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Banner / Announcement" description="Site-wide notices in different severities, with optional actions.">
          <div className="space-y-2 max-w-2xl">
            <Banner variant="announcement" title="CQC Inspection Notice" message="An inspection has been scheduled for 14 June 2026. Please ensure all care records are up to date." action={{ label: "View checklist", onClick: () => {} }} dismissible />
            <Banner variant="warning" message="2 care plans are due for review this week." action={{ label: "Review now", onClick: () => {} }} dismissible />
            <Banner variant="success" title="Payroll processed" message="April payroll has been successfully submitted." dismissible />
            <Banner variant="destructive" message="System maintenance scheduled tonight 23:00â€“01:00. Save your work." />
          </div>
        </ShowSection>

        {/* â”€â”€ Breadcrumbs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Breadcrumbs" description="Navigation trail with collapsible overflow.">
          <div className="space-y-3">
            <Breadcrumbs items={[{ label: "Home" }, { label: "Service Users" }, { label: "Alice Johnson" }]} />
            <Breadcrumbs items={[{ label: "Home" }, { label: "Service Users" }, { label: "Alice Johnson" }, { label: "Care Plans" }, { label: "April 2026 Review" }]} maxVisible={4} />
          </div>
        </ShowSection>

        {/* â”€â”€ Status Stepper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Status Stepper (Read-only)" description="Progress indicator for referrals, onboarding, and workflows.">
          <div className="space-y-8 max-w-2xl">
            <StatusStepper steps={[
              { id: "referral", label: "Referral Received", type: "complete", date: new Date("2026-03-01") },
              { id: "assessment", label: "Needs Assessment", type: "complete", date: new Date("2026-03-08") },
              { id: "care-plan", label: "Care Plan Created", type: "current" },
              { id: "started", label: "Care Started", type: "upcoming" },
              { id: "review", label: "First Review", type: "upcoming" },
            ]} />
            <StatusStepper orientation="vertical" steps={[
              { id: "referral", label: "Referral Received", description: "From GP â€” Dr. Patel", type: "complete", date: new Date("2026-03-01") },
              { id: "assessment", label: "Needs Assessment", description: "Completed by Sarah Lee", type: "complete", date: new Date("2026-03-08") },
              { id: "care-plan", label: "Care Plan Pending", description: "Awaiting manager approval", type: "error" },
              { id: "started", label: "Care Started", type: "upcoming" },
            ]} />
          </div>
        </ShowSection>

        {/* â”€â”€ Inline Confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Inline Confirmation" description="Contextual confirm popover â€” no full dialog needed.">
          <Row>
            <InlineConfirm title="Archive service user?" description="This will hide them from active lists. You can restore them later." confirmLabel="Archive" onConfirm={() => {}}>
              <Button variant="outline">Archive User</Button>
            </InlineConfirm>
            <InlineConfirm title="Delete incident report?" description="This action cannot be undone. The report will be permanently removed." confirmLabel="Delete" onConfirm={() => {}} destructive>
              <Button variant="destructive">Delete Report</Button>
            </InlineConfirm>
          </Row>
        </ShowSection>

        {/* â”€â”€ PIN Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="PIN Input" description="Digit-by-digit secure input with paste support.">
          <div className="space-y-4">
            <Row className="items-start">
              <div><p className="text-xs text-muted-foreground mb-2">4-digit PIN</p><PinInput length={4} /></div>
              <div><p className="text-xs text-muted-foreground mb-2">6-digit OTP</p><PinInput length={6} /></div>
              <div><p className="text-xs text-muted-foreground mb-2">Masked</p><PinInput length={4} masked /></div>
              <div><p className="text-xs text-muted-foreground mb-2">Error state</p><PinInput length={4} value="1234" error /></div>
            </Row>
          </div>
        </ShowSection>

        {/* â”€â”€ Rating â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Rating / Stars" description="Interactive rating input and read-only display variants.">
          <div className="space-y-4">
            <Row className="items-center">
              <Rating showLabel />
              <Rating value={3} max={5} size="lg" showLabel />
              <Rating value={4} size="sm" disabled />
            </Row>
            <Row className="items-center">
              <RatingDisplay value={4.5} showValue />
              <RatingDisplay value={3.2} showValue />
              <RatingDisplay value={5} showValue />
            </Row>
          </div>
        </ShowSection>

        {/* â”€â”€ Slider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Slider" description="Single value and range sliders with optional labels and marks.">
          <div className="max-w-sm space-y-6">
            <Slider defaultValue={[40]} min={0} max={100} showValue suffix="%" />
            <Slider defaultValue={[20, 70]} min={0} max={100} showValue prefix="Â£" marks={[{value:0,label:"Â£0"},{value:50,label:"Â£50"},{value:100,label:"Â£100"}]} />
            <Slider defaultValue={[5]} min={0} max={10} marks={[{value:0,label:"None"},{value:5,label:"Moderate"},{value:10,label:"Severe"}]} showValue suffix=" / 10" />
          </div>
        </ShowSection>

        {/* â”€â”€ Color Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Color Picker" description="Preset swatches plus hex input and native color wheel.">
          <Row>
            <ColorPicker value="#008060" />
            <ColorPicker value="#3b82f6" />
            <ColorPicker value="#ec4899" />
          </Row>
        </ShowSection>

        {/* â”€â”€ Signature Pad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Signature Pad" description="Touch and mouse drawing for consent forms and sign-offs.">
          <div className="max-w-lg">
            <SignaturePad />
          </div>
        </ShowSection>

        {/* â”€â”€ Rich Text Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Rich Text Editor" description="Full formatting toolbar for care notes, policies, and assessments.">
          <div className="max-w-2xl">
            <RichTextEditor placeholder="Write a care note, policy, or assessment..." minHeight={180} />
          </div>
        </ShowSection>

        {/* â”€â”€ Context Menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Context Menu" description="Right-click menu on table rows and cards.">
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 cursor-context-menu hover:bg-accent/30 transition-colors max-w-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Alice Johnson</p>
                  <p className="text-xs text-muted-foreground">Right-click for actions</p>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuLabel>Alice Johnson</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem><Eye className="h-4 w-4" /> View Profile</ContextMenuItem>
              <ContextMenuItem><Edit className="h-4 w-4" /> Edit Details</ContextMenuItem>
              <ContextMenuItem><FileText className="h-4 w-4" /> View Care Plan</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem destructive><Trash2 className="h-4 w-4" /> Archive User<ContextMenuShortcut>âŒ˜âŒ«</ContextMenuShortcut></ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </ShowSection>

        {/* â”€â”€ Resizable Panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Resizable Panels" description="Drag the handle to resize panels â€” useful for split views.">
          <ResizablePanelGroup orientation="horizontal" className="h-40 max-w-2xl rounded-lg border border-border">
            <ResizablePanel defaultSize={35} minSize={20}>
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">Service User List<br /><span className="text-xs">â† drag to resize â†’</span></p>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">Detail View</p>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ShowSection>

        {/* â”€â”€ Sparkline Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="KPI Cards with Sparklines" description="Metric cards with inline trend charts.">
          <div className="grid grid-cols-2 gap-4 max-w-2xl lg:grid-cols-4">
            <SparklineCard title="Visits This Week" value={142} change={8.2} data={[{value:110},{value:125},{value:118},{value:130},{value:135},{value:128},{value:142}]} />
            <SparklineCard title="Active Service Users" value={89} change={2.3} data={[{value:82},{value:83},{value:85},{value:84},{value:86},{value:88},{value:89}]} />
            <SparklineCard title="Incidents (30d)" value={4} change={-33} changeLabel="vs prev month" data={[{value:7},{value:5},{value:6},{value:4},{value:5},{value:3},{value:4}]} color="#ef4444" />
            <SparklineCard title="Carer Hours" value="1,248" suffix="h" change={12} data={[{value:980},{value:1050},{value:1100},{value:1080},{value:1150},{value:1200},{value:1248}]} />
          </div>
        </ShowSection>

        {/* â”€â”€ Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Timeline" description="Chronological event history for service users or audit logs.">
          <div className="max-w-xl">
            <Timeline events={[
              { id:"1", title:"Care plan updated", description:"Reviewed and updated medication schedule.", date: new Date(Date.now() - 2*3600000), category:"Care Plan", type:"info", author:"Sarah Lee" },
              { id:"2", title:"Incident reported", description:"Minor fall in bathroom. No injuries.", date: new Date(Date.now() - 6*3600000), category:"Incident", type:"warning", author:"James Okafor", metadata:{ Severity:"Low", "Follow-up":"Required" } },
              { id:"3", title:"Care visit completed", date: new Date(Date.now() - 86400000), category:"Visit", type:"success", author:"Maria Santos" },
              { id:"4", title:"Service user enrolled", date: new Date(Date.now() - 7*86400000), category:"Onboarding", author:"Admin" },
            ]} groupByDate />
          </div>
        </ShowSection>

        {/* â”€â”€ Week Scheduler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Week Scheduler" description="Interactive week grid for scheduling care visits.">
          <WeekScheduler events={[
            { id:"e1", title:"Morning Care", carer:"M. Santos", start: (() => { const d = new Date(); d.setHours(9,0); return d })(), end: (() => { const d = new Date(); d.setHours(11,0); return d })(), color:"#008060" },
            { id:"e2", title:"Medication Round", carer:"J. Okafor", start: (() => { const d = new Date(); d.setHours(13,0); return d })(), end: (() => { const d = new Date(); d.setHours(14,0); return d })(), color:"#3b82f6" },
          ]} />
        </ShowSection>

        {/* â”€â”€ Rota Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Staff Rota / Gantt" description="Weekly rota grid showing staff shifts across all days.">
          <RotaGrid
            weekLabel="Week of 5 May 2026"
            staff={[
              { id:"s1", name:"Maria Santos", role:"Senior Carer" },
              { id:"s2", name:"James Okafor", role:"Carer" },
              { id:"s3", name:"Sarah Lee", role:"Carer" },
            ]}
            shifts={[
              { id:"sh1", staffId:"s1", day:0, startHour:7, endHour:15, type:"day", label:"07:00â€“15:00" },
              { id:"sh2", staffId:"s1", day:1, startHour:7, endHour:15, type:"day", label:"07:00â€“15:00" },
              { id:"sh3", staffId:"s1", day:4, startHour:15, endHour:23, type:"night", label:"15:00â€“23:00" },
              { id:"sh4", staffId:"s2", day:0, startHour:15, endHour:23, type:"night", label:"15:00â€“23:00" },
              { id:"sh5", staffId:"s2", day:2, startHour:7, endHour:15, type:"day", label:"07:00â€“15:00" },
              { id:"sh6", staffId:"s2", day:5, startHour:9, endHour:17, type:"training", label:"Training" },
              { id:"sh7", staffId:"s3", day:0, startHour:9, endHour:17, type:"day", label:"09:00â€“17:00" },
              { id:"sh8", staffId:"s3", day:3, startHour:0, endHour:0, type:"leave", label:"Annual Leave" },
            ]}
          />
        </ShowSection>

        {/* â”€â”€ Map View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Map / Location View" description="Service user addresses on a map with list panel.">
          <MapView
            locations={[
              { id:"l1", name:"Alice Johnson", address:"Flat 12B, Greenview Estate, Manchester M14 5QR", lat:53.4389, lng:-2.2215, type:"service-user" },
              { id:"l2", name:"Bob Williams", address:"4 Oak Lane, Salford M5 3LT", lat:53.4831, lng:-2.2831, type:"service-user" },
              { id:"l3", name:"Head Office", address:"22 King Street, Manchester M2 6AQ", lat:53.4808, lng:-2.2426, type:"office" },
            ]}
            selectedId="l1"
            height={280}
          />
        </ShowSection>

        {/* â”€â”€ Diff Viewer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ShowSection title="Diff Viewer" description="Side-by-side comparison of care plan or document changes.">
          <DiffViewerDemo />
        </ShowSection>

        {/* Spacing at bottom */}
        <div className="h-8" />
      </div>
    </TooltipProvider>
  )
}

/* â”€â”€â”€ New Component Demos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function MultiSelectDemo() {
  const [val, setVal] = React.useState<string[]>([])
  const options = [
    { value: 'personal-care', label: 'Personal Care' },
    { value: 'medication', label: 'Medication Management' },
    { value: 'meal-prep', label: 'Meal Preparation' },
    { value: 'mobility', label: 'Mobility Support' },
    { value: 'domestic', label: 'Domestic Tasks' },
    { value: 'social', label: 'Social Activities' },
  ]
  return (
    <div className="max-w-sm space-y-3">
      <MultiSelect options={options} value={val} onChange={setVal} placeholder="Select care types..." />
      <MultiSelect options={options} value={['personal-care', 'medication']} onChange={() => {}} placeholder="Pre-selected" />
      <MultiSelect options={options} value={[]} onChange={() => {}} disabled placeholder="Disabled" />
    </div>
  )
}

function DatePickerDemo() {
  const [date, setDate] = React.useState<Date | undefined>()
  return (
    <div className="max-w-md space-y-3">
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Single Date</Label>
        <DatePicker value={date} onChange={setDate} placeholder="Select date" />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Date Range</Label>
        <DateRangePicker placeholder="Select shift period" />
      </div>
    </div>
  )
}

function TimePickerDemo() {
  return (
    <div className="max-w-sm space-y-3">
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">24-Hour</Label>
        <TimePicker value="09:00" />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Time Range</Label>
        <TimeRangePicker from="09:00" to="17:00" />
      </div>
    </div>
  )
}

function ComboboxDemo() {
  const [val, setVal] = React.useState('')
  const users = [
    { value: 'alice', label: 'Alice Johnson', description: 'Service User Â· Flat 12B' },
    { value: 'bob', label: 'Bob Williams', description: 'Service User Â· 4 Oak Lane' },
    { value: 'carol', label: 'Carol Davies', description: 'Service User Â· Room 7' },
    { value: 'david', label: 'David Osei', description: 'Service User Â· 22 River Road' },
  ]
  return (
    <div className="max-w-sm">
      <Combobox options={users} value={val} onChange={setVal} placeholder="Search service users..." />
    </div>
  )
}

function SheetDemo() {
  const [open1, setOpen1] = React.useState(false)
  const [open2, setOpen2] = React.useState(false)
  return (
    <div className="flex flex-wrap gap-3">
      <Sheet open={open1} onOpenChange={setOpen1}>
        <SheetTrigger asChild>
          <Button variant="outline">Open Right Sheet</Button>
        </SheetTrigger>
        <SheetContent side="right" size="md">
          <SheetHeader>
            <SheetTitle>Alice Johnson</SheetTitle>
            <SheetDescription>Service user profile â€” quick view</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
              <p className="text-sm">Flat 12B, Greenview Estate, Manchester M14 5QR</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Care Package</p>
              <p className="text-sm">Personal Care Â· Medication Â· Meals</p>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen1(false)}>Close</Button>
            <Button>Edit Profile</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={open2} onOpenChange={setOpen2}>
        <SheetTrigger asChild>
          <Button variant="outline">Open Bottom Sheet</Button>
        </SheetTrigger>
        <SheetContent side="bottom" size="lg">
          <SheetHeader>
            <SheetTitle>Add Care Note</SheetTitle>
            <SheetDescription>Record a visit observation</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Textarea placeholder="Describe the visit..." className="min-h-[100px]" />
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen2(false)}>Cancel</Button>
            <Button>Save Note</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

const ONBOARDING_STEPS = [
  { id: 'personal', label: 'Personal Details', description: 'Name, DOB, contact info' },
  { id: 'address', label: 'Address', description: 'Current address' },
  { id: 'care', label: 'Care Needs', description: 'Assessment details' },
  { id: 'contacts', label: 'Next of Kin', description: 'Emergency contacts', optional: true },
  { id: 'review', label: 'Review', description: 'Confirm and submit' },
]

function StepperDemo() {
  const [current, setCurrent] = React.useState(2)
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Horizontal</p>
        <Stepper steps={ONBOARDING_STEPS} currentStep={current} onStepChange={setCurrent} />
        <StepperControls
          currentStep={current}
          totalSteps={ONBOARDING_STEPS.length}
          onBack={() => setCurrent(s => Math.max(0, s - 1))}
          onNext={() => setCurrent(s => Math.min(ONBOARDING_STEPS.length - 1, s + 1))}
          className="mt-4"
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Vertical</p>
        <Stepper steps={ONBOARDING_STEPS.slice(0, 4)} currentStep={1} orientation="vertical" />
      </div>
    </div>
  )
}

const ACTIVITY_ITEMS = [
  { id: '1', user: { name: 'Maria Santos' }, action: 'completed a care visit for', subject: 'Alice Johnson', timestamp: new Date(Date.now() - 5 * 60000), type: 'success' as const },
  { id: '2', user: { name: 'James Okafor' }, action: 'logged medication for', subject: 'Bob Williams', timestamp: new Date(Date.now() - 32 * 60000) },
  { id: '3', user: { name: 'Sarah Lee' }, action: 'raised an incident report', subject: '(Minor fall)', meta: 'Severity: Low', timestamp: new Date(Date.now() - 2 * 3600000), type: 'warning' as const },
  { id: '4', user: { name: 'Admin' }, action: 'updated care plan for', subject: 'Carol Davies', timestamp: new Date(Date.now() - 5 * 3600000) },
]

function ActivityFeedDemo() {
  return (
    <div className="max-w-md">
      <ActivityFeed items={ACTIVITY_ITEMS} showTimeline />
    </div>
  )
}

function CommandPaletteDemo() {
  const { open, setOpen } = useCommandPalette()
  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Search className="h-4 w-4" />
        Search or jump to...
        <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">âŒ˜K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search service users, staff, reports..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Service Users">
            <CommandItem onSelect={() => setOpen(false)}>
              <User className="h-4 w-4 text-muted-foreground" /> Alice Johnson <CommandShortcut>User</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <User className="h-4 w-4 text-muted-foreground" /> Bob Williams <CommandShortcut>User</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => setOpen(false)}><Home className="h-4 w-4 text-muted-foreground" /> Dashboard</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}><Bell className="h-4 w-4 text-muted-foreground" /> Notifications</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}><Settings className="h-4 w-4 text-muted-foreground" /> Settings <CommandShortcut>âŒ˜,</CommandShortcut></CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}

function DiffViewerDemo() {
  const oldContent = [
    "Alice requires assistance with personal care in the mornings.",
    "Medication: Amlodipine 5mg daily with breakfast.",
    "Mobility: Requires walking frame indoors.",
    "Visit frequency: 3 times daily.",
    "Key worker: Maria Santos.",
  ].join("\n")

  const newContent = [
    "Alice requires assistance with personal care in the mornings.",
    "Medication: Amlodipine 5mg daily with breakfast. Warfarin 2mg Tuesdays.",
    "Mobility: Requires walking frame indoors and outdoors.",
    "Visit frequency: 4 times daily.",
    "Key worker: James Okafor.",
    "Additional note: Falls risk assessment completed 05/05/2026.",
  ].join("\n")

  return <DiffViewer oldLabel="Previous Care Plan" newLabel="Updated Care Plan" oldContent={oldContent} newContent={newContent} />
}

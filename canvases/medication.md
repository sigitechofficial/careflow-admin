Final Full Implementation Plan
CareFlow Medication Records Module

This module should be built around one core idea:

Every medication dose due for a Service User becomes an individual Medication Administration Record.

So the system is not only storing medications. It is storing the full record of what happened every day, at every time of day, for every medicine.

---

## 0. HTML prototype baseline (`careflow-medication-records.html`)

The interactive HTML prototype is the **approved UX reference** for the React implementation in `care-admin`. Treat it as the visual and behavioural spec until backend APIs exist.

### 0.1 What the prototype proves (build these in production)

| Area | Prototype behaviour | Production target |
|------|---------------------|-------------------|
| **Calendar shell** | Service user header, month nav, alerts bar, primary tabs | `features/medication-records/pages/CalendarPage.tsx` |
| **MAR Calendar tab** | 28-day grid, sticky med + time columns, med group rows | **Done** — `MarCalendarTab` · `?view=calendar` |
| **Supply & cycles tab** | Per-medication supply cards + delivery/admin history tabs | **Done** — `MedicationSupplyTab` · `?view=supply` |
| **Cell semantics** | `Due` · `N/A` (not scheduled) · status codes · `PRN` (+ log) | Server marks `cellState` or derive from schedule + status |
| **Recording** | Modal: 14 status codes, conditional reason, admin vs on-behalf | **Done** — `RecordAdministrationDialog.tsx` (on-behalf pending) |
| **PRN** | `+` cells only; log modal with dose, reason, outcome | Pending — `RecordPrnDialog.tsx` |
| **Delivery** | Separate modal mode — not administration | **Done** — `LogDeliveryDialog.tsx` |
| **Drawer** | View record, cycle context, audit trail, review actions | **Done** — `RecordDetailDrawer.tsx` (audit/review pending) |
| **Correction** | Edit modal, mandatory correction notes, audit preserved | Pending — `CorrectRecordDialog.tsx` |
| **Filters** | Status, schedule type (daily/weekly/specific/monthly/prn), cell type | Query params + client filter |
| **KPI strip** | Due / Recorded / Missed / Review **today** | Computed from API for selected day |
| **Month stats** | MAR completion to-date + given / not given / open / PRN | `medication-mar-completion.util.ts` |
| **Week view** | Days 16–22 visible, colspan adjusts | Client view state on same dataset |
| **Group collapse** | Collapse medication groups in grid | UI only |
| **Legend** | Fixed popover: schedule legend + all 15 status codes | Shared `StatusLegend` component |
| **List view** | Table + status/PRN filters | `ListPage.tsx` |
| **Manager reviews** | Exception cards with review CTA | `ReviewsPage.tsx` |
| **Settings** | Status codes list + time slots | `SettingsPage.tsx` + admin API |
| **Export** | PDF options form + preview placeholder | `ExportPage.tsx` |

### 0.2 Prototype JavaScript modules → React feature map

| Prototype module | Responsibility | React equivalent |
|------------------|----------------|------------------|
| `STATUS_CODES` / `RECORDABLE_STATUS_CODES` | 15 codes; Pending not selectable | Seed + `useStatusCodes()` hook |
| `MarRecord` | Cell click → log/view/drawer; apply status to cell | `useRecordAdministration` mutation |
| `MarDelivery` | Log delivery by supply type (cycle/bottle/prescription) | `useLogDelivery` mutation |
| `MarFilters` | Filter grid rows/cells | `useMarFilters` or URL search params |
| `MarSummary` | Today KPIs + month stats | `useMarSummary(serviceUserId, month)` |
| `MarView` | Month/week toggle, go to today | Local UI state |
| `MarGroups` | Collapse med groups | Local UI state |
| `CalTabs` | MAR vs Supply tab switch | `Tabs` component |
| `LegendPopover` | Fixed-position legend | `Popover` + portal |
| `ListFilters` | List status + PRN filter | List page filters |
| `getRecordingContext()` | Admin vs on-behalf + `enteredBy` audit | Form state → API payload |

### 0.3 Calendar cell model (critical — implement exactly)

Three **cell states** before a status is recorded:

| Cell state | Display | Meaning | Click action |
|------------|---------|---------|--------------|
| **Due** | Yellow “Due” | Scheduled dose, not yet recorded | Open **Record Administration** modal |
| **N/A** | Grey “N/A” | Not scheduled this day (weekly/specific day off) | No action |
| **PRN** | Blue “+” | PRN med — log only when given | Open **Log PRN** modal |

After recording, cell shows **status code** (G, R, N, …). Pending (system) shows `…` in grid, `—` in legend.

**Schedule types** on group headers (filterable): `daily` · `weekly` · `specific` (Mon/Wed/Fri) · `monthly` · `prn`.

### 0.4 Supply models (from prototype `SUPPLY_MEDS`)

| Supply model | UI label | Delivery fields | Rules |
|--------------|----------|-----------------|-------|
| `blister_cycle` | Pharmacy blister pack | Delivered date, cycle end, qty (tabs), pharmacy, received by | 28-day cycle; links to MAR from delivery date |
| `bottle_28day` | Eye drop bottle | Opened date, expires date (auto +28d), size, doses | Discard after 28 days regardless of remainder |
| `prescription_qty` | Standard / CD supply | Received date, runs out, qty, pharmacy, witness if CD | CD register note on admin history |

Supply audit trail is **parallel** to MAR — not stored only in calendar cells.

### 0.5 Recording payload (prototype-validated)

Every administration save should support:

| Field | Notes |
|-------|-------|
| `statusCode` | One of 14 recordable codes (not Pending) |
| `reasonCode` / `reasonText` | Required when status `needsReason` |
| `recordedBy` | Carer or admin who administered |
| `enteredBy` | Set when manager records **on behalf of** carer |
| `recordedAt` | Actual time (default now) |
| `source` | `mobile` · `care_admin` · `phone` |
| `notes` | Optional |
| PRN only | `doseGiven`, `timeGiven`, `reasonForGiving`, `outcome` |
| CD only | `witnessBy`, `witnessAt` |

Corrections require `correctionReason` + `correctionNotes`; append audit log; never delete original row.

---

1. Final Module Structure

Main menu name:

Medication Records

Inside this module we should have:

Section	Purpose
Service User Medications	Add and manage medicines against each Service User
Calendar View	Monthly MAR style view with day columns and colored status codes
List View	Searchable table of all medication administration records
Manager Reviews	Review refused, missed, late, corrected, or risky records
MAR Chart Export	Printable monthly MAR chart
Reports	Missed, refused, late, unavailable, and audit reports
Settings	Time slots, status codes, color codes, reasons, rules
2. Correct End to End Flow

This is the final flow we should implement:

Step	Action	Result
1	Add medication against Service User	Medication + supply model (blister / bottle / prescription)
2	Add medication schedule	System knows when due; PRN skips daily pre-generation
3	Generate medication records	One row per date + time slot (Pending); PRN rows on demand
4	Log delivery (optional)	Supply cycle/bottle/prescription booked in — parallel to MAR
5	Carer or manager records administration	Status code + reason + `recordedBy` / `enteredBy`
6	Calendar view displays records	MAR grid: Due / N/A / PRN / status codes
7	Supply tab shows delivery + admin history	Audit trail per medication
8	List view displays records	Searchable and filterable record table
9	Manager reviews exceptions	R, N, U, O, P, PCI (+ corrections)
10	Export MAR chart	Official printable medication record

The database structure should follow this hierarchy:

Service User
  Medication Profile
    Medication
      Supply Profile
        Supply Deliveries
      Medication Schedule
        Medication Administration Record
          Status
          Reason
          Notes
          enteredBy (if on behalf)
          Audit Log
          Manager Review
3. Service User Medication Profile

Before adding individual medicines, each Service User should have a medication profile.

Purpose

This stores general medication related information for the Service User.

Field	Example
Service User	Selected Service User
Allergies	Penicillin
GP Name	Dr Smith
Surgery Name	Croydon Medical Centre
Surgery Phone	0208 xxx xxxx
Pharmacy Name	Local Pharmacy
Pharmacy Phone	0208 xxx xxxx
NHS Number	Optional
Medication Support Level	Administered by carer
Self Medication Allowed	Yes or No
Medication Risk Notes	Needs prompting
General Notes	Optional
UI Location

Inside Service User profile:

Service User Profile
  Overview
  Care Plan
  Visits
  Medication Profile
  Medications
  Medication Records
4. Add Medication Against Service User

This is the first real step.

The user should go to:

Service User Profile > Medications > Add Medication
Add Medication Form

The form should be split into clear sections.

Section 1: Basic Medication Details
Field	Required	Notes
Medication Name	Yes	Example: Paracetamol
Medication Type	Yes	Tablet, drops, cream, liquid, inhaler
Strength	Optional	Example: 500mg
Dose	Yes	Example: 1 tablet
Route	Yes	Oral, topical, eye, ear, injection
Instructions	Optional	Example: Take after food
Start Date	Yes	Date medication becomes active
End Date	Optional	Leave empty if ongoing
Review Date	Optional	For manager review
Status	Yes	Active, stopped, archived
Section 2: Pack and Supply Details

This is important because the screenshot shows blister pack and dossette box style medication records.

Field	Required	Notes
Pack Type	Optional	Blister Pack, Dossette Box, Bottle, Box, Tube
Pack Name	Optional	Example: Pharmacy Prepared Blister Pack
Supplied By Pharmacy	Optional	Yes or No
Pharmacy Name	Optional	Can come from profile
Prescription Checked	Optional	Yes or No
Prescription Checked By	Optional	Staff member
Prescription Checked Date	Optional	Date
Contains Text	Optional	Example: Contents of Pharmacy Prepared Blister Pack
Supply Notes	Optional	Any extra note

Pack type options:

Pack Type
Blister Pack
Dossette Box
Bottle
Box
Tube
Sachet
Inhaler
Injection
Drops Bottle
Other
Section 3: Schedule and Time of Day

This section defines when records should be created.

The screenshot clearly shows different medication times:

Time Slot
Morning
Midday
Afternoon
Evening
Night

We should support default and custom time slots.

Field	Required	Notes
Frequency Type	Yes	Daily, weekly, specific days, once only, PRN, custom
Start Date	Yes	Schedule start date
End Date	Optional	Schedule end date
Selected Days	Conditional	Required for weekly or specific days
Time Slots	Conditional	Morning, midday, afternoon, evening, night
Exact Due Times	Yes	Example: 08:00, 12:00, 18:00
Allowed Window	Optional	Example: 30 minutes before and 60 minutes after
Generate Records Until	System	Usually next 30 days

Example schedule:

Medication	Frequency	Time Slots	Records Created
Paracetamol	Daily	Morning, Midday, Evening	3 records per day
Eye Drops	Daily	Night	1 record per day
Blister Pack	Weekly	Midday	1 record on selected weekly day
Section 4: Safety Rules
Field	Purpose
Requires Witness	For controlled or high risk medication
Requires Manager Review	Force manager review after administration
Controlled Drug	Flag for controlled medication
PRN Medication	Medicine given as required
Covert Medication	Hidden medication, requires policy approval
Allow Carer to Mark Independent	Yes or No
Allow Family Administered Status	Yes or No
Reason Required for Exceptions	Usually yes
Attachment Required	Optional prescription attachment
Section 5: Preview Before Save

Before saving, show the manager what records will be generated.

Example:

Medication	Frequency	Time Slots	First Record	Generated Records
Paracetamol	Daily	Morning, Midday, Evening	10 Feb 2026, 08:00	90 records for next 30 days

This avoids confusion before creating records.

5. Medication Time Slots

Create a settings page:

Medication Records > Settings > Time Slots

Default time slots:

Slot	Default Time	Start Window	End Window	Order
Morning	08:00	07:00	10:00	1
Midday	12:00	11:00	14:00	2
Afternoon	15:00	14:00	17:00	3
Evening	18:00	17:00	20:00	4
Night	22:00	20:00	23:59	5
Custom	Custom	Custom	Custom	6

Important:

Each medication record must store both:

Field	Example
Time Slot	Midday
Exact Due Time	12:00

So the calendar view can group by time slot, and the system can still track exact due time.

6. Status Codes and Color Codes

Create a settings page:

Medication Records > Settings > Status Codes

Each status should have:

Field	Example
Code	R
Label	Refused
Color	Red
Text Color	White
Category	Exception
Requires Reason	Yes
Requires Manager Review	Yes
Active	Yes
Recommended Default Status Codes
Code	Status	Color	Category	Reason Required	Manager Review
G	Given	Green	Success	No	No
R	Refused	Red	Exception	Yes	Yes
N	Not Given / Missed	Orange	Warning	Yes	Yes
U	Unavailable	Grey	Warning	Yes	Yes
H	Hospitalised	Purple	Information	Yes	Optional
A	Absent	Blue Grey	Information	Yes	Optional
C	Cancelled	Dark Grey	Neutral	Optional	No
F	Family Administered	Blue	Information	Optional	Optional
I	Independent	Teal	Information	Optional	Optional
S	Self Medicated	Cyan	Information	Optional	Optional
T	Already Done	Indigo	Information	Optional	Optional
O	Other	Brown	Exception	Yes	Yes
P	Nausea / Vomiting	Pink	Exception	Yes	Yes
PCI	Please Contact Carer	Dark Red	Critical	Yes	Yes
Pending	Pending	Light Grey	Pending	No	No
UX Rule

Never rely on color alone.

Calendar cell should show:

R

with red background.

List view should show:

Refused

as a red badge.

Tooltip should show:

Refused by Service User
Recorded by Sarah
Recorded at 12:08
Reason: Service user refused
7. Medication Administration Record

This is the main record.

One record means:

This medication was due for this Service User on this date, at this time slot, at this exact due time, and this is what happened.

Example:

Service User	Medication	Date	Time Slot	Due Time	Status
Service User A	Blister Pack	16 Feb 2026	Midday	12:00	Refused

If a medication is due 4 times per day, create 4 records per day.

Example:

Date	Medication	Time Slot	Due Time	Status
16 Feb	Blister Pack	Morning	08:00	Given
16 Feb	Blister Pack	Midday	12:00	Refused
16 Feb	Blister Pack	Evening	18:00	Pending
16 Feb	Blister Pack	Night	22:00	Pending
8. Database Design

Assuming CareFlow uses PostgreSQL with Prisma, these are the core tables.

8.1 medication_status_codes
Field	Type	Notes
id	UUID	Primary key
code	String	G, R, N
label	String	Given, Refused
color	String	Hex color
textColor	String	Hex color
category	String	Success, Warning, Exception
requiresReason	Boolean	Yes or no
requiresManagerReview	Boolean	Yes or no
isSystemDefault	Boolean	Default records
isActive	Boolean	Active or disabled
createdAt	DateTime	Created date
updatedAt	DateTime	Updated date
8.2 medication_time_slots
Field	Type	Notes
id	UUID	Primary key
name	String	Morning, Midday
defaultDueTime	Time	08:00
windowStartTime	Time	07:00
windowEndTime	Time	10:00
displayOrder	Int	Sorting
isActive	Boolean	Active or disabled
createdAt	DateTime	Created date
updatedAt	DateTime	Updated date
8.3 service_user_medication_profiles
Field	Type	Notes
id	UUID	Primary key
serviceUserId	UUID	Linked Service User
allergies	Text	Allergy notes
gpName	String	GP name
surgeryName	String	Surgery name
surgeryPhone	String	Surgery contact
pharmacyName	String	Pharmacy
pharmacyPhone	String	Pharmacy contact
medicationSupportLevel	String	Administered, prompted, independent
selfMedicationAllowed	Boolean	Yes or no
riskNotes	Text	Medication risk notes
generalNotes	Text	Optional
createdBy	UUID	Staff user
updatedBy	UUID	Staff user
createdAt	DateTime	Created date
updatedAt	DateTime	Updated date
8.4 service_user_medications

This stores the medication setup.

Field	Type	Notes
id	UUID	Primary key
serviceUserId	UUID	Linked Service User
medicationName	String	Medicine name
medicationType	String	Tablet, drops, cream
strength	String	500mg
dose	String	1 tablet
route	String	Oral, topical, eye
instructions	Text	Take after food
startDate	Date	Start date
endDate	Date	Optional
reviewDate	Date	Optional
status	String	Active, stopped, archived
packType	String	Blister Pack, Dossette Box
packName	String	Pharmacy Prepared Blister Pack
containsText	Text	Contents of pack
suppliedByPharmacy	Boolean	Yes or no
pharmacyNameSnapshot	String	Snapshot at time
prescriptionChecked	Boolean	Yes or no
prescriptionCheckedBy	UUID	Staff member
prescriptionCheckedAt	DateTime	Date checked
isPRN	Boolean	As required medicine
isControlledDrug	Boolean	Controlled medication
isCovert	Boolean	Covert medication
requiresWitness	Boolean	Witness required
requiresManagerReview	Boolean	Review required
createdBy	UUID	Staff
updatedBy	UUID	Staff
stoppedBy	UUID	Staff
stoppedAt	DateTime	Stop date
stopReason	Text	Why stopped
createdAt	DateTime	Created date
updatedAt	DateTime	Updated date

Important:

Store snapshot values like dose, route, medication name in generated records too. If medication setup changes later, old records must still show what was true at that time.

8.5 medication_schedules

This stores when the medication is due.

Field	Type	Notes
id	UUID	Primary key
serviceUserId	UUID	Linked Service User
medicationId	UUID	Linked medication
frequencyType	String	Daily, weekly, specific days, once only, PRN, custom
selectedDays	JSON	Monday, Wednesday, Friday
selectedDates	JSON	For once or custom
timeSlotIds	JSON	Morning, Midday
exactTimes	JSON	08:00, 12:00
startDate	Date	Schedule start
endDate	Date	Schedule end
generateDaysAhead	Int	Example: 30
isActive	Boolean	Active or inactive
createdBy	UUID	Staff
updatedBy	UUID	Staff
createdAt	DateTime	Created date
updatedAt	DateTime	Updated date
8.6 medication_administration_records

This is the main record table.

Field	Type	Notes
id	UUID	Primary key
serviceUserId	UUID	Linked Service User
medicationId	UUID	Linked medication
scheduleId	UUID	Linked schedule
dueDate	Date	Medication due date
timeSlotId	UUID	Linked time slot
timeSlotName	String	Snapshot
dueTime	Time	Exact due time
windowStartTime	Time	Snapshot
windowEndTime	Time	Snapshot
medicationNameSnapshot	String	Snapshot
medicationTypeSnapshot	String	Snapshot
strengthSnapshot	String	Snapshot
doseSnapshot	String	Snapshot
routeSnapshot	String	Snapshot
instructionsSnapshot	Text	Snapshot
packTypeSnapshot	String	Snapshot
statusCodeId	UUID	Linked status
statusCode	String	G, R, N
statusLabel	String	Given, Refused
statusColor	String	Color snapshot
statusTextColor	String	Text color snapshot
statusCategory	String	Success, Exception
reasonCode	String	Optional
reasonText	Text	Required for exceptions
notes	Text	Carer notes
recordedBy	UUID	Carer
recordedAt	DateTime	Actual record time
source	String	Web, mobile
isLate	Boolean	Late flag
lateByMinutes	Int	Late minutes
requiresWitness	Boolean	Snapshot
witnessBy	UUID	Optional
witnessAt	DateTime	Optional
requiresManagerReview	Boolean	Yes or no
reviewStatus	String	Not Required, Pending, Reviewed
reviewedBy	UUID	Manager
reviewedAt	DateTime	Review date
reviewNotes	Text	Manager note
isManuallyCreated	Boolean	Manual record
isCorrected	Boolean	Corrected after submission
createdAt	DateTime	Created date
updatedAt	DateTime	Updated date

Default status should be:

Pending
8.7 medication_record_audit_logs

Every change must be logged.

Field	Type	Notes
id	UUID	Primary key
medicationRecordId	UUID	Linked record
action	String	Created, status changed, reviewed
oldValue	JSON	Previous value
newValue	JSON	New value
changedBy	UUID	Staff user
changedAt	DateTime	Date and time
reason	Text	Reason for change
ipAddress	String	Optional
deviceInfo	String	Optional
source	String	Web, mobile

Audit logs must never be deleted through normal app flow.

8.8 medication_record_attachments

For photos, prescription images, or supporting files.

Field	Type	Notes
id	UUID	Primary key
medicationRecordId	UUID	Linked record
fileName	String	File name
fileUrl	String	File link
fileType	String	Image, PDF
uploadedBy	UUID	Staff
uploadedAt	DateTime	Upload date
8.9 medication_supply_profiles

One row per active medication supply configuration (derived from medication setup + pack type).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| medicationId | UUID | Linked `service_user_medications` |
| supplyModel | String | `blister_cycle` · `bottle_28day` · `prescription_qty` |
| cycleDays | Int | Default 28 for blister |
| bottleDiscardDays | Int | Default 28 for eye drops |
| defaultQty | Int | Tabs/doses in pack |
| qtyUnit | String | `tabs` · `doses` |
| isControlledDrug | Boolean | Snapshot from medication |
| pharmacyName | String | Optional |
| notes | Text | Supply notes |
| isActive | Boolean | Active supply profile |
| createdAt / updatedAt | DateTime | Audit |

8.10 medication_supply_deliveries

Parallel audit trail for **Log Delivery** (prototype `MarDelivery`) — not administration.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| medicationId | UUID | Linked medication |
| supplyProfileId | UUID | Optional link to profile |
| deliveryType | String | `cycle` · `bottle` · `prescription` |
| deliveredAt | Date | Delivery / received date |
| cycleEndDate | Date | Blister cycle end (auto from cycleDays) |
| openedAt | Date | Bottle open date |
| expiresAt | Date | Bottle discard date (openedAt + 28d) |
| runsOutDate | Date | Prescription runs out |
| quantity | Int | Tabs/doses received |
| pharmacyName | String | Optional |
| receivedBy | UUID | Staff who received |
| witnessBy | UUID | CD receipt witness if required |
| notes | Text | Optional |
| source | String | `care_admin` · `mobile` |
| createdBy | UUID | Who logged delivery |
| createdAt | DateTime | Audit |

**Rule:** Delivery rows do not replace MAR status cells. Calendar may show cycle context in drawer (prototype: “Cycle 4 · ends 14 Mar”).

8.11 medication_administration_records — prototype additions

Add to §8.6 (validated in HTML prototype):

| Field | Type | Notes |
|-------|------|-------|
| enteredBy | UUID | Set when manager records **on behalf of** carer |
| cellState | String | `due` · `na` · `prn` · `recorded` (optional server field for grid) |
| prnDoseGiven | String | PRN only |
| prnReasonForGiving | Text | PRN only |
| prnOutcome | String | PRN only |
| correctionReason | String | Correction flow |
| correctionNotes | Text | Mandatory on edit |
| supplyDeliveryId | UUID | Optional link to active cycle/bottle |

9. Record Generation Logic

Medication records should be generated from active medication schedules.

Recommended Generation Window

Generate records:

Next 30 days

Run generation:

Trigger	Action
Medication created	Generate records
Schedule created	Generate records
Schedule updated	Regenerate future pending records
Daily background job	Extend next 30 days
Medication stopped	Stop future generation
Generation Rules
Read active medications.
Read active schedules.
For each valid due date, create one record per selected time slot.
Avoid duplicates using unique key.
Do not overwrite completed records.
Do not delete history.
If a schedule changes, only future pending records can be replaced.
If medication is stopped, future pending records should be cancelled or marked inactive based on business rule.
Unique Key

Use this to avoid duplicate records:

serviceUserId + medicationId + scheduleId + dueDate + timeSlotId + dueTime
Example

Medication:

Field	Value
Frequency	Daily
Time Slots	Morning, Midday, Evening
Generate Ahead	30 days

Records created:

30 days × 3 time slots = 90 records
10. Calendar View (prototype-validated)

The Calendar View is the MAR style screen. **Reference implementation:** `careflow-medication-records.html` (page `calendar`).

### 10.1 Page shell

| Element | Purpose |
|---------|---------|
| Service User header | Name, DOB, NHS, location, photo |
| Month navigator | Prev / next month; “Go to today” scrolls to current day column |
| Primary tabs | **MAR Calendar** · **Supply & cycles** (not separate routes in v1) |
| Alerts bar | Dismissible warnings (missed doses, review backlog, supply low) |
| KPI strip | **Due / Recorded / Missed / Review today** for selected day |
| Month stats | Collapsible panel: **MAR completion %** (to date), documented, still open, given, not given, PRN count |
| View toggle | **Month** (28/31 days) · **Week** (7-day window, same data) |
| Filters | Collapsible: status codes, schedule type, cell type (Due / N/A / PRN) |
| Legend | Fixed popover (portal) — schedule symbols + all 15 status codes |
| Actions | Export MAR, Print, Log delivery (global or per supply card) |

Route in `care-admin`: `/service-users/:serviceUserId/medication` (extend existing `ServiceUserMedicationPage` or split MAR sub-routes).

### 10.1.1 MAR completion metrics (CQC / NICE aligned)

**Regulatory intent (not a single CQC % formula):** Inspectors expect every **scheduled** dose in the period to be **accounted for** on the MAR — given **or** coded not given (refused, missed, held, etc.) with reasons where required ([CQC MAR guidance](https://www.cqc.org.uk/guidance-providers/adult-social-care/medicines-administration-records-adult-social-care), [NICE SC1](https://www.nice.org.uk/guidance/sc1)). PRN is recorded **only when administered**; empty PRN days are not “missed scheduled doses”.

**Careflow definitions (implemented):**

| Metric | Definition |
|--------|------------|
| **Completion window** | `periodStart` → `min(today, periodEnd)` (UTC dates). Past months use the full period; current month excludes future days. |
| **Scheduled to date** | Count of scheduled dose-slots in the window (excludes N/A and PRN-as-schedule rows). |
| **Documented** | Slots with any administration event (any status code). |
| **Still open** | Scheduled slots in the window with no record yet. |
| **Given** | Documented with code G, F, I, S, T. |
| **Not given** | Documented with other codes (N, R, U, C, …). |
| **MAR completion %** | `documented ÷ (documented + stillOpen) × 100` (one decimal). This is **documentation completeness**, not “% physically swallowed”. |
| **PRN administered** | PRN administrations recorded in the window (separate from scheduled completion). |

**Deprecated aliases (API backward compat):** `due` → `stillOpen`, `recorded` → `documented`, `compliancePercent` → `marCompletionPercent`.

**Export / UI:** HTML, PDF, Excel, CSV meta blocks and calendar month-stats panel use the labels above. KPI strip for **today** remains separate (`summary.due` / `recorded` / `missed` / `reviewToday`).

### 10.2 Grid structure

Rows are grouped by **medication group** (e.g. Blister Pack, Eye Drops, PRN Paracetamol). Each group shows schedule chip: `Daily` · `Weekly` · `Mon/Wed/Fri` · `PRN`.

| Column block | Content |
|--------------|---------|
| Sticky left | Medication name + collapse chevron |
| Sticky time | Time slot label (Morning, Midday, …) |
| Day 1…N | Cell per due dose |

Example (after recording):

| Medication | Time Slot | 16 | 17 | 18 |
|------------|-----------|----|----|-----|
| Blister Pack | Morning | G | Due | G |
| Eye Drops | Night | N/A | G | + |

### 10.3 Cell states (must match prototype §0.3)

| State | Display | Interaction |
|-------|---------|-------------|
| **Due** | Yellow “Due” | Open record modal |
| **N/A** | Grey striped “N/A” | No click |
| **PRN** | Blue “+” | Open PRN log modal |
| **Pending** | `…` in grid | System only — not selectable when recording |
| **Recorded** | Status code (G, R, …) | Click → drawer; long-press/edit → correction modal |
| **Review flag** | Dot on R/N/U/O/P/PCI | Manager review queue |

### 10.4 UI rules (from prototype Phases A–C)

| Rule | Detail |
|------|--------|
| Sticky medication + time columns | Remain visible on horizontal scroll |
| Sticky day header | Day numbers remain visible |
| Group collapse | Collapse entire medication group row |
| Horizontal scroll | 28–31 day columns |
| Status colors | Background + code letter (never color alone) |
| Tooltip | Quick status + recorded time on hover |
| Filter persistence | URL search params where possible |

### 10.5 Supply & cycles tab (same page)

Per medication supply card (`blister_cycle` · `bottle_28day` · `prescription_qty`):

- Current cycle / bottle / prescription summary
- **Log delivery** button → `LogDeliveryDialog` (not administration modal)
- Sub-tabs: **Delivery history** · **Administration history** (read-only MAR rows for that med)

### 10.6 Modals and drawer

| UI | Opens from | Purpose |
|----|------------|---------|
| Record administration | Due cell | Status grid (14 codes), reason, notes, admin vs on-behalf |
| Log PRN | PRN `+` cell | Dose, time, reason, outcome |
| Log delivery | Supply tab / toolbar | Cycle/bottle/prescription fields per supply model |
| Record drawer | Recorded cell | Full detail, cycle context, audit trail, review CTA |
| Correct record | Drawer / edit | New status + mandatory correction notes |
11. Calendar Record Drawer

When a user clicks a cell, open a side drawer.

Drawer Content
Field	Example
Service User	Selected Service User
Medication	Blister Pack
Medication Type	Tablet
Dose	1 tablet
Route	Oral
Date	16 Feb 2026
Time Slot	Midday
Due Time	12:00
Status	Refused
Status Code	R
Reason	Service user refused
Notes	Tried again after 10 minutes
Recorded By	Carer name
Recorded At	12:08
Late	No
Witness	Not required
Manager Review	Pending
Review Notes	Empty
Audit History	Timeline
Actions in Drawer
Role	Actions
Manager	Review, correct, add note, export
Coordinator	View, add note if allowed
Carer	View own submitted record
Auditor	View only
12. List View

The List View is for filtering, searching, and auditing.

Page Name
Medication Records > List View
Columns
Column	Purpose
Date	Due date
Time Slot	Morning, Midday, Evening
Due Time	Exact scheduled time
Service User	Linked Service User
Medication	Medication name
Dose	Expected dose
Route	Oral, drops, cream
Status	Full colored badge
Code	G, R, N
Reason	Required for exceptions
Recorded By	Carer
Recorded At	Actual time
Late	Yes or No
Review Status	Pending or reviewed
Actions	View details
Filters
Filter	Values
Service User	One or multiple
Date Range	Today, this week, this month, custom
Time Slot	Morning, Midday, Afternoon, Evening, Night
Status	Given, Refused, Missed, Pending
Status Category	Success, Warning, Exception
Medication	Specific medicine
Carer	Staff member
Review Status	Pending, reviewed
Late	Yes or no
Pack Type	Blister Pack, Dossette Box, etc
List View Actions
Action	Purpose
View Record	Open drawer
Review Record	Manager review
Correct Record	Manager correction with audit
Export	CSV or Excel
Print	Print selected record list
13. Carer Medication Recording Flow

This is used during domiciliary visits.

Location

Inside carer app or visit screen:

Visit Details > Medication Due
Flow
Step	Action
1	Carer opens Service User visit
2	System shows medications due during or near the visit
3	Carer selects medication
4	System shows dose, route, instructions, time
5	Carer selects status
6	If exception status, reason becomes mandatory
7	Carer adds notes if needed
8	Witness is requested if required
9	Carer submits
10	Calendar and list view update instantly
11	Audit log is created
Carer Status Options
Option	Code
Given	G
Refused	R
Not Given / Missed	N
Medication Unavailable	U
Service User Hospitalised	H
Service User Absent	A
Family Administered	F
Independent	I
Self Medicated	S
Already Done	T
Other	O
Nausea / Vomiting	P
Mandatory Reason Rule

Reason is mandatory for:

Status
Refused
Not Given / Missed
Unavailable
Hospitalised
Absent
Other
Nausea / Vomiting
Please Contact Carer
14. Manager Review Flow

Manager review should be required for risky or exception records.

Review Queue

Page:

Medication Records > Manager Reviews
Records Appearing in Queue
Condition	Review Required
Refused	Yes
Missed	Yes
Medication unavailable	Yes
Given late	Yes
Controlled drug	Yes
Witness missing	Yes
Manual correction	Yes
Repeated refusal	Yes
Please Contact Carer	Yes
Manager Review Actions
Action	Purpose
Mark Reviewed	Confirms manager has checked
Add Review Note	Add explanation
Request Follow Up	Keep open
Correct Record	Change status with audit
Escalate	Mark as critical
Review Statuses
Status	Meaning
Not Required	Normal record
Pending	Needs manager review
Reviewed	Checked by manager
Follow Up Required	Needs more action
Escalated	Critical issue
15. MAR Chart Export

The export should match the paper MAR chart style.

Page
Medication Records > MAR Chart Export
Export Inputs
Field	Example
Service User	Selected Service User
Month	February
Year	2026
Include Legend	Yes
Include Manager Signature	Yes
Include Audit Summary	Optional
Export Format	PDF
Printable MAR Should Include
Section	Details
Header	Service User name, DOB, location, NHS number
Month	Selected month
Medication details	Name, dose, route, frequency
Pack details	Blister pack, dossette box, contains text
Day columns	1 to 31
Time rows	Morning, Midday, Afternoon, Evening, Night
Status codes	G, R, N, U etc
Legend	Full code meaning
GP details	Optional
Pharmacy details	Optional
Allergies	Optional
Signature area	Manager or supervisor
Generated by	Staff name
Generated at	Date and time
Export Versions
Format	Purpose
PDF	Official record
Browser Print	Quick print
CSV	Data reporting
Excel	Optional later
16. API Implementation
16.1 Medication Profile APIs
Method	Endpoint	Purpose
GET	/service-users/:serviceUserId/medication-profile	Get medication profile
POST	/service-users/:serviceUserId/medication-profile	Create medication profile
PATCH	/service-users/:serviceUserId/medication-profile	Update medication profile
16.2 Medication Setup APIs
Method	Endpoint	Purpose
GET	/service-users/:serviceUserId/medications	List Service User medications
POST	/service-users/:serviceUserId/medications	Add medication
GET	/medications/:medicationId	Get medication details
PATCH	/medications/:medicationId	Update medication
PATCH	/medications/:medicationId/stop	Stop medication
PATCH	/medications/:medicationId/archive	Archive medication
GET	/medications/:medicationId/history	Medication setup history
16.3 Medication Schedule APIs
Method	Endpoint	Purpose
POST	/medications/:medicationId/schedules	Add schedule
GET	/medications/:medicationId/schedules	Get schedules
PATCH	/medication-schedules/:scheduleId	Update schedule
PATCH	/medication-schedules/:scheduleId/deactivate	Deactivate schedule
POST	/medication-schedules/:scheduleId/generate-records	Generate future records
16.4 Medication chart & administration APIs (implemented)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/service-users/:id/medication-chart/regular` | MAR calendar grid + `monthStats` + today `summary` |
| GET | `/service-users/:id/medication-chart/regular/export` | MAR export HTML / PDF / CSV / Excel |
| GET | `/service-users/:id/medication-chart/prn` | PRN administrations by date range |
| GET | `/service-users/:id/medication-events` | Paginated events list (History tab) |
| GET | `/service-users/:id/medication-events/:eventId` | Event detail + audit |
| POST | `/service-users/:id/medication-events` | Record administration / PRN |
| PATCH | `/service-users/:id/medication-events/:eventId` | Correction |
| POST | `/service-users/:id/medication-events/:eventId/review` | Manager review |

**Regular chart query:** `month=YYYY-MM` **or** `dateFrom` + `dateTo` (max 93 days); optional `medicationIds` (comma-separated UUIDs).

**Export query:** same as chart + `format=html|pdf|csv|xlsx` (+ `months=` for multi-sheet Excel, max 6); `preview=true` for in-app HTML preview (no export audit).
16.5 Settings APIs
Method	Endpoint	Purpose
GET	/medication-settings/status-codes	List status codes
POST	/medication-settings/status-codes	Create status code
PATCH	/medication-settings/status-codes/:id	Update status code
GET	/medication-settings/time-slots	List time slots
POST	/medication-settings/time-slots	Create time slot
PATCH	/medication-settings/time-slots/:id	Update time slot
GET	/medication-settings/reasons	List exception reasons
POST	/medication-settings/reasons	Create reason
16.6 Export and report APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/service-users/:id/medication-chart/regular/export` | MAR HTML / PDF / CSV / Excel (see §17) |
| GET | `/medication-reports/administered` | Administered report |
| GET | `/medication-reports/stock-levels` | Stock levels |
| GET | `/medication-reports/late-administrations` | Late administrations |
| GET | `/medication-reports/audit` | Medication audit report |

16.7 Swagger / OpenAPI (implemented — careadmin-backend)

Interactive API docs: **`http://localhost:3000/api/docs`** (override with env `SWAGGER_PATH`). Authorize with **Bearer** token from `POST /auth/login`, then filter by tag.

**Source:** `careadmin-backend/src/**/medication*.controller.ts` · shared decorator `ApiMedicationStandardResponses()` in `common/decorators/api-standard-responses.decorator.ts`.

### Swagger tags (14 tags · 59 routes)

| Tag | Base path(s) | Routes |
|-----|--------------|--------|
| **Medication Charts** | `/service-users/:id/medication-chart` | regular, prn, regular/export |
| **Medication Administration** | `/service-users/:id/medication-events` | list, get, create, patch, review |
| **Medication Supply** | `/service-users/:id/medication-supply` | bundle, deliveries |
| **Service User Medications** | `/service-users/:id/medications` | list, CRUD, status patch |
| **Medication Schedules** | `…/medications/:medicationId/schedules`, `…/medication-schedule-preview` | CRUD schedules + preview |
| **Medication Lookups** | `/medication-lookups` | bundle + types/routes/categories/frequencies/rounds/reasons/status-codes |
| **Medication Status Codes** | `/medication-status-codes` | list, active, by code, by id, patch |
| **Medication Time Slots** | `/medication-administration-rounds` | list, get, patch |
| **Medication Reports** | `/medication-reports` | administered, stock-levels, late-administrations, audit |
| **Medication Reviews** | `/service-users/:id/medication-reviews` | list, create, patch, delete |
| **Medication Allergies** | `/service-users/:id/medication-allergies` | list, create, patch, delete |
| **Medication Packs** | `/service-users/:id/medication-packs` | packs + items CRUD |
| **Medication Support Profile** | `/service-users/:id/medication-support-profile` | get, patch |

### Standard error responses (every route)

Applied via `@ApiMedicationStandardResponses()`:

| Status | Body | When |
|--------|------|------|
| **400** | `ApiErrorResponseDto` (`success: false`, `message`, optional `errors[]`) | Validation or business rule failure |
| **401** | — | Missing or invalid bearer token |
| **403** | — | Authenticated but missing permission |
| **404** | `ApiErrorResponseDto` | Service user, medication, event, schedule, etc. not found |

### Success response schemas (key DTOs)

| Area | DTO file |
|------|----------|
| Regular MAR chart | `medication-charts/dto/medication-regular-chart-response.dto.ts` |
| PRN chart | `medication-charts/dto/medication-prn-chart-response.dto.ts` |
| MAR export | `medication-charts/decorators/api-mar-export-responses.decorator.ts` (HTML/PDF/CSV/XLSX Content-Types) |
| Administration events | `medication-administration/dto/medication-administration-response.dto.ts` |
| Supply | `medication-supply/dto/medication-supply-response.dto.ts` |
| Schedule preview | `medication-schedules/dto/medication-schedule-preview-response.dto.ts` |
| Status codes | `medication-status-codes/dto/medication-status-code-response.dto.ts` |
| Time slots | `medication-administration-rounds/dto/medication-administration-round-response.dto.ts` |
| Medications, lookups, reports, reviews, allergies, packs, support profile | `*/dto/*-response.dto.ts` under each module |

### JSON wire envelope

Most JSON responses pass through `ResponseInterceptor` and arrive as:

```json
{
  "success": true,
  "message": "Request successful",
  "data": { },
  "meta": { }
}
```

Handlers that already return `{ data, meta }` keep the same shape; flat objects (e.g. single medication, support profile) are wrapped in `data`. **Binary export** (`regular/export` with `format=pdf|csv|xlsx`) streams the file directly (no envelope).

### Swagger limitations (known)

- Nested includes (e.g. event `medication`, chart cell audit) may be typed as `unknown` with “see live response” notes.
- **401** / **403** are documented as descriptions only (no typed error body).
- §16.1–16.3 / §16.5 list legacy or planned paths; **implemented** paths match the table above and Swagger tags.
- Primary routes (MAR, events, supply, administered report) have **golden envelope examples**; other routes still rely on schema field samples only.

### Enterprise maturity & roadmap

**Today: tier 4–5 (contract-grade)** — golden wire examples, report/event DTOs, `openapi.json` export, Jest contract specs.

| Tier | Target | Status |
|------|--------|--------|
| 1 — Basic | Routes in `/api/docs` | Done |
| 2 — Documented | Schemas + 400/401/403/404 | Done |
| 3 — Usable | Field examples + §16.7 | Done |
| 4 — Contract-grade | Golden operation examples + wire envelope | Done — `ApiEnvelopeOkResponse` on MAR, events, supply, reports |
| 5 — Governed | `openapi.json` export + contract tests | Done — `pnpm run openapi:export` · `src/common/swagger/*.spec.ts` |

**Golden examples:** `careadmin-backend/src/common/swagger/medication-api.examples.ts`

**OpenAPI artifact:** `careadmin-backend/openapi/openapi.json` (regenerate: `pnpm run openapi:export` from `careadmin-backend/`)

**Tracked in:** `canvases/enterprise-design-plan.canvas.tsx` → **Track D — OpenAPI / Swagger** (`sw-1` … `sw-8` complete; **`sw-9` pending** — CI automation).

### Future: OpenAPI in CI (`sw-9`) — backlog

**Status:** Pending · **Track:** enterprise-design-plan.canvas.tsx → Medication (P9) → Track D → task `sw-9`

On each PR/build, CI should:

1. Run `pnpm run openapi:export` in `careadmin-backend/` (boots Nest, writes `openapi/openapi.json` from live decorators — same spec as `/api/docs`).
2. Compare the generated file to the committed `openapi/openapi.json` on the branch (`git diff --exit-code`).
3. **Fail the build** if they differ (API changed but spec not updated).
4. Developer fixes by running export locally, committing the updated JSON, and re-pushing.

**Why:** Postman/codegen/import get a trustworthy contract; PRs show API diffs; docs cannot drift from code without a red CI.

**Typical implementation:** GitHub Action on `careflow-api` / `careadmin-backend` — `pnpm install` → `pnpm run openapi:export` → diff check (optionally commit artifact on `main` only).

17. Regular MAR chart API (`GET …/medication-chart/regular`)

**Swagger:** §16.7 · tag **Medication Charts** · schema `MedicationRegularChartResponseDto`.

### Query parameters

| Param | Type | Description |
|-------|------|-------------|
| `month` | `YYYY-MM` | Single calendar month |
| `dateFrom` | `YYYY-MM-DD` | Custom range start (inclusive) |
| `dateTo` | `YYYY-MM-DD` | Custom range end (inclusive, max 93 days) |
| `medicationIds` | string | Comma-separated medication UUIDs to filter |

### Response (implemented shape)

```json
{
  "month": "2026-05",
  "lastDay": 31,
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "periodLabel": "May 2026",
  "dayDates": ["2026-05-01", "2026-05-02"],
  "medicationCount": 9,
  "scheduleRowCount": 24,
  "legend": [
    { "code": "G", "label": "Given", "color": "#2E7D32", "textColor": "#FFFFFF", "requiresReview": false }
  ],
  "summary": {
    "date": "2026-05-28",
    "due": 3,
    "recorded": 12,
    "missed": 1,
    "reviewToday": 0
  },
  "monthStats": {
    "completionThroughDate": "2026-05-28",
    "scheduledToDate": 186,
    "documented": 142,
    "stillOpen": 44,
    "given": 128,
    "notGiven": 14,
    "marCompletionPercent": 76.3,
    "prnAdministered": 6,
    "due": 44,
    "recorded": 142,
    "compliancePercent": 76.3
  },
  "medications": [
    {
      "medicationId": "uuid",
      "scheduleId": "uuid",
      "medicationName": "Atorvastatin 20mg",
      "packName": "Morning pack",
      "dose": "1 tab",
      "strength": "20mg",
      "routeName": "Oral",
      "type": "Tablet",
      "frequency": "Once daily",
      "scheduleType": "daily",
      "timeSlot": "Morning",
      "dueTime": "08:00",
      "roundWindowStart": "07:00",
      "roundWindowEnd": "10:00",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": null,
      "days": [
        {
          "day": 1,
          "date": "2026-05-01",
          "cellState": "recorded",
          "recordId": "uuid",
          "statusCode": "G",
          "statusLabel": "Given",
          "color": "#2E7D32",
          "textColor": "#FFFFFF",
          "requiresReview": false
        },
        {
          "day": 2,
          "date": "2026-05-02",
          "cellState": "due",
          "recordId": null,
          "statusCode": "Due",
          "statusLabel": "Due",
          "color": "#FEF3C7",
          "textColor": "#92400E",
          "requiresReview": false
        }
      ]
    }
  ]
}
```

### `monthStats` (MAR completion to date)

See §10.1.1. **`summary`** is **today only**; **`monthStats`** is **period start → `completionThroughDate`** (`min(today UTC, periodEnd)`).

| Field | Meaning |
|-------|---------|
| `completionThroughDate` | Last date included in aggregates |
| `scheduledToDate` | Scheduled slots in window (excludes N/A, PRN-empty) |
| `documented` | Slots with any administration event |
| `stillOpen` | Scheduled slots with no record |
| `given` | Documented with G, F, I, S, T |
| `notGiven` | Documented with other codes (N, R, U, C, …) |
| `marCompletionPercent` | `documented ÷ (documented + stillOpen) × 100` |
| `prnAdministered` | PRN doses recorded in window (not in %) |

Deprecated aliases: `due`, `recorded`, `compliancePercent`.

### Cell states

| `cellState` | Meaning |
|-------------|---------|
| `due` | Scheduled, no event |
| `recorded` | Administration event exists |
| `na` | Not scheduled that day |
| `prn` | PRN med, no administration that day |

### Export (`GET …/medication-chart/regular/export`)

| `format` | Response |
|----------|----------|
| *(omit)* / `html` | `text/html` printable MAR |
| `pdf` | `application/pdf` |
| `csv` | `text/csv` with MAR completion section |
| `xlsx` | Excel workbook (`months=` → one sheet per month, max 6) |

Export meta block repeats `monthStats` labels (MAR completion through, documented, still open, given, not given, PRN).
18. Backend Services

Create these services in the backend.

Service	Responsibility
MedicationProfileService	Profile, GP, pharmacy, allergies
ServiceUserMedicationService	Add, update, stop medications
MedicationScheduleService	Manage medication schedules
MedicationRecordGeneratorService	Generate future records
MedicationRecordService	Calendar and list view
MedicationStatusService	Given, refused, missed logic
MedicationReviewService	Manager review
MedicationAuditService	Log every change
MedicationExportService	MAR chart PDF
MedicationReportService	Missed, refused, late reports
MedicationSettingsService	Status codes, colors, time slots
19. Frontend Pages
Admin Web App
Page	Purpose
Service User Medication Profile	Allergies, GP, pharmacy, support level
Add Medication	Add medicine against Service User
Medication Details	View full medication setup
Medication Schedule	Manage time slots and frequency
Calendar View	Monthly MAR chart style view
List View	Filterable medication records
Record Drawer	Full record details
Manager Reviews	Review exceptions
MAR Export	Export printable chart
Medication Settings	Status codes and time slots
Carer App
Page	Purpose
Visit Medication Due	Shows medicines due during visit
Medication Detail	Dose, route, instructions
Record Medication	Given, refused, missed
Exception Reason	Mandatory reason screen
Confirmation	Submission complete
Medication History	Limited history if allowed
20. Frontend Components
Shared Components
Component	Purpose
StatusBadge	Colored label
StatusCodeCell	Calendar cell
MedicationLegend	Code explanation
TimeSlotBadge	Morning, Midday
MedicationRecordDrawer	Record detail
MedicationFilters	Common filters
ServiceUserMedicationHeader	Service User identity
AuditTimeline	Show record changes
Calendar Components
Component	Purpose
MedicationCalendarPage	Main page
MedicationCalendarGrid	Grid wrapper
MedicationCalendarHeader	Days 1 to 31
MedicationGroupRow	Medication group
MedicationTimeSlotRow	Morning, Midday row
MedicationStatusCell	G, R, N cell
List Components
Component	Purpose
MedicationRecordListPage	Main list
MedicationRecordTable	Records table
MedicationRecordFilters	Filters
ReviewStatusBadge	Manager review state
MedicationRecordActions	View, review, correct
21. Business Rules
Rule 1: Medication setup and records are separate

Medication setup means:

This Service User takes this medicine.

Medication record means:

This medicine was due at this date and time, and this is what happened.
Rule 2: Historical records must never be overwritten

If medication dose changes from:

1 tablet

to:

2 tablets

old records must still show:

1 tablet

That is why record snapshot fields are required.

Rule 3: Exception statuses require reason

Reason is required for refused, missed, unavailable, absent, hospitalised, nausea, vomiting, other, and contact carer statuses.

Rule 4: Late medication should be flagged

If the medication is due at 12:00 and the allowed window ends at 14:00, then after 14:00 the record becomes overdue.

Fields:

Field	Value
isLate	true
lateByMinutes	45
reviewStatus	Pending
Rule 5: Stopped medication should not generate future records

When medication is stopped:

Record Type	Action
Past records	Keep
Completed records	Keep
Today pending records	Follow business rule
Future pending records	Cancel or remove from active calendar
Future generation	Stop

Recommended status for future records:

Cancelled

This preserves a trail.

Rule 6: Manual corrections require audit

If a manager changes:

Refused

to:

Given

the system must store:

Field	Value
Old status	Refused
New status	Given
Changed by	Manager
Changed at	Date and time
Reason	Correction reason
Rule 7: Carers can only record assigned Service Users

Carers should only update medication records for:

Condition
Assigned Service User
Active visit
Due medication
Allowed time window, unless late recording is allowed
22. Permissions
Role	View	Add Medication	Record Medication	Correct	Review	Export
Super Admin	Yes	Yes	Yes	Yes	Yes	Yes
Manager	Yes	Yes	Yes	Yes	Yes	Yes
Coordinator	Yes	Optional	No	No	Optional	Yes
Carer	Limited	No	Yes	No	No	No
Auditor	Yes	No	No	No	No	Yes
Family Portal	Optional	No	No	No	No	No
23. Reports
Required Reports
Report	Purpose
Missed Medication Report	Shows all not given or missed records
Refused Medication Report	Shows all refused records
Late Medication Report	Shows late records
Unavailable Medication Report	Medication was not available
Pending Records Report	Due but not recorded
Manager Review Report	Records awaiting review
Medication Audit Report	All changes and corrections
Service User MAR Report	Monthly record for one Service User
Carer Medication Activity	Records submitted by carer
24. Notifications and Alerts
Alert Rules
Trigger	Notify
Medication overdue	Manager / coordinator
Medication refused	Manager
Medication missed	Manager
Repeated refusal	Manager
Controlled drug not witnessed	Manager
Medication unavailable	Manager
Pending review older than 24 hours	Manager
Schedule has no future records	Admin
Dashboard Cards
Card	Example
Due Today	120
Pending	18
Missed	4
Refused	3
Late	6
Awaiting Review	9
25. Edge Cases
Case	Handling
Medication created mid month	Generate from start date only
Medication stopped mid month	Keep past, stop future
Dose changed mid month	Future records use new dose, old records keep old snapshot
Time changed from 08:00 to 09:00	Future pending records update, completed records unchanged
Carer submits after time window	Mark as late
Refused without reason	Block submission
Medication due but no visit exists	Still show in admin as pending
Service User hospitalised	Allow bulk status update for date range
Medication unavailable	Require reason and review
Duplicate schedule	Block using unique rule
PRN medication	Create record only when administered or attempted
Network issue on mobile	Queue offline submission with timestamp
26. PRN Medication Handling

PRN medication is different because it is given only when required.

PRN Setup
Field	Example
Medication Name	Pain relief
Dose	1 tablet
Max Dose	4 tablets per day
Minimum Gap	4 hours
Reason Required	Yes
Outcome Required	Yes
PRN Record

PRN does not need pre generated daily records unless the agency wants reminders.

A PRN record should be created when carer gives or offers it.

Fields:

Field	Purpose
Reason for giving	Why medicine was needed
Dose given	Actual dose
Time given	Actual time
Outcome	Effective, not effective, unknown
Follow up time	Optional
27. Bulk Actions

Useful for domiciliary care workflows.

Bulk Action	Example
Mark Service User hospitalised	All due meds marked H for selected date range
Mark Service User absent	All due meds marked A
Cancel future records	When medication stopped
Generate records	Generate next 30 days
Export month	Generate MAR PDF

Bulk actions must always create audit logs.

28. Implementation Phases (revised — prototype → production)

Phases below map **HTML prototype work** (A–C done in `careflow-medication-records.html`) to **care-admin + API** delivery. Phase D is React production.

### Track A — Prototype (complete in HTML)

| Phase | Delivered in prototype | Notes |
|-------|------------------------|-------|
| **A — Calendar shell** | MAR + Supply tabs, sticky grid, filters, legend popover | UX reference locked |
| **B — Grid UX** | Med group collapse, go-to-today, sticky headers | |
| **C — Insights** | KPI strip, month/week toggle, month stats, status search in modals | |

### Track B — Backend & data (do before full React MAR)

**Phase 1: Settings foundation**

- Seed 15 status codes (§6 + prototype `STATUS_CODES`)
- Time slots, exception reasons, color config APIs
- **Outcome:** Config drives grid colours and validation rules

**Phase 2: Service User medication setup**

- Extend existing `AddMedicationDialog` / medication profile APIs
- Pack & supply section → `medication_supply_profiles` (§8.9)
- **Outcome:** Medications + supply model per med

**Phase 3: Scheduling**

- Frequency types: daily, weekly, specific days, monthly, PRN
- Schedule preview (“90 records for 30 days”)
- **Outcome:** Due dates + `cellState` derivable (Due vs N/A vs PRN)

**Phase 4: Record engine**

- `medication_administration_records` + generation job (30 days ahead)
- `enteredBy`, PRN fields, snapshots (§8.11)
- Unique key: medication + date + time slot
- **Outcome:** Single source for calendar, list, export

**Phase 5: Supply deliveries**

- `medication_supply_deliveries` API (§8.10)
- Log delivery separate from administration
- **Outcome:** Supply tab backed by real data

### Track C — care-admin UI (Phase D)

**Phase D1: Calendar MAR tab** (parity with prototype §0.1)

| Task | Component / hook |
|------|------------------|
| Page shell + tabs | `MedicationCalendarPage` or extend `ServiceUserMedicationPage` |
| Grid | `MarCalendarGrid`, `MarCell`, `MarMedGroup` |
| Filters + legend | `MarFiltersBar`, `StatusLegendPopover` |
| KPI + month stats | `useMarSummary` |
| Record modal | `RecordAdministrationDialog` (14 codes, on-behalf) |
| PRN modal | `RecordPrnDialog` |
| Drawer + correction | `RecordDetailDrawer`, `CorrectRecordDialog` |

**Phase D2: Supply tab**

- `SupplyMedicationCard`, `LogDeliveryDialog`, delivery/admin history lists

**Phase D3: List, reviews, settings, export**

- List view + filters (prototype `list` page)
- Manager reviews queue (statuses requiring review)
- Settings: status codes + time slots
- MAR export PDF (layout matches grid)

**Phase D4: Mobile / carer (parallel)**

- Due meds on visit, same record API, `source: mobile`

**Phase D5: Reports & alerts**

- Missed / refused / late / unavailable reports
- Dashboard alerts (prototype alerts bar → real rules)

### Suggested sprint order

1. Phases 1–4 (backend) — unblock grid data  
2. Phase 5 (supply API) — unblock Supply tab  
3. D1 → D2 → D3 (care-admin) — match prototype screenshots  
4. D4 + D5 — carer app + compliance reporting  

### Prototype → React parity checklist

| Prototype feature | React status (May 2026) |
|-------------------|-------------------------|
| MAR calendar grid | **Done** — `MarCalendarTab` · `?view=calendar` |
| Supply & cycles | **Done** — `MedicationSupplyTab` · `?view=supply` |
| Log delivery modal | **Done** — `LogDeliveryDialog` (separate from administration) |
| Record administration | **Done** — `RecordAdministrationDialog` on Due cells |
| Record drawer | **Done** — `RecordDetailDrawer` on recorded cells |
| KPI strip (today) | **Done** — from chart API `summary` |
| 15 status codes UI | **Done** in record modal (lookups `statusCodes`) |
| Add medication | **Done** — `AddMedicationDialog.tsx` |
| Administration history | **Partial** — `?view=events` History tab |
| Filters / week view / month stats | **Done** — MarFiltersBar, week/month; stats use CQC-aligned completion to date |
| PRN log / correction / reviews | **Done** — PRN cells + dialogs; PATCH correction; `?view=reviews` |
| MAR export | **Partial** — `?view=export` + `GET .../medication-chart/regular/export` HTML download; PDF pending |
| Manager review | **Done** — `POST .../medication-events/:id/review`; queue filters unreviewed only |
| Event snapshots | **Done** — name/dose/strength/route captured at record time |
| Entered-by display | **Done** — drawer shows `enteredBy` when recorded on behalf |
| Settings (status codes) | **Partial** — `/settings?tab=medication` edit colours/active |
| History filters | **Done** — date range, status, search, pagination, row → drawer |

### Implementation log (production)

| Date | Track | Delivered |
|------|-------|-----------|
| 2026-05 | B + D1 | Chart API: `cellState`, colors, legend, summary; `statusCode` on POST events |
| 2026-05 | B5 + D2 | `MedicationSupplyProfile` + `MedicationSupplyDelivery`; supply bundle + log delivery APIs; Supply tab |
| 2026-05 | B + D1 | MAR completion metrics + API/Swagger docs (`monthStats`, export meta, §17) |
| 2026-05 | D1 | `/service-users/:id/medication` tabs: Records, MAR calendar, Supply, History; module tabs strip |
| 2026-05 | D1 | MAR filters, week view, PRN log, record correction, on-behalf recording, review queue tab |
| 2026-05 | D3 | Settings medication tab; export MAR tab; history filters + MedicationStatusBadge |
| 2026-05 | B4 + D3 | Manager review API; event snapshots; MAR HTML export endpoint; review UI in drawer/queue |
| 2026-05 | B + docs | Full medication Swagger: 14 tags, 59 routes, `ApiMedicationStandardResponses`, §16.7 |
| 2026-05 | B + plan | Enterprise API docs roadmap — tier 3 done; tier 4–5 in enterprise-design-plan canvas (Track D, sw-4–sw-8) |
| 2026-05 | B + docs | Tier 4–5 Swagger: golden envelope examples, report/event DTOs, openapi:export, contract tests (sw-4–sw-8) |

## 34. Future todos (backlog)

| ID | Area | Task | Notes |
|----|------|------|-------|
| **sw-9** | API / CI | OpenAPI drift check on PR — `pnpm run openapi:export` then fail if `openapi/openapi.json` ≠ committed | See §16.7 · local export works today |
| rx-17 | React | Mobile carer visit recording (same medication-events API) | D4 |
| rx-18 | React | Compliance reports / dashboard alerts (missed, refused, late) | D5 |
| rx-19 | QA | e2e: calendar record · delivery · review smoke | Optional |
| rx-2 | React | Optional `features/medication-records/` scaffold | Lives under `service-users/medication` today |
| **Track E** | Blister / MCA | Phase 10 — see **§35** (42 tasks; E0 in progress) | Standalone meds frozen; legacy blister migrated E4 |

29. QA Test Plan
Backend Tests
Test	Expected Result
Add medication	Medication is saved against Service User
Add daily schedule with 3 slots	3 records per day are generated
Add weekly schedule	Records generated only on selected day
Prevent duplicate records	Duplicate blocked
Mark given	Status becomes G
Mark refused without reason	API rejects
Mark refused with reason	Record saved and review required
Late submission	isLate becomes true
Stop medication	Future records stop
Change dose	Future records use new dose
Old records keep snapshot	Old dose remains
Manager review	Review status changes
Correction	Audit log created
Export MAR	PDF generated
Frontend Tests
Test	Expected Result
Add medication form validation	Required fields enforced
Schedule preview	Shows expected records
Calendar month loads	Days display correctly
Status colors display	Colors match settings
Click cell	Drawer opens
Filter refused	Only refused records show
List view search	Results update
Manager review	Record updates
Export button	MAR downloads
Permission Tests
Test	Expected Result
Carer sees assigned Service User only	Access restricted
Carer cannot correct record	Blocked
Coordinator cannot update status	Depends on permission
Auditor cannot edit	Read only
Manager can review	Allowed
30. Final Acceptance Criteria

The module is complete only when all of these are true:

| Requirement | Must match prototype |
|-------------|---------------------|
| Medication + supply profile per Service User | Yes |
| 15 status codes (14 recordable + Pending) | Yes |
| Cell states: Due, N/A, PRN, recorded codes | Yes |
| MAR Calendar + Supply & cycles tabs | Yes |
| Log delivery ≠ record administration | Yes |
| One record per due date + time slot | Yes |
| `enteredBy` when recording on behalf | Yes |
| PRN: log when given, not daily pre-fill | Yes |
| KPI strip (today) + month stats | Yes |
| Month / week view on same data | Yes |
| Filters: status, schedule type, cell type | Yes |
| Manager review on exception codes | Yes |
| Correction with audit (no delete) | Yes |
| List view + export PDF | Yes |
| Calendar, list, export share one table | Yes |

31. care-admin feature structure

Target layout (align with existing `features/service-users` patterns):

```
care-admin/src/features/medication-records/
  api/
    medication-records.api.ts      # calendar, list, record CRUD
    medication-supply.api.ts       # deliveries, supply profiles
    medication-settings.api.ts     # status codes, time slots
  hooks/
    useMarCalendar.ts
    useMarSummary.ts
    useMedicationRecord.ts
    useLogDelivery.ts
    useMedicationSettings.ts
  keys.ts
  types.ts                         # barrel — UI imports types from here only
  components/
    MarCalendarGrid.tsx
    MarCell.tsx
    MarFiltersBar.tsx
    MarKpiStrip.tsx
    MarMonthStats.tsx
    StatusLegendPopover.tsx
    RecordAdministrationDialog.tsx
    RecordPrnDialog.tsx
    LogDeliveryDialog.tsx
    RecordDetailDrawer.tsx
    CorrectRecordDialog.tsx
    SupplyMedicationCard.tsx
  pages/
    MedicationCalendarPage.tsx     # or tabs inside ServiceUserMedicationPage
    MedicationListPage.tsx
    MedicationReviewsPage.tsx
    MedicationExportPage.tsx
    MedicationSettingsPage.tsx

care-admin/src/features/service-users/medication/
  AddMedicationDialog.tsx          # EXISTS — extend pack/supply fields → API
```

**Routes (suggested):**

| Path | Page |
|------|------|
| `/service-users/:id/medication` | Calendar (default tab) + Supply |
| `/service-users/:id/medication/list` | List view |
| `/service-users/:id/medication/reviews` | Manager reviews |
| `/service-users/:id/medication/export` | MAR export |
| `/settings/medication` | Org-wide status codes & time slots |

32. API surface (implemented — care-admin + careadmin-backend)

**OpenAPI:** full medication surface documented in Swagger — see **§16.7** (`http://localhost:3000/api/docs`).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/service-users/:id/medication-chart/regular` | MAR grid + `monthStats` + `summary` (§17) |
| GET | `/service-users/:id/medication-chart/regular/export` | MAR HTML / PDF / CSV / Excel |
| GET | `/service-users/:id/medication-events` | History list |
| POST | `/service-users/:id/medication-events` | Record administration |
| PATCH | `/service-users/:id/medication-events/:eventId` | Correction |
| POST | `/service-users/:id/medication-events/:eventId/review` | Manager review |
| GET | `/service-users/:id/medication-supply` | Supply bundle |
| POST | `/service-users/:id/medication-supply/deliveries` | Log delivery |
| GET | `/medication-status-codes` | Org status codes (settings) |
| GET | `/medication-administration-rounds` | Time rounds (settings) |

Per cell: `recordId`, `cellState`, `statusCode`, `statusLabel`, `color`, `textColor`, `requiresReview`. See §17 for `monthStats` / `summary`.

Final Direction for the Team

1. **Treat `careflow-medication-records.html` as the UX contract** for Phase D — do not redesign MAR layout without product sign-off.  
2. **Build backend Phases 1–5 before** large React grid work (empty grid blocks QA).  
3. **Extend** existing `AddMedicationDialog` and `/service-users/:id/medication` route rather than a greenfield module name.  
4. **Keep supply and administration separate** — two modals, two tables, one shared medication entity.  
5. **No competitor/vendor naming** in UI copy; research stays in internal notes only (§33).

The most important technical rule:

**Calendar, list, and MAR export must read the same `medication_administration_records` rows.**

The most important product rule:

Every record must answer: *who*, *which medicine*, *when due*, *what happened*, *who recorded it* (and *who entered it if on behalf*), *why* (if exception), and *whether it was reviewed*.

---

## 33. Market research notes (internal — not shown in product UI)

Brief research on how other UK care platforms handle medication recording informed CareFlow design choices. **Vendor names are not used in the product** — patterns are adopted under CareFlow naming only.

| Pattern adopted in CareFlow | What we took from market practice |
|----------------------------|-----------------------------------|
| MAR calendar grid | Standard UK MAR / eMAR digitisation |
| Supply & cycles tab | End-to-end stock: delivery, cycles, 28-day bottles, CD receipt |
| 15 status codes + reasons | CQC/NICE non-administration recording |
| Manager review queue | Exception oversight on refused/missed/unavailable |
| Log delivery modal | Booking-in audit trail separate from administration |
| PRN + cells | Log when given, not pre-filled daily cells |

**CareFlow principle:** One `MedicationAdministrationRecord` table powers calendar, list, and export. Supply is a parallel audit trail, not embedded only in grid cells.

---

## 35. Phase 10 — Blister pack / MCA (Track E)

**Status:** Enterprise spec **draft** — E0 in progress (May 2026). Build E1+ not started.  
**Canvas:** `enterprise-design-plan.canvas.tsx` → **Blister pack (P10)** tab.  
**Regulatory baseline:** [CQC MAR (Nov 2025)](https://www.cqc.org.uk/guidance-providers/adult-social-care/medicines-administration-records-adult-social-care) · [CQC MCAs](https://www.cqc.org.uk/guidance-providers/adult-social-care/multi-compartment-compliance-aids-mcas-adult-social-care) · NICE SC1 / NG67 · PRESCQIPP MCA v2.0.

### 35.1 Scope boundary (what is frozen vs migrated)

**Frozen — standalone medicine (no behaviour change):**

| Flow | Rule |
|------|------|
| Add / edit / stop / archive **regular or PRN med** (not via pack wizard) | Unchanged APIs and UI |
| `MedicationSchedule` patterns for standalone meds | Unchanged |
| `MedicationAdministrationEvent` create / correct / review | Unchanged — still one event per med × slot × day |
| Per-med supply for **non-pack** meds (`prescription_qty`, `bottle_28day`) | Unchanged |
| MAR cell states, status codes, review queue | Unchanged for standalone rows |

**Migrated — legacy blister path (explicit E1/E4 work):**

| Today | Track E change |
|-------|----------------|
| `AddMedicationDialog` → BLISTER_PACK bulk-create | **Deprecated** after E4 — redirect to pack lifecycle wizard; standalone dialog unchanged |
| `MedicationPackItem` catalog rows (no med FK) | **Retired as runtime source** — backfill → `MedicationPackMember` |
| `medicationPackId` on med → infers `BLISTER_CYCLE` + **per-med delivery** | Pack members: **pack delivery only**; per-med blister delivery **blocked** when active member |
| PRN allowed in blister add | **Blocked** on member link |
| Shared schedule forced on all pack items in dialog | Wizard: shared **round labels** only; **frequency may differ per member** |

**Added — overlay only:**

- Pack cycle entity, manifest, pack delivery, MAR/supply **presentation**, export bundle for inspection.

Default for new service users remains **original pack + per-med eMAR**. MCA only after documented assessment (support profile).

### 35.2 Canonical linking model (single source of truth)

Three tables exist today; Track E assigns **one runtime authority**:

```
MedicationPack (cycle)
  └── MedicationPackMember[]          ← RUNTIME authority
        serviceUserMedicationId (FK, unique per ACTIVE pack)
        roundLabel?                   ← Morning / Evening (display + manifest)
        joinedAt, endedAt?

ServiceUserMedication
  medicationPackId                  ← DENORMALIZED cache (synced from member row)
  supplyModel                       ← BLISTER_CYCLE only while active pack member

MedicationPackContentsSnapshotLine[]  ← IMMUTABLE at publish (audit / CQC)
  copied from member + med + schedule at publish time
  includes: name, strength, dose, route, roundLabel, frequencySummary,
            tabletDescription?, photoUrl? (optional pharmacy feed)

MedicationPackItem                    ← LEGACY — migrate then read-only/archive
```

**Rules**

1. **Member row is canonical** — create/update/end membership only via pack APIs; sync `medicationPackId` on med.
2. **Publish** copies members → snapshot lines; published snapshot is never edited (supersede only).
3. **At most one ACTIVE pack per service user per `roundLabel`** (e.g. one “Morning MCA”, one “Evening MCA”); multiple packs allowed if round labels differ.
4. A med may belong to **zero or one** ACTIVE pack at a time.
5. Stopping a med ends membership; MAR history retained on med rows.
6. **Pack wizard — hybrid member setup:** For each medicine in the pack, staff may either **(a) link** an existing `ServiceUserMedication` on the chart, or **(b) create** a new chart row **from within the pack wizard** and auto-link it as `MedicationPackMember` in the same flow (single save or atomic API). Both paths produce the same runtime objects — a normal chart med + member row — and the same Model A per-med MAR. In-wizard create uses the **same fields and validation** as Add Medication (name, strength, dose, route, schedule, time slots); it is **not** compartment bulk-create or orphan `MedicationPackItem` rows. CD / PRN / covert / liquid guards apply on **both** link and create paths. Optional: “Open full Add Medication form” for advanced fields, returning to wizard with auto-link on save.

**Wizard UX (Step 1 — medicines)**

| Action | UI | Backend |
|--------|-----|---------|
| Link existing | Checkbox list of pack-eligible chart meds | `POST …/medication-packs/:id/members` `{ serviceUserMedicationId }` |
| Create new | Inline form or full Add Medication (return to wizard) | `POST …/members` with `{ create: CreateMedicationDto }` **or** create med then link in one transaction |
| Result | Member appears in wizard + manifest draft | `ServiceUserMedication` + `MedicationPackMember`; `medicationPackId` synced |

### 35.3 Recording model

**Model A — per-med MAR (mandatory v1–E4)**

| Question | Enterprise answer |
|----------|-------------------|
| Record all medicines in pack? | **Yes** — published manifest lists every drug with descriptions. |
| Mapping? | **Yes** — `MedicationPackMember` ↔ `ServiceUserMedication`. |
| Administration | **Existing per-med events** — no pack-level “G” in v1. |
| Same compartment, mixed outcomes? | **Each med recorded independently** — G on Amlodipine, R on Simvastatin same round; UI shows round context on group header. |
| Model B (one tap / pouch scan) | **E5 only** — requires pharmacy integration + partial-refusal expansion. |

### 35.4 Supply & stock rules (E2 — must be built to spec)

**Pack delivery (booking-in)**

| Field | Meaning |
|-------|---------|
| `deliveredAt` | Pharmacy receipt date |
| `compartmentCount` | Total administered slots in tray (e.g. 28 days × 2 rounds = 56) — **not** sum of tablets |
| `cycleStartDate` / `cycleEndDate` | Inclusive MAR/supply window |
| `receivedById` | Staff who signed receipt |
| `checkedById` | Second staff (dual check — CQC booking-in) |
| `pharmacyName`, `notes` | As today |

**Per-member allocation (read model — not separate deliveries)**

For each ACTIVE member while cycle is open:

```
expectedDosesInCycle(member) = count scheduled administrations between cycleStart and cycleEnd
remainingDoses(member)       = expectedDosesInCycle − count GIVEN events in window
packRemainingIndicator       = min(remainingDoses) across members in pack (conservative)
```

- **Do not** create `MedicationSupplyDelivery` rows per member for pack meds when pack delivery exists.
- Supply tab: **one pack card** shows cycle receipt + per-member remaining table (read-only drill-down).
- Standalone `POST …/medication-supply/deliveries` returns **409** if med is active pack member (message: use pack delivery).

**Legacy data migration:** existing per-med blister deliveries → attach to synthetic “Cycle 0” pack delivery or leave historical; no double-count in remaining calc.

### 35.5 Lifecycle & state machine

```
DRAFT → (publish) → ACTIVE → (supersede) → SUPERSEDED
                  ↘ (end) → ENDED
```

| Action | Who | Rules |
|--------|-----|-------|
| **Create DRAFT** | Meds-trained staff | Members may be added; no manifest yet |
| **Publish** | Manager or `pack.publish` permission | All members ACTIVE meds + schedules; PRN/CD/covert rules pass; snapshot frozen |
| **Deliver** | `pack.deliver` | Only on ACTIVE pack; one primary delivery per cycle (adjustments = amendment rows) |
| **Supersede** | Manager | New DRAFT pack, cycleNumber+1, copy forward still-active members; old → SUPERSEDED |
| **End** | Manager | No new deliveries; members unlinked; med continues standalone if still prescribed |
| **Mid-cycle med change** | Wizard | **Short-term:** end membership + standalone original pack. **Long-term:** supersede + new pharmacy cycle |

**Edit after publish:** PATCH pack metadata (pharmacy name) only — **not** member list. Member changes require end-membership or supersede.

### 35.6 Compliance edge cases

| Case | v1 rule |
|------|---------|
| **PRN** | **Not in pack** — block at member link |
| **Controlled drugs (CD)** | **Not in MCA pack** — must be standalone + CD register + witness flow |
| **Witness-required** | **Not in pack** |
| **Covert** | **Not in pack** — individual assessment + separate administration record |
| **Liquids, creams, inhalers** | **Not in pack** — hybrid: show on MAR as standalone alongside pack group |
| **Split tablets** | Pharmacy must supply split in appropriate container; if not, **not in pack** |
| **Tablet identification** | Manifest line includes `tabletDescription` (text) + optional `appearanceNote`; pharmacy list PDF attached when available |
| **Retention** | Snapshots + pack deliveries retained **≥ 8 years** (align MAR retention) |
| **MCA assessment** | Support profile: `mcaAssessedAt`, `mcaAssessedByRole`, `mcaReason` (NICE NG67) — required before first publish |

### 35.7 Permissions & audit

| Permission | Action |
|------------|--------|
| `service_users.medications.read` | List packs, view manifest |
| `service_users.medications.create` | Create DRAFT, add members |
| `service_users.medications.update` | Publish, end membership |
| **`service_users.medications.pack_publish`** (new) | Publish snapshot |
| **`service_users.medications.pack_deliver`** (new) | Log pack delivery |
| **`service_users.medications.pack_supersede`** (new) | Supersede cycle |

**Audit actions (extend AuditModule.MEDICATION):** `PACK_PUBLISHED`, `PACK_SUPERSEDED`, `PACK_DELIVERED`, `PACK_MEMBER_ADDED`, `PACK_MEMBER_ENDED`, `PACK_ENDED`.

### 35.8 Inspection & export

MAR export bundle for inspectors (E3):

1. Monthly MAR grid (existing export) — pack members show **pack badge + cycle number** on group header.
2. **Manifest PDF** for same date range / active cycle at export time.
3. **Delivery receipt** summary for cycle covering export month.

Export API: `GET …/medication-chart/regular/export?includePackManifest=true` (or zip bundle).

### 35.9 Mobile / domiciliary

**Out of scope E1–E4** (admin + care-home first). **E6 (future):** carer app read-only pack context on visit; administration still per-med via existing mobile events API.

### 35.10 Product definition (summary)

**Blister pack in CareFlow** = versioned pharmacy MCA cycle: cycle number, window, immutable manifest, member mapping, one booking-in delivery per cycle, hybrid with standalone meds.

### 35.11 Gap analysis — today vs target

| Area | Today | Track E target |
|------|--------|----------------|
| Linking | `medicationPackId` + orphan `MedicationPackItem` | `MedicationPackMember` canonical + denormalized FK |
| Pack entity | Name, dates | + cycleNumber, status, packType, roundLabel |
| Manifest | None | Immutable snapshot + tablet description |
| Supply | Per-med `BLISTER_CYCLE` delivery | One pack delivery; block per-med for members |
| MAR UI | Badge per med row | Collapsible pack group + round context |
| Partial refusal | Per-med (works) | Documented same-round UX |
| Export | Per-med grid only | Grid + manifest + receipt bundle |
| Edge cases | PRN/CD allowed in blister dialog | Explicit block rules |
| Permissions | Generic medication perms | pack_publish / pack_deliver / pack_supersede |
| Migration | N/A | Backfill script + legacy delivery handling |

### 35.12 Domain schema (target)

See §35.2 for entity relationships. New tables:

- `MedicationPackMember`
- `MedicationPackContentsSnapshot` + `MedicationPackContentsSnapshotLine`
- `MedicationPackDelivery` (+ optional `MedicationPackDeliveryAmendment`)

Extend `MedicationPack`: `cycleNumber`, `packType`, `status`, `roundLabel`, pharmacy check fields.

### 35.13 UX surfaces

| Surface | Purpose |
|---------|---------|
| **Records → Blister packs** tab | Cycle list, DRAFT/ACTIVE/SUPERSEDED |
| **Pack wizard** | Create DRAFT → **link existing and/or create-and-link members** → publish |
| **Manifest** | View/print/PDF; attached to export |
| **Log pack delivery** | Dual sign-off booking-in |
| **MAR calendar** | Pack group header; inner per-med rows |
| **Supply** | One card per active cycle + member remaining table |
| **Supersede wizard** | Pharmacy change / new cycle |
| **Support profile** | MCA assessment fields (required before publish) |

Prototype: `careflow-medication-records.html` — update in **bp-proto-1** before E3 React.

### 35.14 API surface

**Extended existing**

| Method | Endpoint | Change |
|--------|----------|--------|
| GET/POST/PATCH | `…/medication-packs` | Cycle + status fields |
| POST | `…/medication-packs/:id/members` | Link existing med **or** create chart med + link (`serviceUserMedicationId` **or** nested `create` body) |
| DELETE | `…/medication-packs/:id/members/:memberId` | End membership |

**New**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `…/medication-packs/:id/publish` | Freeze manifest |
| POST | `…/medication-packs/:id/supersede` | New cycle |
| POST | `…/medication-packs/:id/end` | End pack |
| GET | `…/medication-packs/:id/manifest` | JSON manifest |
| GET | `…/medication-packs/:id/manifest.pdf` | CQC cross-reference print |
| POST/GET | `…/medication-packs/:id/deliveries` | Pack booking-in |
| GET | `…/medication-chart/regular/export` | + `includePackManifest` bundle |

**Guard:** `POST …/medication-supply/deliveries` → **409** for active pack members.

### 35.15 Delivery phases

| Phase | Scope | Exit criteria |
|-------|--------|---------------|
| **E0 — Enterprise spec** | Linking model, supply rules, edge matrix, wireframes, migration, QA plan | Product sign-off; prototype delta |
| **E1 — Data + manifest** | Member table, publish, backfill, guards | Publish produces immutable manifest |
| **E2 — Pack supply** | Pack delivery, block per-med, remaining calc | One receipt per cycle; no double booking-in |
| **E3 — Presentation + export** | MAR group, supply card, export bundle, partial-refusal UX | Inspector bundle in one export |
| **E4 — Operations** | Wizard replaces legacy dialog, supersede, MCA profile | Legacy blister path deprecated |
| **E5 — Pharmacy** | PMR / pouch QR | Optional Model B |
| **E6 — Mobile** | Carer read-only pack context | Future domiciliary |

### 35.16 Task backlog

| ID | Track | Task | Phase |
|----|-------|------|-------|
| bp-d-1 | Design | Model A + standalone freeze documented | E0 |
| bp-d-2 | Design | Legacy blister migration path documented | E0 |
| bp-d-3 | Design | Canonical linking model (§35.2) signed off | E0 |
| bp-d-4 | Design | Supply allocation rules (§35.4) signed off | E0 |
| bp-d-5 | Design | Lifecycle state machine (§35.5) signed off | E0 |
| bp-d-6 | Design | Edge-case matrix CD/witness/covert/liquids (§35.6) | E0 |
| bp-d-7 | Design | Wireframes — pack tab, wizard, manifest, delivery | E0 |
| bp-d-8 | Design | Migration playbook + backfill strategy | E0 |
| bp-d-9 | Design | QA plan (§35.17) | E0 |
| bp-proto-1 | Proto | HTML prototype blister group + supply card refresh | E0 |
| bp-be-1 | Backend | Migration — cycle, status, packType, roundLabel | E1 |
| bp-be-2 | Backend | MedicationPackMember + sync medicationPackId | E1 |
| bp-be-3 | Backend | ContentsSnapshot + publish service | E1 |
| bp-be-4 | Backend | Manifest GET + PDF | E1 |
| bp-be-5 | Backend | PRN / CD / witness / covert guards on member link | E1 |
| bp-be-6 | Backend | Backfill script: legacy pack → members + Cycle 0 | E1 |
| bp-be-7 | Backend | MedicationPackDelivery + dual sign-off | E2 |
| bp-be-8 | Backend | Remaining-doses read model (§35.4 formula) | E2 |
| bp-be-9 | Backend | Block per-med supply delivery for pack members (409) | E2 |
| bp-be-10 | Backend | Supersede + end pack APIs | E4 |
| bp-be-11 | Backend | Permissions pack_publish / pack_deliver / pack_supersede | E1 |
| bp-be-12 | Backend | Audit actions for pack lifecycle | E1 |
| bp-be-13 | Backend | OpenAPI — all pack cycle routes | E1–E4 |
| bp-rx-1 | React | Blister packs tab on Records | E3 |
| bp-rx-2 | React | Pack wizard (DRAFT → members → publish) | E4 |
| bp-rx-3 | React | Manifest view + print | E3 |
| bp-rx-4 | React | Pack log delivery — dual sign-off | E2 |
| bp-rx-5 | React | MAR pack group header + round context | E3 |
| bp-rx-6 | React | Supply pack card + member remaining table | E2 |
| bp-rx-7 | React | Partial refusal UX — same round mixed G/R/N | E3 |
| bp-rx-8 | React | Export bundle — MAR + manifest + receipt | E3 |
| bp-rx-9 | React | Hybrid filter in pack / standalone / all | E3 |
| bp-rx-10 | React | Supersede + mid-cycle wizard | E4 |
| bp-rx-11 | React | Support profile MCA assessment fields | E4 |
| bp-rx-12 | React | Deprecate AddMedicationDialog BLISTER_PACK → wizard | E4 |
| bp-sw-1 | OpenAPI | Manifest + delivery DTOs + examples | E1–E2 |
| bp-sw-2 | OpenAPI | Publish / supersede / 409 guard examples | E1–E4 |
| bp-sw-3 | OpenAPI | Export bundle query param documented | E3 |
| bp-qa-1 | QA | E2E: publish → deliver → per-med MAR unchanged | E4 |
| bp-qa-2 | QA | Partial refusal same-round scenario | E3 |
| bp-qa-3 | QA | Supersede mid-cycle + manifest history | E4 |
| bp-qa-4 | QA | Regression — standalone med add/MAR/supply | E4 |

### 35.17 QA plan

| Test | Expected |
|------|----------|
| Add standalone med | Identical to pre–Track E behaviour |
| Publish pack with 3 members | Manifest PDF lists 3 drugs with descriptions |
| Log pack delivery | One receipt; per-med delivery rejected for members |
| Record G/R mix same round | Three independent events; group header shows round |
| Supersede cycle | Old SUPERSEDED; new cycleNumber; MAR continues on same med IDs |
| Export with manifest | Zip/PDF bundle includes MAR + manifest + receipt |
| Link CD med to pack | API 400 with clear message |
| Legacy backfill | Existing medicationPackId rows have members; no duplicate deliveries |

### 35.18 Market alignment (2026 — internal)

| Pattern | Reference | CareFlow |
|---------|-----------|----------|
| Per-med eMAR; MCA = supply format | Access, ATLAS | Model A + manifest |
| Dual blister + original | Care Vision | Hybrid + filters |
| Pack metadata | Birdie | Full per-med MAR + manifest |
| Pouch scan | PillPacPlus | E5 / Model B |

### 35.19 Success criteria

1. **Single linking model** — no orphan PackItem vs Member drift.  
2. **Inspector bundle** — MAR + dated manifest + delivery receipt in one export.  
3. **No double booking-in** — pack delivery OR per-med, never both for members.  
4. **Standalone regression zero** — automated QA bp-qa-4 green.  
5. **Edge cases enforced** — PRN/CD/covert/liquids blocked at API with documented messages.  
6. **Lifecycle auditable** — every publish/supersede/delivery in audit log.  
7. **Legacy migrated** — backfill complete; old dialog deprecated.

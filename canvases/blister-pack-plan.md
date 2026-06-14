Complete Blister Pack Journey — Enterprise Specification

> **Alignment with Track E (`medication.md` §35):** Pack wizard Step 1 supports **two equivalent paths** for each medicine — **select from chart** (already added) **or create new** (same fields as Add Medication, auto-linked to pack). Both produce `ServiceUserMedication` + `MedicationPackMember`. MAR remains **Model A** (per medicine, per round). Compartment-level “mark all given” is **E5+**, not v1.

Journey overview — 6 end-to-end flows
Flow 1  →  Add blister pack (manager setup)
Flow 2  →  Log new cycle delivery (when pack arrives from pharmacy)
Flow 3  →  Carer records administration (daily)
Flow 4  →  Mid-cycle medicine change (GP changes prescription)
Flow 5  →  Manager review and correction
Flow 6  →  Cycle end and archiving

Flow 1 — Adding a blister pack
This is done once per medication profile setup. Done by manager or coordinator.
Entry point: Service User → Medications → **Blister Packs → Add blister pack** (wizard). Standalone **Add Medication** remains available for non-pack meds (CD, PRN, liquids, etc.).

Step 1 — Add medicines to this pack (two paths)
For each tablet/capsule in the pharmacy tray, the manager either **selects an existing chart medicine** or **creates a new one in the wizard** (both link as pack members).

| Path | When to use | Result |
|------|-------------|--------|
| **Select from chart** | Medicine already on eMAR | Checkbox → `MedicationPackMember` link |
| **Create new in wizard** | Prescription not on chart yet | Inline form (or full Add Medication) → chart row + member link in one step |

PRN, controlled drugs, covert, and liquids are **not** pack-eligible on either path — add via standalone Add Medication only.

Step 2 — Pack details
FieldRequiredNotesPack nameYese.g. "Pharmacy Prepared Blister Pack" — free textPack typeYesBlister Pack / Dossette Box / Nomad Tray / OtherPharmacy nameYesAuto-populated from service user profile, editablePharmacy phoneYesFor querying dispensing issuesPrescribing GPYesAuto-populated from profile, editableGP surgeryYesNHS numberYesCross-referenced for dispensingPack start dateYesDate first cycle beginsReview dateYesWhen the medication should be reviewed by GPPrescription checkedYesCheckbox — who checked and whenPrescription checked byYesStaff member namePrescription checked dateYesDatePrescription imageOptionalPhoto of dispensing label / prescription attached herePack notesOptionalAny special handling instructions

Step 3 — Define the compartments
Which time slots does this pack cover? The manager selects which compartments exist in this pack.
Each compartment selected creates a slot in the MAR grid. Each has:
FieldRequiredNotesTime slotYesMorning / Midday / Afternoon / Evening / Night / CustomExact due timeYese.g. 08:00Window startYese.g. 07:00Window endYese.g. 10:00Late thresholdYesAfter window end = late, triggers flag
Example output — a pack with 4 compartments:
Morning    08:00   window 07:00–10:00
Midday     12:00   window 11:00–14:00
Evening    18:00   window 17:00–20:00
Night      22:00   window 20:00–23:59

Step 4 — Confirm pack members and schedules
Each linked or newly created medicine keeps its **own schedule and time slots** (e.g. Paracetamol Morning + Evening = two MAR rows under the pack header). The manager reviews the member list and round coverage — not a separate “add medicine per compartment” bulk step. Manifest lines are copied from member + schedule at **publish**.

For each pack member (linked or created):
FieldRequiredNotesMedicine nameYesSearch from NHS dm+d database — auto-populates strength, form, routeStrengthYesAuto-populated from dm+d, editableDose (quantity)Yese.g. "2 tablets" — this is the quantity to giveRouteYesOral, sublingual, buccal — auto-populated, editableIndicationYese.g. "Blood pressure" — plain English for carersInstructionsOptionale.g. "Take with food" — shown to carer at administration timeControlled drugYesFlag — triggers witness requirementCovert medicationIf applicableRequires separate policy approval and documentationAllergy checkAutoSystem cross-references against service user allergy profile and alerts if match found
Example — morning compartment fully populated:
Morning compartment — 08:00
├── Amlodipine 5mg         1 tablet    Blood pressure
├── Paracetamol 500mg      2 tablets   Pain relief          [Take after food]
├── Omeprazole 20mg        1 capsule   Stomach protection   [Take 30 mins before eating]
└── Vitamin D3 800IU       1 tablet    Supplement
The manager can add medicines to multiple compartments. Paracetamol for example may appear in Morning, Midday, and Evening. It is added separately to each compartment — because the system needs to track it compartment by compartment, not just as "Paracetamol — daily."

Step 5 — Safety and administration rules
Covers the whole pack, not individual medicines.
RuleOptionsNotesWitness requiredWhich compartmentsUsually Night if contains CDControlled drug compartmentsAuto-flagged from Step 4Manager confirmsCovert medicationYes / NoRequires separate approvalAllow carer to record lateYes / NoWhether carer can record after window closesLate recording max hoursNumbere.g. up to 4 hours after windowPRN override allowedYes / NoCan carer give extra dose outside packManager review requiredAlways / Exceptions onlyWhether every record or only exceptions goes to managerRisk notes for this packFree textDisplayed prominently to carer at administration time

Step 6 — Schedule settings
FieldRequiredNotesFrequencyYesDaily / Weekly / Specific days / Monthly / CustomSelected daysIf weekly / specific daysMon–Sun checkboxesStart dateYesFirst record generated from this dateEnd dateOptionalLeave blank for ongoingReview dateYesWhen GP should review the whole prescriptionGenerate records aheadYesDefault: 30 daysStop on which conditionYesEnd date reached / medication stopped / manual stop

Step 7 — Preview before saving
Before the manager saves, the system shows:
Contents summary — every compartment with every medicine inside it, formatted as the printable MCA Contents Record.
Records preview — how many records will be generated:
Frequency: Daily
Compartments: Morning, Midday, Evening, Night
Start date: 01 Feb 2026
Generate ahead: 30 days
Records to be created: 30 days × 4 compartments = 120 records
First record: 01 Feb 2026, 08:00
Last record in window: 02 Mar 2026, 22:00
Allergy alerts — if any medicine in any compartment matches an allergy on the service user profile, displayed here with a hard block until acknowledged.
Controlled drug warning — if any CD is in the pack, the witness requirement confirmation is shown.
MCA contents record — the printable CQC-required document is shown in preview. Manager must confirm it is accurate before saving. This document gets stored digitally and can be printed at any time.

Step 8 — Confirm and generate
Manager confirms. System:

Saves the blister pack record
Saves the MCA contents record for Cycle 1
Generates 120 MAR records (all pending)
Creates the supply tracking record
Triggers notification to coordinator that medication has been set up
Makes the blister pack row appear in the MAR calendar


Step 9 — Print MCA contents record
System prompts manager to print the MCA contents record. This is the paper document CQC inspectors check. It includes:

Service user name and DOB
NHS number
Pharmacy name and contact
GP name and surgery
Pack cycle number and dates
Each compartment and the medicines inside it (name, strength, dose, route, instructions)
Manager signature line
Date produced
"This document must be kept with the medication"


Flow 2 — Logging a new cycle delivery
Done every time a new blister pack arrives from the pharmacy. Done by the staff member who receives it — usually a carer, coordinator, or manager.
Trigger: Dashboard alert "New delivery expected" → OR manually from Service User → Medications → Blister Pack → Log Delivery

Step 1 — Delivery details
FieldRequiredNotesCycle numberAutoSystem increments — Cycle 2, Cycle 3, etc.Date receivedYesDate the pack physically arrivedTime receivedYesTime of dayReceived byYesStaff member who received the packDelivered byYesPharmacy courier / collected in person / relative brought itPharmacy batch referenceOptionalReference number from pharmacy labelPack condition on receiptYesIntact / Damaged — if damaged, notes requiredPhoto of pack on receiptOptionalPhoto attached to cycle record

Step 2 — Contents verification (reconciliation)
The system now shows the medicines from the previous cycle and asks the staff member to confirm the new pack matches.
For each compartment, the system shows:
Morning compartment — expected contents based on last cycle:
├── Amlodipine 5mg         1 tablet     ☐ Confirm present
├── Paracetamol 500mg      2 tablets    ☐ Confirm present
├── Omeprazole 20mg        1 capsule    ☐ Confirm present
└── Vitamin D3 800IU       1 tablet     ☐ Confirm present
Staff ticks each one as confirmed present. If anything is missing or different, they flag it. Flags go immediately to manager.

Step 3 — Medicines reconciliation check
System compares the new cycle's expected contents against current active prescriptions. This is the formal medicines reconciliation step.
Three possible states for each medicine:
StateDisplayAction requiredMatches prescriptionGreen — confirmedNoneNew medicine in pack not on prescriptionRed — discrepancyManager must authorise or query pharmacyMedicine on prescription not in packAmber — missingManager must investigateDose different from prescriptionAmber — dose discrepancyManager must confirm or query
If any discrepancy, the cycle cannot be marked active until a manager resolves and authorises it. This is a hard gate — CQC requires this.

Step 4 — Update contents if changed
If a medicine has changed since the last cycle (dose change, new medicine, stopped medicine), the manager updates the MCA contents record here. This creates a new versioned contents record:
Cycle 2 Contents Record — effective 01 Feb 2026
Supersedes Cycle 1 Contents Record (07 Dec 2025)
Change: Paracetamol dose increased from 1 tablet to 2 tablets
Authorised by: Sarah Mitchell, 01 Feb 2026

Step 5 — Manager countersignature
Before the cycle goes live, a manager must countersign the delivery record. This confirms:

Contents received match prescription
Any discrepancies have been investigated and resolved
Pack is safe to administer

FieldRequiredManager nameYesManager signature (PIN or digital)YesDate countersignedYesNotesOptional

Step 6 — Attach prescription image
Manager attaches a photo of the pharmacy dispensing label. This is stored against Cycle 2's record permanently.

Step 7 — Cycle goes live
System:

Marks Cycle 2 as Active
Marks Cycle 1 as Complete with end date
Archives Cycle 1's contents record
Generates new MAR records for Cycle 2 (next 30 days)
Updates the supply tracker: quantity received, days coverage, expected next delivery date
Notifies coordinator that cycle is active and carers can begin administering


Flow 3 — Carer records daily administration
Done by the carer during each visit. Designed for mobile. Carer is offline-capable — records queue and sync when connection restored.
Entry point: Carer app → Today's visits → Visit for Margaret Hughes → Medications due
Step 1 — Visit medication screen
Carer sees all medications due during this visit, grouped by time slot. The blister pack morning compartment shows as one item with a count: "Blister Pack — Morning — 4 medicines."
Step 2 — Open compartment
Carer taps the compartment. The recording modal opens showing:

Pack name, slot, due time, window status (within window / late)
All medicines in the compartment with name, dose, instructions
Risk notes if any
Witness required indicator if CD present
Big "Mark all given" button (fast path)
Individual medicine status buttons below (exception path)

Step 3a — Fast path (everything given)
Carer taps "Mark all 4 given." System:

Timestamps all 4 medicine records as Given
Marks compartment as G on MAR
Creates 4 individual audit log entries
Decrements tablet count on supply tracker (4 medicines × doses given)
Prompts for time confirmation only
Submit — done in under 10 seconds

Step 3b — Exception path (one or more not given)
Carer changes status on specific medicine(s). For each exception:

Status: Refused / Missed / Unavailable
Reason: mandatory dropdown (contextual per status type)
Notes: optional free text

Compartment submits with:

Mixed status: Given for 3, Refused for 1
MAR cell shows P (Partial) with amber review ring
Manager review automatically triggered
Only the given medicines decrement supply count

Step 4 — Witness capture (controlled drugs only)
If any compartment contains a controlled drug, a witness screen appears before submission:

Witness name (must be a different staff member from the recorder)
Witness confirms: "I witnessed the administration of [medicine] [dose] at [time]"
Witness PIN or signature
If no witness available: reason must be recorded, manager alerted immediately

Step 5 — Confirmation
Screen shows full summary of what was recorded. Carer confirms. Record saved — cannot be changed by carer after this point (only manager correction with audit trail).

Flow 4 — Mid-cycle medicine change
Happens when a GP changes a prescription while a blister pack cycle is in progress.
Trigger: Manager receives notification of prescription change (letter, phone call, system notification from GP system integration)
Step 1 — Select the medicine that changed
Manager opens the active blister pack → Contents Record → Edit
Step 2 — Record what changed
Change typeSystem actionMedicine stoppedRemoved from compartment from effective dateDose changedNew dose recorded from effective dateNew medicine added to packAdded to compartment from effective date — pharmacy must be informedMedicine moved to different compartmentUpdated from effective dateMedicine removed from pack (given separately)Removed from MCA record, separate medicine record created
Step 3 — Set effective date
The change takes effect from a specific date. Before that date, old records show old contents. After that date, records show new contents.
Cycle 3 — Contents Record History
Version 1: 01 Feb – 09 Feb (Paracetamol 500mg × 1 tablet morning)
Version 2: 10 Feb onwards (Paracetamol 500mg × 2 tablets morning — dose increased)
Step 4 — Authorisation
Manager authorises the change with name, PIN, date, and reason. The change reason links back to the GP instruction.
Step 5 — Update future records
System updates all future pending MAR records from the effective date. Past completed records are untouched — they show the original dose as administered. This is the snapshot principle.
Step 6 — Pharmacy notification
System prompts manager to notify pharmacy of the change so the next cycle pack is prepared correctly. A notification log entry is created.

Flow 5 — Manager review and correction
Trigger: Any P (Partial) or R (Refused) or N (Missed) record triggers a review queue item.
Review queue entry shows:

Service user name
Medicine name and compartment
Date and time slot
Status recorded
Reason given
Carer who recorded it
Time recorded vs time due (late flag if applicable)
Pattern alert if this medicine has been refused or missed multiple times

Manager actions on each review:
ActionWhenResultMark reviewedRecord is accurateReview status → Reviewed. No further action.Add review noteNeed to document contextNote added to record permanentlyCorrect recordStatus was wrongNew status recorded, old status preserved in audit, reason for correction mandatoryEscalatePattern or clinical concernFlagged to senior manager, GP notification promptedContact GPClinical decision neededLog that GP was contacted, outcome recordedRequest follow-upNeeds checking next visitReminder set for next carer visit
Correction audit trail — what gets stored:
Original record:   Refused — Sarah Mitchell — 08:20 — "SU refused"
Correction:        Given — Sarah Mitchell (manager) — 14:30 — "Recorded in error, medication was given"
Correction reason: Error at time of recording — carer confirmed by phone
Corrected by:      Sarah Mitchell (Care Manager)
Corrected at:      16 Feb 2026, 14:30
Original preserved: Yes — visible in audit history

Flow 6 — Cycle end and archiving
Trigger: Either the cycle's end date is reached, or the pack physically runs out, or medication is stopped.
Step 1 — Completion summary generated
System calculates:

Total records generated for this cycle
Total given, refused, missed, partial, unavailable
Compliance rate (given ÷ total scheduled)
Medicines with notable exception patterns
Any unresolved manager reviews

Step 2 — Final stock reconciliation
Manager confirms how many tablets/doses remain in the pack (if any). This feeds into the waste/disposal record.
Step 3 — Disposal record
If tablets remain unused at end of cycle, manager records:

Quantity remaining per compartment
Method of disposal (pharmacy returns / waste disposal)
Witnessed disposal (for controlled drugs — mandatory)
Date and time of disposal

Step 4 — Archive
Cycle record moves to archived state. The full contents history, every administration record, every audit log, every delivery log, and every manager review is stored permanently and is accessible from the service user's medication history indefinitely.
Step 5 — Next cycle prompt
If a new cycle is expected, system prompts for the new delivery log (Flow 2). If medication has been stopped, system marks the blister pack as stopped and no further cycles are created.

Screen inventory — complete list
Manager / Coordinator screens (16 screens)
#Screen nameFlow1Choose medication typeF12Pack details and pharmacyF13Define compartments and timingsF14Add medicines to compartmentsF15Safety and administration rulesF16Schedule settingsF17Preview (records + contents)F18MCA contents record (printable)F19Log new deliveryF210Contents verification checklistF211Medicines reconciliation checkF212Manager countersignatureF213Mid-cycle change screenF414Manager review queueF515Individual record review and correctionF516Cycle end summary and archivingF6
Carer screens (6 screens)
#Screen nameFlow1Visit medications dueF32Compartment recording modalF33Individual medicine exceptionF34Witness captureF35Administration confirmationF36Late recording acknowledgementF3

Data points stored per blister pack cycle
Every cycle record permanently stores:

Pack metadata (name, type, pharmacy, GP, dates)
Versioned contents record (every medicine in every compartment, with effective dates for any changes)
Delivery log (every delivery with receipt confirmation, reconciliation result, manager signature)
Administration records (every compartment record for every day, with individual medicine statuses, reasons, carer, timestamp)
Audit log (every change to any field, with before/after values)
Manager reviews (every review action taken)
Controlled drug register entries (witness records per administration)
Disposal records (at cycle end)
Pattern flags (repeated exceptions on same medicine)


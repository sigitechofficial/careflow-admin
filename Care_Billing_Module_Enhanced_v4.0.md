# Care Billing Module — Clean Phase-Based Specification

**Document type:** Product / Functional / Development Specification  
**Module:** Care Billing, Carer Payroll, Service User Invoicing, Funding, Expenses, Payments, Audit  
**Version:** 3.2 — cleaned phase-based, with expanded service-user charge-card and funder invoice-template cases  
**Audience:** Product team, UI/UX team, backend developers, QA team, finance team, care operations team

---

## How to Read This Document

This document is now arranged by **phases**. Each phase has:

- **Purpose** — why the phase exists.
- **Main users** — who will use it.
- **Setup required** — what must be configured.
- **Core flow** — how the feature works.
- **Cases to handle** — normal and exception cases.
- **System outputs** — what records the system should create.
- **Important rules** — rules developers must not miss.
- **QA checks** — tests QA should run.

The key principle is:

```text
One completed and approved visit
  -> creates carer pay output
  -> creates service user/funder invoice output
  -> creates exceptions if anything is missing or unusual
```

---

# Phase 0 — Core Billing Concept

## Purpose

This phase defines the basic meaning of the billing module.

The billing module converts **completed and approved care work** into:

1. **Carer pay** — how much the care provider pays the carer.
2. **Service user/funder invoice** — how much the provider charges the service user, family, local authority, NHS, or other funder.

These two calculations must always remain separate.

## Simple Example

A carer completes one visit from **9:00 PM to 11:00 PM**.

| Output | Example Amount | Meaning |
|---|---:|---|
| Carer pay | £28 | Amount paid to the carer |
| Invoice charge | £60 | Amount charged to the service user/funder |
| Margin before costs | £32 | Difference before travel, admin, tax, etc. |

## Core Rule

Do **not** finalise billing directly from the rota.

Use this flow:

```text
Rota / planned visit
  -> visit completed by carer
  -> visit checked/reconciled by office
  -> carer pay calculated
  -> invoice charge calculated
  -> payroll run and invoice run approved
```

The rota is only the plan.  
The completed and approved visit is the finance source.

## Key Terms

| Term | Meaning |
|---|---|
| Carer | Person who provides care |
| Service user | Person receiving care |
| Funder / payer | Person or organisation paying for care |
| Visit | Scheduled care appointment |
| Actual visit | Real check-in/check-out and task data |
| Reconciled visit | Office-approved payable and billable visit data |
| Pay rate card | Rules for paying carers |
| Invoice rate card | Rules for charging service users/funders |
| Funding contract | Rules for who pays and how much |
| Payroll run | Batch that pays carers |
| Invoice run | Batch that bills service users/funders |
| Exception | Problem that needs review before finance is finalised |

## Outputs of Phase 0

At the end of this phase, everyone should understand:

```text
Carer side:
Carer -> Pay Rate Card -> Completed Visit -> Pay Calculation -> Payroll

Service user side:
Service User -> Funding Contract -> Invoice Rate Card -> Completed Visit -> Invoice Calculation -> Invoice
```

---

# Phase 1 — Master Data Setup

## Purpose

This phase creates the foundation records needed before visits can be billed.

## Main Users

- Admin
- Care coordinator
- Finance admin
- Branch manager

## Setup Required

Create and maintain:

```text
Carers
Service users
Funders / payers
Branches / regions
Service types
Visit types
Public holiday calendars
Skills / competencies
Billing contacts
Legal representatives / appointees / Power of Attorney contacts
```

## Carer Setup

Each carer profile should include:

```text
Name
Branch
Role
Employment type
Worker type: internal / agency / contractor
Default pay rate card
Travel/mileage settings
Skills and competencies
Contracted hours
Holiday scheme
Active/inactive status
```

## Service User Setup

Each service user profile should include:

```text
Name
Address
Branch
Care package
Funding type
Funders / payers
Invoice rate card
Billing contact
Care plan
Required skills
Risk level
Active/inactive/hospitalised/deceased status
```

## Funder / Payer Setup

Funders can include:

```text
Local authority
NHS / ICB
Private service user
Family payer
Appointee
Deputy
Power of Attorney contact
Direct payment holder
Charity / other organisation
```

## Cases to Handle

```text
Service user has one funder
Service user has multiple funders
Service user has family top-up
Service user has direct payment / personal budget
Service user lacks capacity and invoice goes to appointee
Billing contact changes mid-package
Service user moves branch
Service user becomes hospitalised
Service user becomes inactive or deceased
Carer works across branches
Carer changes role
Carer becomes inactive
Carer is agency staff rather than employee
```

## Important Rules

```text
Do not allow invoice generation without an active service user/funder setup.
Do not allow payroll finalisation without a valid carer setup.
Care delivery can continue, but finance should create exceptions if setup is missing.
```

## QA Checks

```text
Create service user with single funder
Create service user with multiple funders
Create carer without pay rate card and confirm finance exception
Create service user without invoice rate card and confirm invoice exception
Change billing contact mid-period
Mark service user hospitalised and check rota warnings
```

---

# Phase 2 — Rate Cards and Charging Rules

## Purpose

This phase defines the rules that calculate pay and invoice amounts.

There must be two separate rate card areas:

```text
Carer Pay Rate Cards
Invoice / Charge Rate Cards
```

## 2.1 Carer Pay Rate Card

A carer pay rate card decides how much the provider pays the carer.

Usually assigned by:

```text
Carer
Role
Branch
Employment type
Skill level
Contract type
Internal/agency worker type
```

Example:

| Rule | Rate |
|---|---:|
| Weekday morning | £12/hour |
| Weekday evening | £13/hour |
| Night | £15/hour |
| Weekend | £14/hour |
| Bank holiday | 2x |
| Mileage | Configurable |
| Travel time | Paid/unpaid by rule |

## Important Carer Rate Rule

Do **not** create a separate carer pay rate card for every service user by default.

Correct model:

```text
Carer Pay Rate Card = linked to carer / role / employment type
Invoice Rate Card = linked to service user / funder / contract
```

If a specific service user needs higher carer pay, use a **premium or override**.

Example:

| Item | Amount |
|---|---:|
| Base pay | £12/hour |
| Complex care premium | £3/hour |
| Final pay | £15/hour |

## 2.2 Invoice / Charge Rate Card

An invoice rate card decides how much to charge the service user or funder.

Usually assigned by:

```text
Service user
Funder
Care package
Contract
Local authority agreement
NHS / ICB agreement
Private payer agreement
```

Example:

| Rule | Rate |
|---|---:|
| Personal care weekday | £25/hour |
| Personal care weekend | £30/hour |
| Waking night | £180 fixed |
| Sleeping night | £90 fixed |
| Bank holiday | 2x |


## 2.2A Service User Charge Card — Complete Case Coverage

A **service user charge card** is the commercial rule set that tells the system how much to charge for a completed or chargeable visit.

In the product UI, this can also be called:

```text
Invoice Rate Card
Charge Rate Card
Client Contract Rate Card
Funder Rate Card
Service User Contract Rate Card
```

### Main Rule

```text
Carer Pay Rate Card = what the provider pays the carer
Service User Charge Card = what the provider charges the service user/funder
```

Do not mix these two cards.

---

### A. Where a Service User Charge Card Can Be Attached

The system should support charge cards at different levels.

| Attachment Level | When to Use | Example |
|---|---|---|
| Service user level | Private/self-funded client has their own rates | John private rate card |
| Funder level | Same funder rates apply to many service users | London Council 2026 rates |
| Funding contract level | One service user has multiple funders/contracts | LA contract + family top-up |
| Care package level | Package has specific approved hours/rates | Reablement package |
| Service type level | Different services charge different rates | Personal care vs complex care |
| Branch/region level | Different branches use different charge rates | London branch vs Manchester branch |
| Group/household level | Same home or supported living setting | Husband/wife shared household |
| Organisation default | Fallback only if explicitly configured | Default private rate card |

Recommended assignment priority:

```text
1. Visit-specific approved charge override
2. Funding-contract charge card
3. Service-user-specific charge card
4. Funder-specific charge card
5. Care-package charge card
6. Branch/region charge card
7. Organisation default charge card
8. If no card is found -> exception, no silent billing
```

---

### B. Basic Charge Card Fields

Each charge card should contain:

```text
Charge card name
Charge card code/reference
Service user / funder / contract assignment
Currency
Billing frequency: weekly / 4-weekly / monthly / custom
Invoice grouping rule
Payment terms
Tax/VAT treatment
Effective from date
Effective to date
Status: draft / active / expired / archived
Approval status
Created by / approved by
Notes
```

Recommended statuses:

```text
DRAFT
PENDING_APPROVAL
ACTIVE
SCHEDULED
EXPIRED
ARCHIVED
SUSPENDED
REPLACED
```

---

### C. Core Charge Methods

The charge card should support these methods.

| Charge Method | Meaning | Example |
|---|---|---|
| Hourly pro-rata | Charge by exact approved time | 30 min at £24/hr = £12 |
| Fixed visit charge | Same charge per visit | 15-min med call = £10 |
| Banded duration | Charge by duration range | 16-30 min = £18 |
| Per-visit fee | Flat fee added to visit | £5 call-out fee |
| Daily rate | One charge per day | Live-in care day rate |
| Weekly package | Fixed weekly charge | £450 per week package |
| Monthly package | Fixed monthly charge | £1,800 per month |
| Session rate | Fixed session charge | Day support session |
| Sleep-in rate | Fixed sleep-in allowance/charge | £90 per night |
| Waking night rate | Usually hourly or fixed | £180 fixed night |
| Double-up rate | Charge for two carers | 2 x hourly or special rate |
| Group/shared rate | Split charge across service users | Shared supported living visit |
| Mileage recharge | Charge mileage to client/funder | 45p/mile |
| Expense recharge | Recharge approved expenses | Medicine/grocery purchase |
| Retainer fee | Charge during absence/notice | 50% package retainer |
| Non-chargeable | Visit is payable but not billable | Assessment/reablement visit |

---

### D. 15-Minute, 30-Minute, and Hourly Charge Cases

The charge card must clearly define how short visits are charged.

#### Case 1 — 15-Minute Pro-Rata

```text
Rate = £24/hour
Approved billable duration = 15 minutes
Charge = 0.25 x £24 = £6
```

#### Case 2 — 15-Minute Fixed Charge

```text
15-minute visit fixed charge = £10
Approved billable duration = 15 minutes
Charge = £10
```

#### Case 3 — 30-Minute Pro-Rata

```text
Rate = £24/hour
Approved billable duration = 30 minutes
Charge = 0.5 x £24 = £12
```

#### Case 4 — 30-Minute Fixed Charge

```text
30-minute visit fixed charge = £18
Charge = £18
```

#### Case 5 — Minimum 30-Minute Charge

```text
Actual visit = 15 minutes
Minimum charge = 30 minutes
Chargeable duration = 30 minutes
```

#### Case 6 — Hourly With Extra Time

```text
Planned visit = 60 minutes
Actual approved visit = 75 minutes
Rule = charge actual approved time
Chargeable duration = 75 minutes
```

#### Case 7 — Hourly With Planned-Time Cap

```text
Planned visit = 60 minutes
Actual visit = 75 minutes
Rule = charge planned time unless extra time is approved
Chargeable duration = 60 minutes until manager approves extra 15 minutes
```

---

### E. Service-Type Charge Cases

The charge card should allow different rates by service type.

```text
Personal care
Companionship
Medication support
Meal preparation
Domestic support
Shopping visit
Complex care
Nursing/clinical support
Supported living
Live-in care
Sleep-in night
Waking night
Reablement
Assessment visit
Care plan review
Emergency response
```

Example:

| Service Type | Charge |
|---|---:|
| Personal care | £25/hour |
| Complex care | £38/hour |
| Companionship | £22/hour |
| Medication call | £10 fixed |
| Waking night | £180 fixed |
| Assessment visit | Non-chargeable |

Important rule:

```text
If a visit service type has no matching charge rule, create RATE_MISSING exception.
Do not silently apply a random default rate.
```

---

### F. Time-Band and Day-Type Charge Cases

The charge card should support time and day rules.

| Case | Example Rule |
|---|---|
| Morning rate | 06:00-12:00 |
| Afternoon rate | 12:00-18:00 |
| Evening rate | 18:00-22:00 |
| Night rate | 22:00-07:00 |
| Weekday rate | Monday-Friday |
| Saturday rate | Separate Saturday charge |
| Sunday rate | Separate Sunday charge |
| Public holiday rate | 1.5x or 2x |
| Christmas/New Year rate | Special holiday charge |
| Unsocial hours | Premium after 10 PM |
| Out-of-area visit | Extra charge or different card |

If a visit crosses two charge bands, the system should either:

```text
Split the charge by time band
or
Use the visit start-time rule
or
Use the highest-rate rule
or
Require manager approval
```

Recommended default:

```text
Hourly charges = split by time band
Fixed/banded charges = use configured start-time rule
```

---

### G. Funding and Multi-Payer Charge Card Cases

The same service user can have one or many payers.

Supported payer cases:

```text
Single private payer
Single local authority funder
NHS / ICB funder
Direct payment client
Personal budget holder
Family top-up payer
Appointee / deputy / Power of Attorney payer
Multiple funders on one package
Different funder by service type
Different funder by weekday/weekend
Different funder by authorised hours
```

Split examples:

#### Percentage Split

```text
Local Authority = 70%
Family = 30%
Visit charge = £100
LA invoice line = £70
Family invoice line = £30
```

#### Fixed Weekly Contribution

```text
Family contribution = £40/week
Remaining weekly amount = Local Authority
```

#### Service-Type Split

```text
Personal care -> Local Authority
Complex care -> NHS
Extra companionship -> Private family top-up
```

#### Cap-Based Split

```text
Local Authority pays up to £250/week
Family pays remaining amount
```

Important rule:

```text
Funding split affects invoice lines only.
It should not change normal carer pay calculation.
```

---

### H. Authorisation, PO, Budget, and Package Limit Cases

Charge card calculation should check the service-user contract limits.

Possible cases:

```text
Purchase order missing
Purchase order expired
Purchase order has remaining value
Purchase order value exceeded
Funder approved 10 hours/week only
Actual visits exceed authorised weekly hours
Monthly budget exceeded
Package ended mid-week
Package starts mid-week
Service user moved to a new package
Visit is outside approved service period
Visit is outside approved service type
```

Recommended handling:

| Case | System Result |
|---|---|
| PO missing | Invoice exception |
| Budget exceeded | Requires approval or top-up payer |
| Authorised hours exceeded | Exception or private top-up |
| Package expired | Do not invoice until fixed |
| Contract starts mid-week | Invoice only eligible visits |

---

### I. Chargeable vs Non-Chargeable Visit Cases

Not every visit should create a client/funder charge.

Non-chargeable examples:

```text
Introductory visit
Assessment visit
Care plan review
Quality assurance visit
Complaint follow-up visit
Reablement/free-period visit
Training/shadowing visit not charged to client
Medication correction visit due provider error
Missed visit caused by provider
Manager goodwill waiver
```

The charge card should support:

```text
Chargeable = yes/no
Chargeable reason
Waiver reason
Approved by
Audit log
```

---

### J. Cancellation, No-Access, Absence, and Retainer Charge Cases

Service user charge cards must define what happens when care is not delivered normally.

| Case | Possible Charge Rule |
|---|---|
| Cancelled with enough notice | No charge |
| Cancelled late | 50% or 100% charge |
| Carer arrived, no access | Minimum visit or full charge |
| Service user refused care | Charge attended time or minimum charge |
| Service user hospitalised | No charge or retainer |
| Service user holiday | No charge or package retainer |
| Package suspended | No charge during suspension |
| Notice period after cancellation | Retainer/full charge until notice ends |
| Provider missed visit | No charge |
| Replacement visit provided later | Charge replacement only or adjust original |

Important rule:

```text
Cancellation/no-access rules should be contract-specific, not hard-coded globally.
```

---

### K. Shared, Double-Up, and Multi-Carer Charge Cases

Charge cards should handle visits where more than one person or more than one service user is involved.

```text
Two carers for one service user
One carer for two service users in same house
Two service users sharing one visit
Supported living group visit
Group activity session
Shadow carer present but non-chargeable
Nurse/senior carer has specialist charge rate
Only one of two planned carers attended
Second carer arrived late
```

Possible charging methods:

```text
Charge per attending carer
Charge special double-up rate
Charge one fixed shared visit fee
Split cost between service users equally
Split cost by percentage
Charge only one service user/funder
Do not charge shadow/training carer
```

---

### L. Travel, Mileage, Expenses, and Extra Item Recharge Cases

The charge card should define what can be recharged to the client/funder.

```text
Mileage chargeable or not chargeable
Travel time chargeable or not chargeable
Parking chargeable or not chargeable
Toll chargeable or not chargeable
Public transport chargeable or not chargeable
Waiting time chargeable or not chargeable
Medicine expense recharge
Grocery expense recharge
Personal-care item recharge
Emergency item recharge
Admin fee on expenses allowed/not allowed
```

Important rule:

```text
Carer reimbursement and service-user recharge are separate decisions.
An expense can be reimbursed to the carer but not charged to the client.
```

---

### M. Charge Card Missing or Invalid Cases

When the system cannot find a valid charge card, it should not silently invoice.

Cases:

```text
No charge card attached
Charge card attached but expired
Charge card starts after visit date
Charge card archived
Charge card suspended
Charge card not approved
No rate for service type
No rate for day type
No rate for time band
Two active charge cards overlap
Funder missing
Funding contract missing
Currency missing
VAT/tax setting missing
Invoice recipient missing
```

Expected result:

```text
Visit can remain completed.
Invoice line should not be finalised.
Invoice exception should be created.
Admin fixes the setup.
System recalculates/reprices the invoice line.
```

Recommended exception codes:

```text
CHARGE_CARD_MISSING
CHARGE_CARD_EXPIRED
CHARGE_CARD_NOT_ACTIVE
CHARGE_RATE_MISSING
CHARGE_RATE_CONFLICT
FUNDER_MISSING
FUNDING_CONTRACT_MISSING
PO_MISSING
BUDGET_EXCEEDED
INVOICE_RECIPIENT_MISSING
TAX_SETTING_MISSING
```

---

### N. Manual Override and Approval Cases

Finance/admin users sometimes need to override a charge.

Possible cases:

```text
Goodwill discount
Family dispute adjustment
Manager-approved extra time
Manual fixed charge
Manual waiver
Correct wrong service type
Correct wrong funder
Apply special contract rate
Apply backdated council uplift
```

Required controls:

```text
Override reason required
Approval required above threshold
Old value and new value stored
User and timestamp stored
Recalculation log stored
Locked invoice cannot be silently changed
```

---

### O. Rate Versioning, Annual Uplift, and Backdated Change Cases

Charge cards must be versioned.

Possible cases:

```text
Annual private rate increase
Council uplift from 1 April
NHS rate uplift
Temporary promotional discount
Rate change from next week
Backdated rate increase
Backdated rate correction
Rate change after draft invoice
Rate change after invoice sent
Rate change after invoice paid
```

Recommended handling:

```text
Draft invoice = can be recalculated with approval
Sent invoice = use credit note/debit note/rebill
Paid invoice = use adjustment/credit/debit note
Locked historical invoice = never silently edit
```

---

### P. Invoice Grouping and Recipient Cases

Charge card or funding contract should define how invoice lines are grouped.

```text
One invoice per service user
One invoice per funder
One invoice per billing contact
One consolidated invoice for council
Separate top-up invoice for family
Weekly invoice
4-weekly invoice
Monthly invoice
Invoice by purchase order
Invoice by package
Invoice by branch/region
Invoice to appointee/deputy/POA instead of service user
```

Required recipient checks:

```text
Bill-to name
Bill-to address/email
Legal authority/contact type
Consent/permission status
Delivery method
Payment terms
```

---

### P1. Funder-Specific Invoice Template Cases

Some funders require their own invoice format. The system must separate **billing calculation** from **invoice presentation/export**.

Core rule:

```text
Charge calculation = common engine
Invoice output/template = funder-specific engine
```

This means the system first creates standard invoice data, then renders or exports it using the selected funder template.

#### Simple Flow

```text
Visit completed
  -> charge calculated
  -> invoice lines created
  -> funder identified
  -> funder invoice profile checked
  -> correct invoice template selected
  -> required fields validated
  -> PDF / Excel / CSV / API output generated
  -> invoice sent / uploaded / exported
```

#### Funder Invoice Profile

Each funder should have an invoice profile that controls how invoices are generated.

Example:

```text
Funder: London Council
Invoice template: London Council Excel Template v2
Format: XLSX
Invoice frequency: Weekly
Grouping: One invoice per service user
Delivery method: Council portal upload
Required fields:
  - service user name
  - service user reference
  - date of birth
  - NHS number, if required
  - care package reference
  - purchase order number
  - visit date
  - start time
  - end time
  - duration / units
  - rate
  - total amount
```

#### Template Types to Support

```text
PDF template
Excel XLSX template
CSV template
XML template
JSON/API template
Council portal upload template
Accounting-system export template
Custom funder report template
```

Examples:

| Funder | Template Type | Output |
|---|---|---|
| Local Authority A | Excel | XLSX file |
| Local Authority B | CSV | CSV portal upload |
| NHS / ICB | CSV or XML | Portal / secure upload |
| Private family | PDF | Email / download |
| Accounting system | API | JSON/API sync |

#### Field Mapping Cases

Different funders can use different column names for the same system data.

Example mappings:

| Template Field | System Field |
|---|---|
| Client Name | service_user.full_name |
| SU Ref | service_user.funder_reference |
| Care Package Ref | funding_contract.package_reference |
| PO Number | funding_contract.purchase_order_number |
| Units | invoice_line.billable_units |
| Unit Price | invoice_line.rate_amount |
| Net Amount | invoice_line.net_amount |
| VAT | invoice_line.vat_amount |
| Gross Amount | invoice_line.gross_amount |

Cases to handle:

```text
Funder uses different field names
Funder requires fields in a specific order
Funder requires fixed header rows
Funder requires no logo / with logo
Funder requires one line per visit
Funder requires one summary line per week
Funder requires decimal hours
Funder requires minutes as units
Funder requires units rounded to 2 decimals
Funder requires start/end time
Funder does not allow carer name on invoice
Funder requires service code instead of service type name
Funder requires contract code / cost centre
Funder requires PO number on every line
Funder requires invoice file naming convention
```

#### Template Selection Rules

The system should select the template using priority rules.

Recommended priority:

```text
1. Manual invoice-run template override, if approved
2. Funder invoice profile template
3. Funding contract template
4. Branch/region default template
5. Global default invoice template
6. If no template found -> TEMPLATE_MISSING exception
```

Important:

```text
Template selection should be based on the invoice date / billing period.
Do not use the latest template for older locked invoices unless explicitly re-rendered.
```

#### Invoice Grouping by Template

Some funders want one invoice per service user, while others want one consolidated file.

Cases:

```text
One invoice per service user
One invoice per funder
One consolidated invoice for all service users under one funder
One invoice per purchase order
One invoice per care package
One invoice per branch
One invoice per billing contact
Separate private top-up invoice
Separate invoice for expenses/recharges
Separate invoice for non-care charges
Weekly invoice file
4-weekly invoice file
Monthly invoice file
```

#### Validation Before Rendering

Before generating the PDF/Excel/CSV/API output, the system must validate required fields.

Validation checks:

```text
Active funder invoice profile exists
Active template exists
Required service user reference exists
Required DOB exists
Required NHS number exists, if enabled
Required purchase order number exists
Care package reference exists
Billing contact exists
Bill-to email/address exists
Invoice lines are approved
Rates are calculated
Funding split is calculated
Tax/VAT fields are available if required
Template field mappings are complete
No unsupported characters in export fields
File naming convention can be generated
```

If validation fails:

```text
Invoice status: TEMPLATE_VALIDATION_FAILED
Export status: NOT_RENDERED
Reason: Missing PO number / missing service user ref / missing template field mapping
```

#### Template Versioning Cases

Funders can change invoice templates over time.

Cases:

```text
Funder changes template from v1 to v2
Template has effective-from date
Template has effective-to date
Old invoices must preserve old template output
Draft invoices can use latest active template
Locked/sent invoices should not silently change format
Invoice re-render requested with new template
Backdated billing period uses older template
Template is disabled by mistake
Two template versions overlap
```

Recommended handling:

```text
Use invoice template versions.
Store template_id and template_version_id on every invoice export.
Store rendered file snapshot/path for audit.
```

#### Manual Template Override Cases

Finance/admin may need to override the selected template.

Cases:

```text
Funder requested special revised format
Council portal temporarily rejects standard template
Historical invoice needs old template
Private family requests detailed PDF instead of summary PDF
Internal finance requests Excel export for audit
```

Required controls:

```text
Override reason required
Manager approval required for locked/sent invoices
Audit trail required
Original template and override template both stored
```

#### Delivery Method Cases

Each funder may receive invoices differently.

```text
Email PDF invoice
Download PDF from portal
Council portal upload
Secure email attachment
SFTP upload
API submission
Manual print/post
Accounting-system sync
```

Each delivery should create an export/delivery log:

```text
Generated
Downloaded
Emailed
Uploaded
API submitted
Accepted by funder
Rejected by funder
Failed delivery
Requires correction
```

#### Funder Rejection Cases

A funder may reject the invoice because the format or data is wrong.

Cases:

```text
CSV column missing
Invalid date format
Invalid service user reference
PO number expired
Care package reference incorrect
Duration format not accepted
Invoice duplicate detected
Portal upload failed
File name incorrect
Line amount mismatch
```

Handling:

```text
Mark export as REJECTED_BY_FUNDER.
Keep original export file.
Create correction task.
Allow corrected re-export with new export version.
Do not silently modify original locked invoice.
Use credit note/rebill if financial values change.
```

#### Recommended Data Entities

```text
funders
funder_invoice_profiles
invoice_templates
invoice_template_versions
invoice_template_fields
invoice_template_mappings
invoice_template_validation_rules
invoice_template_grouping_rules
invoice_exports
invoice_export_files
invoice_export_delivery_logs
invoice_export_rejections
invoice_template_overrides
```

##### funder_invoice_profiles

```text
id
funder_id
invoice_template_id
default_template_version_id
invoice_frequency
invoice_grouping_rule
delivery_method
requires_po_number
requires_service_user_reference
requires_nhs_number
requires_dob
requires_visit_times
requires_carer_name
requires_service_code
requires_tax_breakdown
file_naming_rule
is_active
effective_from
effective_to
```

##### invoice_templates

```text
id
template_name
template_type: PDF / XLSX / CSV / XML / JSON / API
funder_id nullable
branch_id nullable
is_default
is_active
created_at
```

##### invoice_template_versions

```text
id
invoice_template_id
version_number
file_template_path
schema_definition
header_config
footer_config
effective_from
effective_to
is_active
```

##### invoice_template_fields

```text
id
invoice_template_version_id
field_label
system_field_key
required
format_rule
default_value
display_order
column_letter_or_index
max_length
```

##### invoice_exports

```text
id
invoice_run_id
invoice_id nullable
funder_id
template_id
template_version_id
file_type
file_path
export_status
rendered_at
sent_at
accepted_at
rejected_at
external_reference
created_by
```

#### Recommended Statuses

```text
TEMPLATE_MISSING
TEMPLATE_MAPPING_INCOMPLETE
TEMPLATE_VALIDATION_FAILED
READY_TO_RENDER
RENDERED
EXPORTED
SENT
UPLOAD_FAILED
ACCEPTED_BY_FUNDER
REJECTED_BY_FUNDER
REQUIRES_CORRECTION
RE_EXPORTED
```

#### QA Cases

```text
Create funder with PDF template and generate invoice
Create funder with XLSX template and generate export
Create funder with CSV template and generate export
Generate invoices for service user with two funders and two different templates
Validate missing PO number blocks export
Validate missing service user reference blocks export
Validate missing billing contact blocks export
Validate manual template override requires reason
Validate old invoices keep old template version
Validate new invoices use new template version after effective date
Validate consolidated invoice file groups all service users for same funder
Validate private family PDF remains separate from council Excel invoice
Validate rejected export can be corrected and re-exported
Validate original rejected export is retained for audit
Validate API export creates external reference
Validate failed upload can be retried without duplicate invoice creation
```

#### Final Rule

```text
The invoice calculation engine must create clean standard invoice lines.
The template engine must only format, group, validate, render, and export those lines.
Never put financial calculation logic inside template rendering.
```

---

### Q. Tax/VAT and Accounting Code Cases

The charge card should allow tax and accounting classification.

Possible cases:

```text
Care service VAT-exempt
Non-care service taxable
Expense recharge taxable/non-taxable
Mileage taxable/non-taxable depending policy
Different tax treatment for staff agency billing
Different accounting code by service type
Different cost centre by branch
Different nominal code by funder
```

Fields to support:

```text
tax_treatment
vat_rate
nominal_code
cost_centre
department_code
external_accounting_code
```

---

### R. Service User Charge Card Audit Requirements

Every charge card change should be auditable.

Track:

```text
Who created the card
Who approved it
Who changed it
What changed
Old value
New value
Reason
Effective date
Affected visits/invoices
Whether recalculation was run
```

Important rule:

```text
Financial rates are controlled data.
Do not allow unrestricted edits without permission and audit trail.
```

---

### S. Recommended Service User Charge Card Database Entities

```text
service_user_charge_cards
service_user_charge_card_versions
service_user_charge_rules
service_user_charge_assignments
charge_card_approval_logs
charge_card_override_logs
charge_card_exception_logs
charge_card_uplift_batches
charge_card_recalculation_jobs
```

Minimum fields for `service_user_charge_rules`:

```text
id
charge_card_version_id
service_type_id
day_type
start_time
end_time
rate_type
amount
multiplier
minimum_charge_minutes
rounding_rule
split_policy
chargeable_flag
tax_treatment
nominal_code
priority
effective_from
effective_to
```

---

### T. Service User Charge Card QA Cases

QA should test:

```text
Private service user with one charge card
Local authority service user with funder charge card
Service user with multiple funders
Family top-up invoice created separately
15-minute fixed charge
15-minute pro-rata charge
30-minute fixed charge
Hourly charge
Minimum 30-minute charge for 15-minute visit
Visit crosses evening/night charge bands
Weekend charge
Bank holiday charge
No charge card attached
Expired charge card
Overlapping active charge cards
No rate for service type
PO missing
Budget exceeded
Authorised hours exceeded
Non-chargeable assessment visit
Late cancellation charge
No-access charge
Hospital absence retainer
Shared household split charge
Double-up charge
Shadow carer non-chargeable
Mileage chargeable
Mileage not chargeable
Expense reimbursed but not recharged
Expense recharged to family
Manual override with approval
Backdated rate uplift on draft invoice
Rate change after invoice sent creates credit/debit note
Invoice recipient is appointee/POA
Tax setting missing exception
Accounting code export check
```

## 2.3 Rate Types to Support

| Rate Type | Meaning | Example |
|---|---|---|
| Hourly / single | Rate per hour | £25/hour |
| Fixed | Same amount regardless of duration | £180 waking night |
| Banded | Different rate by duration band | 0–30 min = £15 |
| Service type | Rate by care type | Personal care vs complex care |
| Time band | Rate by time of day | Morning/evening/night |
| Day type | Weekday/weekend/public holiday | Weekend uplift |
| Unsocial hours | Late/night premium | 10 PM to 7 AM |
| Mileage | Rate per mile | 45p/mile |
| Travel time | Rate for travel time | £11/hour |
| Waiting time | Rate for waiting | Waiting at door/access issue |
| Per-visit fee | Flat visit fee | £5 per visit |
| Subscription | Regular package fee | Weekly fixed fee |
| Uplift / multiplier | Percentage/multiplier | Bank holiday 2x |
| Premium | Extra amount added | Complex care +£3/hour |
| Deduction | Amount removed | Approved deduction |

## 2.4 15-Minute, 30-Minute, and Hourly Visits

The system should support short visits and hourly visits clearly.

### Option A — Pro-rata Hourly Calculation

```text
15-minute visit = 0.25 hour
30-minute visit = 0.5 hour
45-minute visit = 0.75 hour
60-minute visit = 1 hour
```

Example:

```text
Hourly rate = £24/hour
15 minutes = 0.25 x £24 = £6
30 minutes = 0.5 x £24 = £12
```

### Option B — Fixed Short-Visit Charges

Example:

| Duration | Fixed Charge |
|---|---:|
| 15 minutes | £10 |
| 30 minutes | £18 |
| 45 minutes | £24 |
| 60 minutes | £30 |

### Option C — Banded Duration Charges

Example:

| Actual Duration | Charge |
|---|---:|
| 0–15 minutes | £10 |
| 16–30 minutes | £18 |
| 31–45 minutes | £24 |
| 46–60 minutes | £30 |

## 2.5 Minimum Charge / Minimum Pay Rule

Example:

```text
Minimum charge = 30 minutes
Actual visit = 15 minutes
Chargeable duration = 30 minutes
```

This can be different for payroll and invoice.

```text
Carer minimum pay = 15 minutes
Client minimum charge = 30 minutes
```

## 2.6 Rounding Rule

The system should support configurable rounding.

```text
No rounding
Round to nearest 5 minutes
Round to nearest 15 minutes
Round up to next 15 minutes
Round down to planned duration
Manager approval required for overrun
```

## 2.7 Rate Matching Priority

When calculating a visit, use a clear priority order.

Recommended priority:

```text
1. Visit-specific approved override
2. Service-user-specific premium
3. Service type rate
4. Time-band rate
5. Day-type / public holiday rate
6. Branch / region rate
7. Default active rate card
```

## 2.8 Effective Dates and Rate Versions

Never overwrite old rates.

Use:

```text
rate_card_version
effective_from
effective_to
created_by
approved_by
```

Cases to handle:

```text
Rate card starts next month
Rate card expires
Two active rate cards overlap
Backdated rate change
Annual rate uplift
Council rate uplift
Private client rate increase
Rate change after payroll is locked
Rate change after invoice is sent
```

## Important Rules

```text
Missing rate card should create exception, not silent default calculation.
Old visits should keep original calculated rates unless approved recalculation is performed.
Hourly visits crossing different rate bands should usually be split.
Fixed or banded rates can use start-time rule if configured.
```

## QA Checks

```text
15-minute pro-rata calculation
30-minute fixed calculation
Banded duration calculation
Minimum charge greater than actual duration
Visit crosses evening/night rate
Rate card expired before visit date
Two rate cards active at same time
Backdated rate change after payroll lock
```

---

# Phase 3 — Rota and Visit Completion

## Purpose

This phase handles scheduled visits, carer attendance, check-in/check-out, visit notes, tasks, and basic visit completion.

## Core Flow

```text
Visit scheduled
  -> carer assigned
  -> carer on the way
  -> carer checks in
  -> care tasks completed
  -> notes / medication / observations added
  -> carer checks out
  -> visit completed
  -> office review / reconciliation
```

## Visit Statuses

```text
SCHEDULED
ASSIGNED
UNALLOCATED
ON_THE_WAY
CHECKED_IN
IN_PROGRESS
COMPLETED
COMPLETED_WITH_EXCEPTION
CANCELLED
NO_ACCESS
MISSED
REQUIRES_REVIEW
APPROVED
LOCKED
```

## Normal Visit Case

```text
Planned: 09:00–09:30
Actual check-in: 09:00
Actual check-out: 09:30
Tasks completed: yes
Status: completed
```

System result:

```text
Care record created
Payroll can calculate
Invoice can calculate
No exception
```

## Expected Visit Cases

### Time Cases

```text
Carer arrives late
Carer arrives early
Carer stays longer than planned
Carer leaves early
Visit crosses midnight
Visit crosses rate bands
Visit crosses daylight saving / clock change
Mobile device time is wrong
Offline sync time differs from server time
```

### Attendance Cases

```text
No check-in
No check-out
Manual check-in
Manual check-out
GPS mismatch
Carer checked in outside geofence
Carer checked into wrong visit
Carer started wrong service user visit
Service user confirms attendance
Family confirms attendance
Office manually confirms attendance
```

### Access Cases

```text
Service user not at home
Door not opened
Key safe problem
Family unavailable
Wrong address
Service user refuses care
Visit cancelled at door
No access visit
```

### Visit Completion Cases

```text
All tasks completed
Some tasks incomplete
Medication refused
Medication not available
Meal prep not completed
Care task no longer needed
Service user unwell
Emergency during visit
Carer injury during visit
Safeguarding concern
```

### Assignment Cases

```text
Original carer replaced
Replacement carer completed visit
Unallocated visit close to start time
Visit remains unallocated
Two carers assigned for double-up
Only one carer attends double-up
Shadow carer attends
Trainee attends
Specialist worker attends
```

## Offline Visit Cases

The carer app should allow offline work:

```text
Offline check-in
Offline task completion
Offline notes
Offline check-out
Sync when internet returns
```

Store both:

```text
device_timestamp
server_sync_timestamp
```

## Important Rules

```text
Care delivery should not be blocked just because finance setup is missing.
Finance records should not auto-finalise if visit data is incomplete or suspicious.
Every manual correction must create audit trail.
Payroll should pay the actual attending carer, not only the planned carer.
```

## QA Checks

```text
Complete normal visit
Complete visit with missing check-out
Complete offline visit and sync later
Check GPS mismatch exception
Replace carer before visit starts
Replace carer after original carer no-show
Create unallocated visit and trigger alert
Complete wrong visit and correct it with audit trail
```

---

# Phase 4 — Visit Reconciliation and Exceptions

## Purpose

This phase lets office/admin users review visits before payroll and invoice calculation.

A visit may be completed, but still not ready for finance.

## Core Flow

```text
Completed visit
  -> system checks time, status, GPS, tasks, rates, funding
  -> exceptions are created if needed
  -> office reviews visit
  -> office approves payable time and billable time
  -> visit becomes finance-ready
```

## Time Types

| Time Type | Meaning |
|---|---|
| Planned time | Time from rota |
| Actual time | Carer check-in/check-out |
| Approved payable time | Time used for carer pay |
| Approved billable time | Time used for invoice |
| Travel time | Time between visits |
| Waiting time | Time waiting due access/funder/service user issue |

## Reconciliation Fields

```text
planned_start
planned_end
actual_check_in
actual_check_out
approved_pay_start
approved_pay_end
approved_bill_start
approved_bill_end
payable_duration
billable_duration
exception_reason
approved_by
approval_notes
```

## Common Exceptions

```text
Missing check-in
Missing check-out
Late arrival
Early finish
Overrun
No access
Cancelled at door
Missed visit
Wrong visit started
GPS mismatch
Offline sync conflict
Duplicate visit
Overlapping visit
Tasks incomplete
Medication issue
Rate card missing
Funding contract missing
Invoice rate missing
Carer pay rate missing
Expense pending approval
Visit changed after payroll draft
Visit changed after invoice draft
```

## Missing Rate Card Handling

If carer pay rate is missing:

```text
Visit status = completed
Pay status = RATE_MISSING
Pay amount = not calculated
Payroll exception = carer pay rate missing
```

If service user/funder invoice rate is missing:

```text
Visit status = completed
Invoice status = RATE_MISSING
Invoice amount = not calculated
Invoice exception = invoice/funding rate missing
```

## Reconciliation Rule

```text
Visit can be completed.
Payroll/invoice should not finalise until exceptions are resolved or approved.
```

## Visit Approval Statuses

```text
PENDING_REVIEW
APPROVED_FOR_PAY
APPROVED_FOR_INVOICE
APPROVED_FOR_BOTH
REJECTED_FOR_PAY
REJECTED_FOR_INVOICE
REQUIRES_MANAGER_APPROVAL
LOCKED
```

## QA Checks

```text
Approve actual time for pay but planned time for invoice
Approve shorter payable time than actual time
Approve overrun with reason
Reject invoice for no-access visit
Resolve missing rate card and recalculate
Change visit after payroll draft and create exception
```

---

# Phase 5 — Carer Payroll

## Purpose

This phase calculates and approves what carers should be paid.

## Core Flow

```text
Approved visits
  -> match active carer pay rate card
  -> apply duration/time/day/service rules
  -> add travel, mileage, expenses, premiums, deductions
  -> create payroll lines
  -> review exceptions
  -> approve payroll run
  -> lock/export payroll
```

## Payroll Run Statuses

```text
DRAFT
CALCULATING
EXCEPTION_FOUND
READY_FOR_REVIEW
APPROVED
LOCKED
EXPORTED
REOPENED
ADJUSTED
```

## Payroll Line Types

```text
VISIT_PAY
TRAVEL_TIME_PAY
MILEAGE_REIMBURSEMENT
WAITING_TIME_PAY
EXPENSE_REIMBURSEMENT
OVERTIME
BANK_HOLIDAY_UPLIFT
COMPLEX_CARE_PREMIUM
SLEEP_IN_ALLOWANCE
AWAKE_TIME_PAY
TRAINING_PAY
MEETING_PAY
HOLIDAY_PAY
SICK_PAY
NMW_TOP_UP
ADJUSTMENT
DEDUCTION
```

## Payroll Cases

```text
Normal hourly visit
15-minute visit
30-minute visit
Hourly visit with extra time
Visit crosses rate bands
Weekend visit
Bank holiday visit
Night visit
Waking night
Sleep-in fixed allowance
Awake time during sleep-in
Double-up care
Shadowing/training visit
Replacement carer
Carer overtime
Carer works across branches
Carer has no pay rate card
Pay rate card expired
Rate changed mid-period
Backdated pay correction
Visit changed after payroll draft
Visit changed after payroll lock
Agency staff shift
Non-visit work: training, supervision, meeting, on-call
Holiday pay / accrual
Sick leave paid/unpaid
```

## National Minimum Wage / Living Wage Check

Payroll should check whether total pay meets minimum wage rules when relevant.

Working time may include:

```text
care time
eligible travel time
waiting time
training time
meeting time
awake working time during sleep-in
```

Possible cases:

```text
Short visits reduce average pay
Travel time unpaid but counts for NMW check
Top-up required
Top-up approved
Top-up rejected or manually adjusted
```

## Important Rules

```text
Do not mix hourly pay and expense reimbursement as one line.
Pay actual attending carer, not only planned carer.
Locked payroll should not be silently edited.
Corrections after lock should use adjustment lines.
NMW/top-up should be shown separately for transparency.
```

## QA Checks

```text
Generate payroll for normal week
Generate payroll with missing pay rate
Generate payroll with travel/mileage
Generate payroll with NMW top-up
Generate payroll with sleep-in and awake time
Generate payroll with double-up visit
Adjust locked payroll using correction line
Export payroll and prevent duplicate export
```

---

# Phase 6 — Service User Funding and Invoicing

## Purpose

This phase calculates what should be charged to service users, families, local authorities, NHS, or other funders.

## Core Flow

```text
Approved visits
  -> find service user funding contract
  -> find invoice rate card
  -> apply service/time/day/duration rules
  -> split charge across funders if needed
  -> create invoice lines
  -> review exceptions
  -> approve invoice run
  -> send/export invoice
```

## Invoice Run Statuses

```text
DRAFT
CALCULATING
EXCEPTION_FOUND
READY_FOR_REVIEW
APPROVED
LOCKED
SENT
PART_PAID
PAID
DISPUTED
CREDITED
CANCELLED
```

## Invoice Line Types

```text
VISIT_CHARGE
TRAVEL_CHARGE
MILEAGE_CHARGE
WAITING_TIME_CHARGE
EXPENSE_RECHARGE
BANK_HOLIDAY_UPLIFT
COMPLEX_CARE_PREMIUM
DOUBLE_UP_CHARGE
SLEEP_IN_CHARGE
WAKING_NIGHT_CHARGE
PACKAGE_FEE
SUBSCRIPTION_FEE
RETAINER_FEE
NOTICE_PERIOD_FEE
ADJUSTMENT
CREDIT_NOTE_LINE
DEBIT_NOTE_LINE
VAT_TAX_LINE
```

## Single Funder Case

```text
Service User: John
Funder: Local Authority
Visit charge: £50
Invoice line: Local Authority = £50
```

## Multiple Funder Case

A service user can have 2, 3, or 4 funders.

Example:

```text
Service user: John
Visit charge: £100
Funder 1: Local Authority = 70%
Funder 2: NHS = 20%
Funder 3: Family top-up = 10%
```

Invoice lines:

| Funder | Amount |
|---|---:|
| Local Authority | £70 |
| NHS | £20 |
| Family | £10 |

## Funding Split Types

```text
Single funder
Percentage split
Fixed weekly contribution
Fixed visit contribution
Service-type based funding
Cap / limit based funding
Authorised hours
Remaining / top-up payer
Separate rate card per funder
Direct payment / personal budget
Free/reablement period
Non-chargeable visit
```

## Funding Priority Example

```text
Priority 1: NHS pays complex care
Priority 2: Local Authority pays authorised personal care up to cap
Priority 3: Family pays remaining top-up
```

## Funder / Contract Cases

```text
Funding contract missing
Invoice rate card missing
Funder changes mid-period
Backdated funding change
Purchase order missing
Purchase order expired
Service code missing
Weekly authorised hours exceeded
Monthly budget exceeded
Funder pays only approved service types
Family top-up required
Reablement free period
Assessment visit non-chargeable
Introductory visit non-chargeable
Package cancelled mid-week
```

## Invoice Dispute / Credit Note Cases

```text
Funder rejects invoice
Family disputes charge
Wrong rate used
Wrong funder charged
Visit charged twice
Credit note required
Debit note required
Rebill required
Adjustment added next invoice
Invoice changed after sending
```

## Important Rules

```text
Carer pay does not usually change because funding is split.
Funding rules affect invoice lines only.
Do not silently edit locked/sent invoices.
Use credit note, debit note, adjustment, or rebill flow.
Invoice grouping should be configurable by funder/contract.
```

## QA Checks

```text
Single funder invoice
Three-funder split invoice
Fixed weekly contribution plus remaining funder
Authorised hours exceeded
PO expired
Free reablement visit payable to carer but non-chargeable to client
Credit note after invoice sent
```

---

# Phase 7 — Travel, Mileage, Waiting Time, and Visit Expenses

## Purpose

This phase handles money and time around visits that may affect payroll and invoicing.

## 7.1 Travel Time

Cases:

```text
Travel between visits
Travel from home to first visit
Travel from last visit to home
Travel-only task
Travel time paid to carer
Travel time not charged to client
Travel time included in NMW check
Travel time estimated by map
Travel time manually adjusted
```

## 7.2 Mileage

Cases:

```text
Mileage paid to carer
Mileage charged to client/funder
Mileage not chargeable
Manual mileage entry
Map-estimated mileage
Mileage override
Passenger mileage
Mileage across branches
```

## 7.3 Parking, Toll, Public Transport

Cases:

```text
Parking paid by carer
Toll paid by carer
Public transport ticket
Taxi used for service user
Receipt required
Expense reimbursed but not invoiced
Expense invoiced but not reimbursed
```

## 7.4 Waiting Time

Cases:

```text
Carer waits at door
Key safe delay
Family late to open door
Service user unavailable
Late handover
Waiting time paid to carer
Waiting time charged to client/funder
Waiting time waived
```

## 7.5 Visit Expenses / Carer Reimbursements

Use this feature when a carer spends money during a visit.

Examples:

```text
Medicine / pharmacy item
Medical treatment cost
Groceries
Meal ingredients
Personal care item
Cleaning item
Incontinence product
Taxi for service user
Parking while accompanying service user
Emergency household item
Other purchase
```

## Visit Expense Flow

```text
Carer identifies extra need
  -> carer adds expense in app
  -> receipt/photo uploaded
  -> reason added
  -> paid-by selected
  -> office reviews
  -> approve/reject/ask for more info
  -> if approved, reimburse carer if required
  -> if allowed, recharge service user/funder
```

## Payment Source Cases

```text
Carer paid from own pocket
Service user gave cash
Service user gave bank card
Family left money for shopping
Company card used
Petty cash used
Family/funder will pay later
```

## Money Handling / Cash Safeguarding

If service user gives cash, record:

```text
cash_received
amount_spent
change_returned
receipt_uploaded
service_user_confirmed
carer_notes
office_approval
```

## Medicine/Treatment Expense Rule

Medicine or treatment expense is not just finance. It should also check care compliance.

Require:

```text
care plan check
MAR review if medicine-related
prescription/approval evidence
receipt upload
manager approval
incident/safeguarding review if needed
```

## Expense Statuses

```text
DRAFT
SUBMITTED
PENDING_REVIEW
APPROVED
REJECTED
NEEDS_MORE_INFO
REIMBURSED
ADDED_TO_INVOICE
DISPUTED
```

## Important Rules

```text
Do not auto-pay or auto-charge expenses.
Reimbursement to carer and recharge to client/funder are separate decisions.
Medicine-related expenses require stricter approval.
Cash handling must always create audit evidence.
```

## QA Checks

```text
Carer submits grocery expense with receipt
Carer submits medicine expense and MAR review is required
Service user gives cash and change is returned
Expense approved for reimbursement only
Expense approved for invoice recharge only
Expense rejected after submission
Expense submitted after payroll lock
```

---

# Phase 8 — Cancellations, Absences, and No-Access Cases

## Purpose

This phase handles visits that do not happen normally.

## Cancellation Types

```text
Cancelled by service user
Cancelled by family
Cancelled by office
Cancelled by carer
Cancelled by funder
Cancelled due hospital admission
Cancelled due emergency
Cancelled due weather/transport issue
Cancelled after carer arrived
```

## Cancellation Charging Rules

```text
Cancelled more than 24 hours before = no charge
Cancelled less than 24 hours before = partial/full charge
Carer already travelling = travel may be paid
Carer arrived at door = no-access/cancellation fee may apply
Manager can waive charge
```

## No-Access Cases

```text
Door not opened
Key safe problem
Service user not home
Family not present
Wrong address
Carer cannot safely enter
```

Possible outputs:

```text
Carer paid minimum amount
Client/funder charged cancellation/no-access fee
No invoice charge
Incident/safeguarding alert if risk exists
```

## Service User Absence Cases

```text
Service user in hospital
Service user on holiday
Package paused
Temporary suspension
Service user returns early
Visit scheduled during absence
Absence starts after rota already created
Retainer fee applies
Retainer fee waived
```

## Carer Absence Cases

```text
Carer sick before visit
Carer annual leave conflicts with rota
Carer emergency absence
Carer no-show
Carer late due previous visit overrun
Replacement carer assigned
Visit remains unallocated
Different pay rate applies to replacement carer
```

## Notice Period / Retainer Fee Cases

```text
Service user gives 7-day notice
Service user gives 14-day notice
Package cancelled immediately
Provider charges notice period
Hospital retainer applies
Retainer charged weekly
Retainer waived by manager
Family disputes retainer
```

## Important Rules

```text
Rota should warn/block visits during approved service user or carer absence.
Care-risk visits should escalate if unallocated or missed.
No-access and missed visits need reason, evidence, and audit trail.
Cancellation charge should come from contract rules.
```

## QA Checks

```text
Cancel visit 48 hours before and confirm no charge
Cancel visit 2 hours before and apply charge
No-access visit with carer paid but no invoice
Hospital absence cancels future visits
Carer sickness triggers replacement workflow
Notice-period fee generated after package cancellation
```

---

# Phase 9 — Special Care Packages and Complex Visit Cases

## Purpose

This phase covers care packages that do not behave like simple hourly homecare.

## Package Cases

```text
Live-in care
24-hour care
Supported living
Group care
Couples / shared household visit
Shared visit across two service users
Ad hoc visit
Recurring package / subscription fee
Complex care
One-to-one support
Waking night
Sleep-in
Emergency response visit
Reablement / free period
Assessment visit
Care plan review visit
Introductory visit
Trial visit
```

## Sleep-In vs Waking Night

These should be separate.

```text
Sleep-in = fixed allowance, with awake time tracked separately
Waking night = usually hourly or fixed night rate
```

Sleep-in cases:

```text
Fixed sleep-in allowance
Carer wakes up to support service user
Multiple wake-up events
Awake time paid separately
Sleep-in converted to waking night
```

## Shared Visit / Household Cases

```text
One carer supports husband and wife
One visit shared by two service users
Supported living group support
Group activity visit
Cost split across service users
One funder pays group package
Each service user charged partial amount
```

## Double-Up and Multi-Carer Cases

```text
Two carers required and both attend
Two carers required but only one attends
One carer arrives late
Second carer is replacement
Shadow carer chargeable
Shadow carer non-chargeable
Senior carer has higher pay rate
Nurse/clinical worker has different rate
```

## Skill / Competency Cases

```text
Carer lacks medication competency
Carer lacks moving/handling training
Carer lacks complex-care skill
Carer not approved for service user
Carer requires shadowing before solo visit
Specialist rate applies due skill
Visit blocked due missing training
Manager override required
```

## Important Rules

```text
Each attending worker needs separate payroll calculation.
One visit may create multiple invoice lines if shared by multiple service users/funders.
Skill requirements should be checked before rota assignment.
Non-chargeable visits may still be payable to carers.
```

## QA Checks

```text
Create live-in package with fixed weekly invoice
Create sleep-in with awake time
Create double-up visit where only one carer attends
Create shared visit for two service users
Create non-chargeable introduction visit payable to carer
Block assignment when carer lacks required skill
```

---

# Phase 10 — Payments, Wallets, Remittance, and Credit Control

## Purpose

This phase handles money collection after invoices are created.

## Payment Collection Cases

```text
Invoice unpaid
Invoice partially paid
Invoice fully paid
Overpayment received
Payment matched to wrong invoice
Family pays by bank transfer
Funder pays by bulk remittance
Card payment succeeds
Card payment fails
Direct Debit fails
Payment link expires
Refund issued
Bad debt / write-off
```

## Payment Statuses

```text
UNPAID
PART_PAID
PAID
OVERPAID
REFUNDED
FAILED
WRITTEN_OFF
PAYMENT_PLAN
```

## Prepaid Balance / Client Wallet Cases

```text
Family pays £500 advance
Visits deducted from balance
Balance runs low
Auto-reminder sent
Unused balance refunded
Deposit transferred to another package
Deposit adjusted after credit note
```

Recommended wallet transaction types:

```text
ADVANCE_PAYMENT
VISIT_DEDUCTION
INVOICE_PAYMENT
REFUND
CREDIT_NOTE
MANUAL_ADJUSTMENT
TRANSFER
```

## Council / Funder Remittance Matching Cases

```text
Council pays one bulk amount
Payment covers many service users
Some invoice lines rejected
Some lines short-paid
Remittance file imported
System auto-matches payment to invoices
Unmatched amount remains
```

## Debt / Aged Receivables Cases

```text
Invoice overdue 7 days
Invoice overdue 30 days
Invoice overdue 60 days
Family reminder sent
Funder reminder sent
Account placed on hold
Payment plan agreed
Debt written off
```

Recommended ageing buckets:

```text
0-7 days
8-30 days
31-60 days
61-90 days
90+ days
```

## Final Account Cases

```text
Service user passed away
Service user moved to care home
Package ended mid-week
Final invoice generated
Unused prepaid balance refunded
Credit note issued
Outstanding balance remains
Family disputes final invoice
```

## Important Rules

```text
Payment should be allocated to invoice lines clearly.
Bulk remittance must support partial and rejected lines.
Overpayments should not disappear; hold as credit or refund.
Final account should close visits, invoices, credits, wallet, and outstanding balances cleanly.
```

## QA Checks

```text
Partial payment against invoice
Overpayment becomes wallet credit
Bulk council payment matches multiple invoices
Rejected remittance line creates dispute
Invoice moves to overdue status
Final account refunds unused balance
```

---

# Phase 11 — Tax, VAT, Billing Type, and Legal Billing Contacts

## Purpose

This phase covers advanced billing classification, tax treatment, and who legally receives/pays invoices.

## VAT / Tax Cases

```text
Care service is VAT-exempt
Extra goods/items may be VAT-exempt if connected to welfare care
Some non-care services may be taxable
Provider is regulated vs not regulated
Invoice needs VAT breakdown
VAT rate changes later
```

Recommended invoice tax fields:

```text
tax_code
tax_rate
tax_amount
tax_exempt_reason
supply_type
provider_type
```

## Care Provider vs Staff Agency Billing

Cases:

```text
Provider delivers regulated care service
Agency only supplies staff
Subcontracted carer used
Invoice is for care service
Invoice is for staff supply
Different VAT/accounting treatment
```

## Billing Contact / Appointee / Power of Attorney Cases

```text
Bill-to person is family member
Bill-to person is appointee
Bill-to person is deputy
Power of Attorney contact receives invoice
Service user lacks capacity
Invoice must not be sent to service user directly
Multiple family contacts exist
One contact receives invoice, another receives care updates
Billing contact changes mid-package
```

Recommended permissions:

```text
CAN_RECEIVE_INVOICE
CAN_PAY_INVOICE
CAN_DISPUTE_INVOICE
CAN_VIEW_VISIT_SUMMARY
CAN_RECEIVE_PAYMENT_REMINDERS
CAN_APPROVE_EXPENSES
```

## Important Rules

```text
Tax logic should be configurable and auditable.
Do not assume service user is the invoice recipient.
Invoice recipient permissions must be explicit.
Staff supply and care service invoices should be classified separately.
```

## QA Checks

```text
Generate VAT-exempt care invoice
Generate taxable non-care service line
Send invoice to appointee instead of service user
Change billing contact mid-package
Create agency staff supply invoice type
```

---

# Phase 12 — Medication, MAR, Safeguarding, Governance, and Audit

## Purpose

This phase handles compliance-sensitive cases linked to visits, expenses, medicines, incidents, and audit evidence.

## Medication / MAR Cases

```text
Medicine administered
Medicine refused
Medicine not available
Medicine already taken
Wrong dose found
Medication missed due late visit
Medication given late
PRN medicine given
New medicine requested during visit
Medicine bought by carer
MAR chart missing
MAR chart updated after visit
Medication error creates incident
```

## Controlled Medicine / Strict Escalation Cases

```text
Controlled drug involved
PRN medicine requested
Medicine bought without care-plan approval
Medicine collected from pharmacy
Medicine transported by carer
Medicine stored temporarily by carer
Medicine disposed of
Medicine returned to family/pharmacy
Medication record amended later
Medication error creates incident
```

Recommended flags:

```text
is_medicine_related
is_controlled_medicine
requires_mar_update
requires_care_plan_review
requires_incident_review
requires_manager_approval
```

## Safeguarding / Incident-Linked Cases

```text
Service user fall
Service user unwell
Ambulance called
Family contacted
Safeguarding concern
Carer injury
Aggression or abuse
Medication error
Missed critical visit
No-access high-risk visit
```

## Inspector / Audit Export Cases

```text
Export visit evidence for inspection
Export missed visit report
Export medication evidence
Export expense/money-handling evidence
Export invoice/payroll change history
Export audit trail for rate changes
Read-only auditor access
Export records for service user/date range
Export records for carer/date range
```

## Audit Trail Must Capture

```text
who changed record
what changed
old value
new value
reason
approval person
timestamp
source: mobile / admin / import / integration
```

## Important Rules

```text
Medication-related finance events should never be treated as simple expenses only.
Controlled medicine cases require stricter escalation.
Audit exports must be read-only, permission-controlled, date-filtered, and logged.
Locked finance records should use adjustments rather than silent edits.
```

## QA Checks

```text
Medication refused during visit
Medicine bought by carer and MAR review required
Controlled medicine flag requires manager approval
Missed critical visit creates incident
Export audit trail for invoice changes
Export visit evidence for inspection
```

---

# Phase 13 — Integrations, Exports, and Offline Conflict Handling

## Purpose

This phase connects billing/payroll data to external systems and manages sync issues.

## Payroll / Accounting Export Cases

```text
Export payroll to Sage
Export invoice to Xero
Export to accounting system
Export failed
Duplicate export attempted
Invoice already synced
Payroll already exported
Accounting system rejects record
Funder reference missing
External reference returned
Correction after export
```

## Recommended Export Statuses

```text
NOT_EXPORTED
QUEUED
EXPORTED
EXPORT_FAILED
RETRY_REQUIRED
EXTERNAL_REJECTED
CORRECTION_REQUIRED
```

## Offline Data Conflict Cases

```text
Carer edits visit offline
Office edits same visit online
Offline check-in syncs after office manual correction
Device time is wrong
Duplicate offline submission
Offline expense submitted after payroll lock
Offline note submitted after invoice sent
Carer app resubmits old visit data
```

## Sync Statuses

```text
SYNCED
PENDING_SYNC
SYNC_CONFLICT
DUPLICATE_SYNC
MANUAL_REVIEW_REQUIRED
REJECTED_AS_STALE
```

## Important Rules

```text
Use external_reference_id for exported records.
Do not export the same locked record twice unless correction flow is used.
If offline data affects locked finance, create an exception/adjustment instead of overwriting.
Keep device timestamp and server timestamp.
```

## QA Checks

```text
Export invoice successfully
Export fails and retry works
Prevent duplicate export
Accounting system rejects invoice due missing reference
Offline visit syncs after payroll lock and creates exception
Duplicate offline submission is detected
```

---

# Phase 14 — Screens and User Experience

## Purpose

This phase defines the main screens needed for the billing module.

## Required Screens

### 1. Billing Dashboard

Should show:

```text
Visits ready for billing
Visits with exceptions
Payroll drafts
Invoice drafts
Missing rate cards
Missing funding contracts
Overdue invoices
Unmatched payments
```

### 2. Rate Cards Screen

Should allow:

```text
Create pay rate cards
Create invoice rate cards
Add rate rules
Add effective dates
Create new versions
Approve rate changes
View rate history
```

### 3. Funding Contracts Screen

Should allow:

```text
Assign funder to service user
Add multiple funders
Set split rules
Set caps/budgets
Set authorised hours
Add PO/service code
Set billing contact
Set effective dates
```

### 4. Visit Reconciliation Screen

Should show:

```text
Planned time
Actual check-in/out
Approved payable time
Approved billable time
GPS status
Task status
Medication status
Exceptions
Manager notes
Approval buttons
```

### 5. Payroll Run Screen

Should show:

```text
Payroll period
Carer totals
Visit pay lines
Travel/mileage
Expenses/reimbursements
NMW top-up
Exceptions
Approve/lock/export actions
```

### 6. Invoice Run Screen

Should show:

```text
Invoice period
Service user totals
Funder totals
Visit charges
Funding splits
Expenses recharged
Credit/debit notes
Payment status
Send/export actions
```

### 7. Payment and Remittance Screen

Should show:

```text
Invoices due
Payments received
Partial payments
Overpayments
Remittance batches
Unmatched payments
Aged debt
Credit control actions
```

### 8. Audit and Export Screen

Should show:

```text
Visit evidence exports
Medication exports
Finance audit exports
Rate change history
Payroll change history
Invoice change history
Export logs
```

---

# Phase 15 — Database Design

## Purpose

This phase lists the core database entities needed to support the module.

## Core Tables

```text
carers
service_users
funders
branches
service_types
visits
visit_actuals
visit_reconciliations
visit_tasks
visit_medication_records
```

## Rate and Funding Tables

```text
rate_cards
rate_card_versions
rate_rules
carer_rate_assignments
service_user_funding_contracts
funding_split_rules
funder_rate_assignments
public_holidays
rate_uplift_batches
```

## Service User Charge Card Tables

```text
service_user_charge_cards
service_user_charge_card_versions
service_user_charge_rules
service_user_charge_assignments
charge_card_approval_logs
charge_card_override_logs
charge_card_exception_logs
charge_card_uplift_batches
charge_card_recalculation_jobs
charge_card_tax_mappings
charge_card_accounting_mappings
```

## Payroll Tables

```text
pay_runs
pay_run_periods
pay_run_lines
payroll_exceptions
carer_reimbursement_lines
holiday_pay_records
nmw_top_up_lines
```

## Invoice Tables

```text
invoice_runs
invoices
invoice_lines
invoice_tax_lines
invoice_expense_lines
credit_notes
debit_notes
invoice_disputes
external_invoice_approvals
```

## Expense and Money Handling Tables

```text
visit_expenses
expense_attachments
expense_approvals
money_handling_logs
controlled_medicine_reviews
```

## Payment Tables

```text
payments
payment_allocations
client_wallets
wallet_transactions
advance_payments
refunds
remittance_batches
remittance_lines
unmatched_payments
credit_control_actions
final_account_closures
```

## Compliance and Audit Tables

```text
finance_exceptions
audit_logs
audit_export_jobs
offline_sync_conflicts
billing_contacts
legal_representatives
invoice_recipients
recipient_permissions
```

## Integration Tables

```text
export_batches
export_lines
external_references
integration_errors
```

---

# Phase 16 — Calculation Order

## Purpose

This phase defines the safe order for calculating payroll and invoice records.

## Full Calculation Order

```text
1. Confirm visit is completed or chargeable by rule.
2. Confirm service user and carer are valid for visit date.
3. Confirm actual/reconciled visit time.
4. Confirm approved payable time.
5. Confirm approved billable time.
6. Find active carer pay rate card.
7. Find active service user/funder invoice rate card.
8. Apply service type rule.
9. Apply date/day rule: weekday, weekend, public holiday.
10. Apply time-band rule: morning, evening, night.
11. Split visit if it crosses configured rate bands.
12. Apply short-visit/minimum/rounding rule.
13. Apply premiums, multipliers, and overrides.
14. Add travel, mileage, waiting time if allowed.
15. Add approved expenses/reimbursements/recharges.
16. Apply funding split rules.
17. Check PO, budget, authorised hours, caps.
18. Check NMW/top-up rules for payroll if applicable.
19. Create pay run lines.
20. Create invoice lines.
21. Create exceptions for missing/invalid data.
22. Allow admin review.
23. Approve and lock.
24. Export/send.
25. Track payment and adjustments.
```

## Important Rule

```text
A visit can be clinically/care-completed but finance-incomplete.
Finance must wait for required setup, reconciliation, and approval.
```

---

# Phase 17 — MVP, Phase 2, and Phase 3 Roadmap

## MVP Must-Have

Build these first:

```text
Carer pay rate cards
Invoice rate cards
Service user funding contracts
Single funder
Basic multiple funder split
15-minute / 30-minute / hourly charging
Visit completion and reconciliation
Missing rate exceptions
Weekly payroll run
Weekly invoice run
Travel and mileage basic support
Visit expense approval
Credit note / adjustment basic support
Audit trail
```

## Phase 2 — Strong Operational Version

Add:

```text
Advanced funding caps and authorised hours
Public holiday calendars
Sleep-in vs waking night
NMW/top-up checks
Service user absence/hospitalisation
Carer absence/replacement
Unallocated visit alerts
Money handling logs
Medication/MAR finance links
Payment tracking
Partial payments
Remittance matching
Invoice disputes
Holiday pay/accrual
```

## Phase 3 — Advanced Enterprise Version

Add:

```text
VAT/tax configuration
Provider vs staff agency billing
Client wallet/deposits
Aged debt/credit control
Final account/refund flow
Annual rate uplift batches
External invoice approval
Appointee/POA billing permissions
Offline conflict handling
Controlled medicine escalation
Accounting/payroll integrations
Inspector/audit export portal
Advanced analytics and margin reporting
```

---

# Phase 18 — QA Master Checklist

## Visit QA

```text
Normal visit completed
Late arrival
Early arrival
Overrun
Early finish
No check-in
No check-out
GPS mismatch
Offline visit sync
No access
Service user refused care
Missed visit
Replacement carer
Double-up visit
Shadowing visit
Wrong service user visit
Visit crosses rate bands
Visit crosses daylight saving change
```

## Rate QA

```text
15-minute pro-rata
30-minute fixed charge
Hourly calculation
Minimum charge rule
Rounding rule
Weekend rate
Bank holiday rate
Night rate
Expired rate card
Backdated rate change
Rate overlap conflict
```

## Service User Charge Card QA

```text
Private service user charge card
Funder-specific charge card
Contract-specific charge card
Service-type charge rate
15-minute fixed charge
15-minute pro-rata charge
30-minute minimum charge
Visit crosses time-band charge split
Public holiday charge multiplier
No charge card attached
Expired or inactive charge card
Overlapping charge card conflict
Funding contract missing
PO missing or expired
Budget cap exceeded
Authorised hours exceeded
Non-chargeable assessment visit
Family top-up split
Shared household split
Double-up charge
Mileage chargeable/not chargeable
Manual charge override approval
Backdated uplift recalculation
Invoice recipient appointee/POA
Tax/accounting code missing
```

## Payroll QA

```text
Normal payroll
Missing pay rate
Travel time pay
Mileage reimbursement
Expense reimbursement
NMW top-up
Sleep-in allowance
Awake time pay
Holiday pay
Payroll locked correction
Payroll export failure
```

## Invoice QA

```text
Single funder invoice
Multiple funder split
Fixed weekly contribution
Authorised hours exceeded
PO missing
Budget cap exceeded
Free/reablement visit
Invoice dispute
Credit note
Invoice sent then corrected
```

## Expense and Money Handling QA

```text
Carer paid from own pocket
Service user gave cash
Receipt missing
Change returned
Medicine expense
Controlled medicine review
Expense reimbursed only
Expense recharged only
Expense after payroll lock
```

## Payment QA

```text
Full payment
Partial payment
Overpayment
Refund
Wallet deduction
Bulk remittance
Rejected remittance line
Unmatched payment
Overdue invoice
Final account refund
```

## Compliance QA

```text
Medication refused
MAR update required
Safeguarding incident
Audit trail export
Rate history export
Read-only auditor access
Offline conflict after locked invoice
Permission-controlled billing contact
```

---

# Final Rules Summary

```text
1. Rota is not final finance.
2. Completed and approved visits are the finance source.
3. Carer pay and client/funder invoice must be calculated separately.
4. Missing setup creates exception, not silent calculation.
5. Care delivery should not be blocked by missing finance setup.
6. Locked payroll/invoices must not be silently edited.
7. Corrections after lock must use adjustments, credit notes, debit notes, or rebill flow.
8. Expenses require approval before reimbursement or recharge.
9. Medicine-related expenses require stricter care compliance review.
10. Every manual change must have audit trail.
11. Multiple funders affect invoice split, not normal carer pay.
12. The system must support short visits, hourly visits, fixed rates, banded rates, and rate splitting.
13. Service user charge cards must support funder-specific, contract-specific, service-type, short-visit, cap, PO, tax, and exception cases.
```

---

# Final Recommended Build Flow

```text
Phase 1: Master data
Phase 2: Rate cards
Phase 3: Rota and visit completion
Phase 4: Visit reconciliation
Phase 5: Carer payroll
Phase 6: Service user/funder invoicing
Phase 7: Travel, mileage, expenses
Phase 8: Cancellations and absences
Phase 9: Special care packages
Phase 10: Payments and credit control
Phase 11: Tax and legal billing contacts
Phase 12: Medication, safeguarding, audit
Phase 13: Integrations and offline conflicts
Phase 14: Screens
Phase 15: Database
Phase 16: Calculation order
Phase 17: Roadmap
Phase 18: QA checklist
```


---

# Phase 19 — Missing Cases from UK Care Software Research

## Purpose

This phase documents cases present in leading UK and international care management platforms that were not explicitly covered in earlier phases. Sources include Birdie, CareLineLive, UniqueIQ, Access Care, Nourish, AlayaCare, AxisCare, HHAeXchange, CareVoyant, and UK regulatory guidance (NHS England, CQC, DHSC, Digitising Social Care Programme).

---

## 19.1 NHS Continuing Healthcare (CHC) Billing Cases

NHS Continuing Healthcare is fully funded by the NHS/ICB and is not means-tested. The billing model is distinct from local authority funding.

### Funder Types

```text
NHS CHC = ICB pays 100% of eligible care costs
NHS-funded Nursing Care (FNC) = flat weekly contribution to nursing home
Section 117 Mental Health Act aftercare = free, jointly funded by NHS and LA
Personal Health Budget (PHB) = CHC funds managed directly or via third party
```

### Cases to Handle

```text
Service user moves from LA-funded to NHS CHC mid-package
Service user moves from private self-funder to NHS CHC
Fast Track CHC assessment triggers urgent package setup
CHC eligibility review triggers funding change
CHC funding ends and service user reverts to LA or private funding
CHC Direct Payment: NHS pays service user who purchases own care
CHC Notional Budget: NHS arranges and pays care provider directly
CHC Third-Party Budget: independent organisation holds and manages funds
CHC and LA joint care package (health and social care elements split)
Dispute between ICB and LA over funding responsibility
NHS-funded Nursing Care (FNC) flat-rate contribution added alongside LA-funded package
```

### Important Rules

```text
CHC is not means-tested. Do not apply financial assessment thresholds.
CHC billing invoice goes to the ICB, not the service user or family.
CHC and LA-funded visits in the same package must have separate invoice lines.
Fast Track CHC can be authorised by a single clinician; flag for immediate billing setup.
When CHC status changes, create billing transition event and recalculate the split.
Section 117 aftercare is free to the service user; provider invoices the commissioning body.
```

### QA Checks

```text
Create CHC-funded service user; confirm invoice goes to ICB only, not family
Switch service user from LA to CHC mid-month; confirm split invoices created correctly
Create S117 aftercare billing contract; confirm zero charge to service user
Test CHC Direct Payment where service user holds the budget
Test CHC Third-Party Budget where independent organisation receives ICB payment
Test CHC combined with FNC billing on same package
```

---

## 19.2 Personal Health Budget (PHB) Billing Cases

A Personal Health Budget is an NHS-agreed amount managed by the service user, a representative, or a third party to purchase care. PHB is a legal right for CHC-eligible adults.

### PHB Management Types

```text
Direct Payment PHB: NHS pays service user or representative directly
Notional PHB: NHS retains and spends on behalf of service user
Third-Party PHB: independent organisation holds and manages the budget
Integrated Personal Budget: combines NHS PHB with LA personal budget
```

### Cases to Handle

```text
PHB direct payment: invoice goes to service user rather than NHS commissioner
PHB notional: invoice goes to ICB as commissioner
PHB third party: invoice goes to budget-holding organisation
PHB underspend: unused balance returned to ICB at period end
PHB overspend: service user contacts NHS team; provider holds next invoice
PHB budget increased after care needs review
PHB used for unapproved services; spending challenged by commissioner
PHB transferred from LA personal budget to NHS PHB
Integrated personal budget: one invoice covering both health and social care portions
PHB ends; care continues under standard ICB commissioning contract
```

### Important Rules

```text
PHB spending must match the agreed care plan.
Providers must not issue invoices for services not approved under the PHB care plan.
When a PHB overspend occurs, flag for commissioner review before generating next invoice.
Integrated budgets require split invoice lines for NHS and LA portions.
```

### New Exception Codes

```text
PHB_BUDGET_EXCEEDED
PHB_SPENDING_NOT_APPROVED
PHB_TRANSFER_PENDING
INTEGRATED_BUDGET_SPLIT_MISSING
```

---

## 19.3 Section 117 Mental Health Act Aftercare Billing Cases

Section 117 requires NHS and LA to provide free aftercare to eligible individuals discharged from detention under the Mental Health Act 1983.

### Cases to Handle

```text
Service user eligible for S117 aftercare: no charge to the service user
S117 funded jointly by ICB and LA with defined split responsibility
S117 aftercare ends when no longer needed; billing reverts to normal funding
Service user disputes end of S117; continues to expect free care
Provider invoices both ICB and LA for their respective S117 shares
S117 care continues alongside private or personal budget services
Service user exercises right to PHB under S117
S117 aftercare provision reviewed and extended
```

### Important Rules

```text
S117 aftercare cannot be means-tested or charged to the service user under any circumstances.
Invoice goes to commissioning bodies (ICB and LA), not the individual.
If S117 status is disputed, do not charge service user until formally resolved.
Record S117 eligibility status on service user record and funding contract.
```

---

## 19.4 Local Authority Financial Assessment and Means Test Billing Cases

The LA financial assessment determines how much a service user must contribute toward the cost of their care. The billing module must handle the billing status during and after assessment.

### Cases to Handle

```text
Service user awaiting financial assessment: interim billing applied at agreed rate
Service user assessed as full self-funder: full charge at provider rate
Service user assessed as partial LA funding: service user top-up required
Service user assessed as fully LA-funded: standard block or spot contract rate applies
Service user capital falls below upper means test threshold mid-package (currently 23,250 GBP in England)
Service user was self-funder; becomes LA-eligible; billing changes with potential retrospective adjustment
12-week property disregard for new care home entrant: property value excluded for first 12 weeks
Annual review of financial assessment changes service user contribution level
Service user disputes financial assessment result; billing placed under review
```

### Deferred Payment Agreement (DPA) Billing Cases

```text
DPA setup: LA pays provider on behalf of service user; debt accumulates as deferred charge against property
DPA interest accrues on deferred balance
DPA administration fees invoiced separately
Service user sells property; DPA repaid in full and agreement closed
Service user passes away; estate settles DPA debt
DPA ended early because equity limit is reached
DPA refused due to insufficient property equity; billing reverts to self-funder arrangement
Property disregarded because qualifying person still living in it; DPA may not be needed
```

### Important Rules

```text
During the 12-week property disregard, do not include property value in financial assessment charge.
DPA means LA invoices the provider and carries the deferred debt; the debt is not forgiven.
Never apply self-funder rate automatically without a completed financial assessment.
Backdated financial assessment changes may require retrospective invoice adjustments via credit or debit note flow.
LA taking over funding does not mean it inherits unpaid self-funder invoices.
```

### New Exception Codes

```text
FINANCIAL_ASSESSMENT_PENDING
DPA_EQUITY_LIMIT_APPROACHING
SELF_FUNDER_RECLASSIFIED
MEANS_TEST_RESULT_DISPUTED
```

---

## 19.5 Block Contract, Spot Purchase, and Framework Agreement Billing Cases

Local authorities and NHS commission care either through block contracts (agreed volumes at fixed rates) or spot purchase (individual package agreed case by case).

### Block Contract Cases

```text
LA has block contract for agreed hours per week at agreed rate
Provider delivers less than contracted volume (under-delivery)
Provider delivers more than contracted volume (over-delivery)
Block contract specifies minimum guaranteed hours; minimum must be invoiced even if under-delivered
Block contract rate uplifted annually
Block contract expired and not renewed; visits continue without contract cover
Block contract renegotiated mid-year
Surplus hours rolled forward to next billing period
```

### Spot Purchase Cases

```text
Individual spot purchase order issued for one service user
Spot purchase rate different from block contract rate
Spot purchase has fixed start and end date
Spot purchase extended after original end date
Spot purchase rate uplift agreed mid-package
Spot purchase cancelled before end date
Spot purchase invoice references the spot PO number
```

### Framework Agreement and Dynamic Purchasing System Cases

```text
Provider is on an approved LA or NHS framework
Invoice must reference framework agreement code on every line
Framework rate schedule used instead of internal rate card
Off-framework invoicing flagged as exception
Framework expires and no replacement is yet in place
Provider de-listed from framework mid-contract
```

### Important Rules

```text
Block contract minimum volumes must be invoiced unless the contract explicitly allows under-delivery credit.
Spot purchase rate must be agreed in writing before billing begins.
Framework agreement codes must appear on all relevant invoice exports.
Off-framework visits must not be silently billed at framework rate.
```

### New Exception Codes

```text
BLOCK_CONTRACT_UNDER_DELIVERY
SPOT_PURCHASE_EXPIRED
FRAMEWORK_CODE_MISSING
OFF_FRAMEWORK_VISIT
```

---

## 19.6 Digital Social Care Records (DSCR) and CQC Compliance Billing Cases

DSCR is now a mainstream regulatory requirement in England. The billing module must be consistent with and exportable alongside DSCR systems.

### Cases to Handle

```text
Provider holds NHS DSCR assurance; care record and billing data must remain consistent
CQC inspection: auditor requests export of visit records alongside billing evidence
Billing data queried against care record for a specific visit
LA requires DSCR-consistent visit data for invoice validation or query resolution
Care record updated after invoice sent; billing data must not silently change
GP Connect used to verify care needs during a billing dispute (see 19.11)
DSPT compliance affects which data can be exported to external parties
Provider switches DSCR supplier; historical billing data must survive migration cleanly
Data migration must preserve billing history and audit trail
```

### Important Rules

```text
Billing export for CQC audit must match care record data for the same visit.
Any discrepancy between care record and invoice line must create a reconciliation exception.
Do not allow billing data to be silently overwritten by a DSCR data migration.
DSPT standards met status must be confirmed before activating GP Connect data sharing.
```

---

## 19.7 Electronic Visit Verification (EVV) Billing Cases

EVV systems capture real-time visit data (check-in time, check-out time, GPS, service type) and are used by funders to validate billing claims. UK councils increasingly require EVV-grade evidence.

### Cases to Handle

```text
EVV check-in time differs from billed start time
EVV check-out time differs from billed end time
EVV GPS location does not match service user address
EVV data unavailable for visit due to offline mode or app failure
Funder requires EVV-verified data before accepting invoice
EVV data submitted after invoice was already generated
EVV mismatch creates billing exception requiring manual reconciliation
EVV confirms service delivered; invoice can proceed
Funder rejects invoice because EVV data is absent
EVV data contradicts carer manual time entry
Funder accepts EVV data but applies a different duration rounding rule
```

### Important Rules

```text
EVV mismatch creates a billing exception; it must not silently override reconciled time.
Where funder requires EVV data, do not finalise invoice until EVV is confirmed.
Store raw EVV data separately from reconciled and approved payable or billable time.
```

### New Exception Codes

```text
EVV_TIME_MISMATCH
EVV_LOCATION_MISMATCH
EVV_DATA_MISSING
EVV_REQUIRED_BY_FUNDER
```

---

## 19.8 Integrated Personal Budget and Joint Commissioning Cases

Some service users have needs funded jointly by NHS and LA under integrated or pooled budget arrangements (including Section 75 partnerships).

### Cases to Handle

```text
Section 75 pooled budget: NHS and LA pool funds; one commissioner acts as lead
Lead commissioner arrangement: LA acts on behalf of ICB and manages invoicing
Integrated personal budget: covers health and social care (sometimes education)
Joint-funded package proportion changes mid-year: health need increases, NHS share increases
Joint-funded package dispute: NHS and LA disagree on funding split
Joint-funded package annual review changes contribution percentages
Integrated budget underspend: refund allocation agreed between commissioners
Integrated budget overspend: approval required before billing excess
Service user moves between ICB areas (geographic move); commissioning responsibility changes
```

### Important Rules

```text
Joint-funded invoices must clearly show each commissioner's share on separate lines.
Do not issue a single undifferentiated invoice for joint-funded packages.
When a lead commissioner arrangement exists, invoice goes to the lead; internal allocation is their responsibility.
Geographic move between ICBs triggers a formal transfer of commissioning responsibility.
```

---

## 19.9 Self-Funder Transitions and Ex-Self-Funder Cases

Service users who were self-funding may become LA-eligible when their capital falls below the means test threshold.

### Cases to Handle

```text
Self-funder capital falls below 23,250 GBP (England); LA funding begins
Self-funder requests financial assessment; billing continues at interim rate during assessment
LA-funded service user receives inheritance; reassessed as self-funder
Service user charged at self-funder rate during assessment period; retrospective credit applied
Ex-self-funder has outstanding unpaid invoices; LA does not inherit the debt
Service user disputes charges during the self-funder period
Billing contact changes when service user transitions from self-funder to LA-funded
```

### Important Rules

```text
LA becoming responsible for funding does not mean it inherits unpaid self-funder invoices.
During financial assessment, bill at interim rate with a clear audit trail.
Retrospective adjustments after completed financial assessment must use credit note or adjustment flow.
```

---

## 19.10 Family Portal and Real-Time Billing Transparency Cases

Modern care platforms include family portal features (Birdie, CareLineLive, Access, Nourish) allowing families to view visit records. This creates billing transparency and dispute risks.

### Cases to Handle

```text
Family member views visit record in portal and disputes invoice
Portal shows visit completed; invoice not yet generated; family queries delay
Family questions duration shown in portal versus duration billed
Family member requests invoice copy through portal
Family member queries whether carer name should appear on invoice
Family member sees missed visit in portal and raises complaint before invoice is issued
Family member approves expense through portal before finance team processes it
```

### Important Rules

```text
Family portal data and billing data must remain consistent.
If a family member disputes based on portal visit data, create a billing dispute linked to the specific visit record.
Carer name visibility in the portal and on the invoice may differ; control these permissions separately.
```

---

## 19.11 GP Connect and Clinical Data Integration Billing Cases

NHS DSCR-assured platforms allow care staff to access GP records via GP Connect for direct care purposes. This can affect billing evidence in disputed cases.

### Cases to Handle

```text
GP record accessed to confirm care need during CHC eligibility dispute
GP record reveals new diagnosis; care plan and billing rate must be reviewed
GP medication record conflicts with MAR during a visit; compliance and billing both affected
GP Connect access log used as evidence in CQC inspection alongside billing data
Billing dispute resolved using GP record to confirm care was necessary and delivered
```

### Important Rules

```text
GP Connect access is permitted for direct care purposes only; it cannot be used solely to resolve billing disputes.
Log every GP Connect access event for audit.
GP Connect access should not trigger automatic billing recalculation without a formal review.
```

---

## 19.12 AI-Assisted Billing Anomaly Detection Cases

Leading platforms (Birdie, AlayaCare, WellSky, AxisCare) now include AI-driven anomaly detection for billing. These must be treated as system-generated exceptions requiring human review.

### Cases to Handle

```text
AI flags unusual visit duration (e.g., check-out recorded 3 minutes after check-in)
AI detects carer repeatedly checked in at wrong location
AI detects same service user billed by two providers simultaneously
AI detects rate card mismatch between comparable service users
AI flags sudden spike in mileage claims for one carer
AI predicts authorised hours will be exhausted within 3 days
AI detects unused authorised hours about to expire without visits scheduled
AI detects duplicate invoice across billing periods
AI flags missing MAR chart for a medication visit before billing proceeds
```

### Important Rules

```text
AI-generated flags must create reviewable exceptions, not automatic rejections or approvals.
Admin must review and dismiss or escalate each AI flag with reason and audit trail.
AI suggestions must not override approved manual decisions.
```

### New Exception Codes

```text
AI_ANOMALY_DURATION
AI_ANOMALY_LOCATION
AI_ANOMALY_DUPLICATE_BILLING
AI_ANOMALY_RATE_MISMATCH
AI_HOURS_EXPIRY_WARNING
```

---

## 19.13 Continuity of Carer Billing Cases

Some service users have contractual or care plan expectations around carer continuity. Replacement carer billing must be handled carefully.

### Cases to Handle

```text
Service user has named preferred carer; replacement carer attends instead
Named carer rate differs from replacement carer rate
Service user refuses visit from replacement carer; no-access or missed visit triggered
Continuity broken for more than a configured number of visits; quality alert triggered
Family requests service credit or compensation for continuity breach
```

### Important Rules

```text
Bill at the actual attending carer rate unless the contract specifies named-carer billing.
Continuity breach compensation or credit must use the credit note flow with manager approval.
Continuity breach alerts should feed into billing exception review, not just operations.
```

---

## 19.14 Geographic and Out-of-Area Billing Cases

Care delivered outside the provider's normal area may attract different rates or require a separate contract.

### Cases to Handle

```text
Service user temporarily at a different address (holiday home or family stay)
Carer travels beyond standard geographic zone to reach service user
Out-of-area rate card applied instead of standard rate
Out-of-area visit generates mileage exception
Service user moves to a different LA area; new funder, contract, and rate card required
Cross-border visit (England and Wales or England and Scotland border); different regulatory treatment
Provider holds no contract in the destination LA area
```

### Important Rules

```text
Out-of-area visits must use the correct rate card for the delivery location, not the provider's home location.
If no contract exists in the destination area, flag as CONTRACT_MISSING exception before billing.
Cross-border visits may attract different VAT treatment and must be classified accordingly.
```

### New Exception Codes

```text
OUT_OF_AREA_RATE_MISSING
CROSS_BORDER_CONTRACT_MISSING
```

---

## 19.15 Carer Worker Type and IR35 Contractor Billing Cases

Some providers use self-employed contractors or umbrella company workers. Billing and payroll treatment differs from employees.

### Cases to Handle

```text
Self-employed contractor provides care visit
IR35 determination: inside IR35 (treated as employment income for tax)
IR35 determination: outside IR35 (contractor invoices provider directly)
Umbrella company worker: umbrella invoices provider; provider invoices funder
Staffing agency provides worker: agency invoices provider; provider invoices funder
Carer changes worker type mid-period
Contractor rate differs from employed carer rate for same visit type
Contractor submits own timesheet rather than using the provider system
Agency invoice arrives late; payroll already locked
```

### Important Rules

```text
Contractor payroll lines and employee payroll lines must be in separate payroll runs.
IR35 inside determination requires NMW and tax treatment equivalent to employment.
Agency invoices must be reconciled against visit records before payment.
Do not blend agency invoice cost with internal carer payroll.
```

### New Exception Codes

```text
CONTRACTOR_IR35_STATUS_MISSING
AGENCY_INVOICE_UNRECONCILED
```

---

## 19.16 Supported Living and Shared Cost Billing Cases

Supported living involves shared or individual tenancies. Billing differs from standard domiciliary care.

### Cases to Handle

```text
One worker supports multiple service users simultaneously in shared house
Individual billing per service user for shared support session
Support hours commissioned individually per service user on personal budget
Service user leaves supported living property; final billing period calculated
New service user moves in mid-week; pro-rata billing required
Property-based staffing cost apportioned across all residents
Waking night charged as shared cost or per individual service user
Sleep-in allocated to one named service user or split across residents
Housing cost and care support cost invoiced separately
```

### Important Rules

```text
Housing costs and care support costs must be invoiced separately in supported living.
Shared support session cost must be apportioned per service user with audit trail.
Service user moving in or out mid-week requires pro-rata calculation.
```

### New Exception Codes

```text
SUPPORTED_LIVING_SPLIT_MISSING
```

---

## 19.17 End-of-Life and Palliative Care Billing Cases

End-of-life care often involves rapid CHC Fast Track setup, multi-agency billing, and sensitive final account procedures.

### Cases to Handle

```text
CHC Fast Track authorisation: urgent package setup required within 24 hours
Palliative care visit non-chargeable when funded by a charity or hospice partnership
Hospice at home service billed to NHS ICB
Combined NHS CHC and hospice at home billing in same period
Service user passes away mid-visit; billing period and final charges confirmed
Final invoice generated after service user death
Outstanding invoice at time of death: estate or executor becomes responsible
Family contacts office about final account after bereavement
```

### Important Rules

```text
Fast Track CHC billing setup must be achievable within 24 hours of authorisation.
All recurring charges stop on the confirmed date of death.
Executor or administrator of estate becomes the billing contact for outstanding amounts.
Do not issue new invoices after final account closure except for pre-approved adjustments.
```

### New Exception Codes

```text
FINAL_ACCOUNT_ESTATE_CONTACT_MISSING
FAST_TRACK_CHC_SETUP_OVERDUE
```

---

## 19.18 Respite Care Billing Cases

Respite care provides time-limited support to give the usual carer a break. It may be funded through a separate PO or care package reference.

### Cases to Handle

```text
Respite care funded separately from the main care package under a different PO
Respite care funded by same LA but under a different package reference
Respite in service user's own home
Residential respite: service user temporarily placed in care home
Respite period starts and ends mid-week; pro-rata billing required
Respite visit type charged at a different rate from standard visits
Respite package extended beyond the originally agreed period
Family carer who is also a paid carer: conflict of interest in billing during respite
```

### Important Rules

```text
Respite billing must reference the correct PO and care package code.
Do not mix respite invoice lines with the main care package invoice unless explicitly configured.
When residential respite ends, restore normal domiciliary billing setup immediately.
```

### New Exception Codes

```text
RESPITE_PO_MISSING
```

---

## 19.19 Individual Service Fund (ISF) Cases

An Individual Service Fund is an alternative to direct payment where the provider holds the budget on behalf of the service user.

### Cases to Handle

```text
ISF: provider holds LA or NHS budget on behalf of service user
ISF budget agreed per period (weekly or monthly)
ISF spending tracked per service user against agreed budget
ISF budget underspent: unused balance returned or rolled forward
ISF budget overspent: provider must seek commissioner approval for top-up
ISF reconciliation report required by LA or NHS commissioner at period end
ISF end-of-period statement sent to service user or representative
Service user switches from direct payment to ISF
Service user switches from ISF to direct payment
```

### Important Rules

```text
ISF funds are public money held in trust; strict spending records are required by law.
ISF reconciliation report is a required output, not optional.
Any ISF overspend must receive commissioner approval before a top-up is processed.
```

### New Exception Codes

```text
ISF_BUDGET_OVERSPENT
ISF_RECONCILIATION_MISSING
```

---

## 19.20 Annual Rate Uplift and Bulk Rate Review Cases

Each year, local authorities and NHS commissioners review and update contracted rates. The billing module must support bulk rate change operations safely.

### Cases to Handle

```text
Annual LA rate uplift from 1 April: large number of service users affected simultaneously
New uplift rates agreed late; effective date backdated
Some service types uplifted; others remain flat
Some service users on block contract (rate set by contract); others on spot (affected by uplift)
Provider disagrees with uplift rate; negotiation extends beyond effective date
Draft invoices already created before uplift agreed; bulk recalculation required
Uplift applies to new periods only; old periods remain at old rate
Inflation-linked uplift clause in contract triggers automatic recalculation
Cost-of-living adjustment applied mid-year by commissioner
Rate reduction agreed due to commissioner cost pressure
```

### Bulk Rate Uplift Batch Operation

```text
Select funder or contract scope
Enter new rates and effective date
Preview all affected service users, visit types, and expected changes
Calculate uplift amounts and percentage increase
Require approval before applying
Apply to all future invoices from effective date
Optionally recalculate draft invoices for the affected period
Create individual audit trail for each affected service user and rate rule
```

### Important Rules

```text
Never apply new rate to locked or paid historical invoices without credit note or debit note flow.
Uplift batch must show a preview and require approval before it applies.
Late-agreed uplifts on already-sent invoices must use a debit note, not a silent edit.
```

---

## 19.21 Agency and Sub-Contractor Billing Cases

Some providers sub-contract care delivery to another agency. The billing chain involves both an incoming agency invoice and an outgoing funder invoice.

### Cases to Handle

```text
Provider sub-contracts visit to an external agency
Agency invoices provider for staff hours worked
Provider invoices funder (LA or NHS) at provider rate
Margin between agency invoice and funder invoice tracked internally
Agency worker does not match the expected carer on the rota
Agency invoice arrives late; provider payroll period already locked
Agency rate increases mid-contract
Sub-contracted visit has additional compliance or documentation requirements
Provider invoices funder before receiving and reconciling agency invoice
Provider disputes agency invoice; payment withheld pending resolution
```

### Important Rules

```text
Sub-contracted agency invoices must be reconciled against visit records before payment.
Provider margin is internal finance data only; do not include it on the funder invoice.
Sub-contractor billing and internal employee payroll must be maintained separately.
```

### New Exception Codes

```text
AGENCY_INVOICE_UNRECONCILED
AGENCY_INVOICE_LATE
```

---

## 19.22 GDPR, Data Retention, and Invoice Archiving Cases

Financial records in the UK must be retained for statutory periods. Billing and payroll data has specific retention obligations.

### Cases to Handle

```text
Invoice data must be retained for minimum 6 years (HMRC requirement)
Payroll records must be retained for minimum 3 years (HMRC requirement)
Service user data retained securely after package ends
Data Subject Access Request (DSAR) includes billing records
Service user or family requests copies of all invoices
Data deletion request conflicts with HMRC statutory retention obligation
Audit log must be retained even after invoice is closed or archived
Provider switches software; historical billing data migrated to new system
Provider exits business; records must be preserved and transferred safely
```

### Important Rules

```text
Do not hard-delete financial records within statutory retention periods.
When deletion is requested, apply soft-delete or anonymisation where legally permitted.
Billing data export must remain available for the minimum retention period even after account closure.
DSAR responses must include billing and payroll records.
```

### New Record Statuses

```text
ACTIVE
CLOSED
ARCHIVED
UNDER_LEGAL_HOLD
ANONYMISED
EXPORTED_FOR_MIGRATION
```

### New Exception Codes

```text
GDPR_RETENTION_BLOCK
LEGAL_HOLD_ACTIVE
ARCHIVE_EXPORT_REQUIRED
```

---

## 19.23 Multi-Branch and Franchise Billing Cases

Large providers may operate multiple branches, franchises, or registered locations. Billing must remain correctly attributed to the right branch and contract.

### Cases to Handle

```text
Service user in Branch A receives cover visit from carer registered in Branch B
Invoice attributed to Branch A (which holds the funder contract), not Branch B
Carer pay attributed to carer's home branch for payroll purposes
Franchise model: each franchise invoices independently
Central billing model: head office consolidates and invoices on behalf of all branches
Cross-branch rate card conflict: which branch rate applies?
LA contract held at branch level, not group level
Branch closes mid-contract; service users transferred to another branch
New branch opens and takes over existing contracts
```

### Important Rules

```text
Invoice must be attributed to the branch that holds the funder contract.
Carer pay must be attributed to the carer's home branch for payroll purposes.
Before closing a branch, create a service user transfer event before billing is transferred.
```

---

## 19.24 QA Master Additions for Phase 19

Add to the Phase 18 QA checklist:

### NHS and CHC Funding QA

```text
Create NHS CHC-funded service user; confirm invoice goes to ICB only
Switch service user from LA to CHC mid-month; confirm split invoices created correctly
Create S117 aftercare package; confirm zero charge to service user
Test CHC Direct Payment; confirm invoice goes to service user budget holder
Test CHC Third-Party Budget; confirm invoice goes to the budget-holding organisation
Test CHC combined with FNC flat-rate contribution on same package
```

### Financial Assessment and DPA QA

```text
Create service user awaiting financial assessment; confirm interim rate applied
Apply 12-week property disregard and confirm property excluded from assessment
Set up DPA and confirm deferred interest accrues correctly
Confirm LA does not inherit unpaid self-funder invoices on funding transition
Retrospective credit note applied after backdated financial assessment result
```

### Block and Spot Contract QA

```text
Create block contract with minimum guaranteed hours; under-deliver and confirm minimum invoice generated
Create spot purchase with fixed end date; confirm billing stops on end date automatically
Add framework agreement code; confirm it appears on invoice export
Test off-framework visit creates exception and is not silently billed
```

### DSCR and EVV QA

```text
Confirm billing export matches care record data for same visit
Create EVV time mismatch; confirm billing exception created and not silently overridden
Submit invoice with missing EVV data to EVV-required funder; confirm portal rejection
Confirm GP Connect access is logged for audit
Migrate DSCR; confirm billing history is preserved with no silent changes
```

### AI Anomaly QA

```text
Trigger AI anomaly flag for unusual visit duration; confirm admin review required before billing proceeds
Trigger AI duplicate invoice flag; confirm exception raised, not auto-rejected
Trigger AI hours expiry warning; confirm coordinator notification sent
```

### Supported Living and End-of-Life QA

```text
Create shared supported living visit for three service users; confirm per-service-user billing
Create CHC Fast Track package; confirm billing setup completed within 24 hours
Confirm all recurring charges stop on date of service user death
Generate final account for deceased service user; confirm estate billing contact required
```

### GDPR and Retention QA

```text
Submit DSAR for a service user; confirm billing records included in export
Attempt hard-delete of invoice within 6-year retention period; confirm system blocks the action
Archive a closed package; confirm read-only access retained for audit purposes
```

---

## 19.25 New Database Entities for Phase 15

### NHS and CHC Tables

```text
nhs_chc_eligibility_records
chc_funding_periods
chc_rate_cards
phb_budgets
phb_budget_periods
phb_spending_records
s117_aftercare_records
integrated_personal_budgets
joint_funding_splits
joint_commissioning_agreements
```

### Financial Assessment Tables

```text
local_authority_financial_assessments
means_test_results
deferred_payment_agreements
dpa_accrued_interest
dpa_administration_charges
twelve_week_property_disregards
self_funder_reclassification_events
```

### Contract and Framework Tables

```text
block_contracts
block_contract_volumes
spot_purchase_orders
framework_agreements
framework_agreement_rates
sub_contractor_invoices
sub_contractor_payments
```

### EVV Tables

```text
evv_records
evv_location_logs
evv_time_logs
evv_mismatch_exceptions
evv_funder_requirements
```

### ISF and Budget Tables

```text
individual_service_funds
isf_budget_periods
isf_spending_records
isf_reconciliation_reports
```

### Compliance and Retention Tables

```text
gdpr_retention_policies
dsar_requests
dsar_exports
data_deletion_requests
legal_hold_records
archive_export_jobs
ai_anomaly_flags
ai_anomaly_flag_reviews
```

### Multi-Branch Tables

```text
branch_closures
service_user_branch_transfers
cross_branch_visit_logs
```

---

## 19.26 New Exception Codes — Complete List for Phase 19

```text
CHC_ELIGIBILITY_MISSING
CHC_RATE_CARD_MISSING
S117_STATUS_DISPUTED
PHB_BUDGET_EXCEEDED
PHB_SPENDING_NOT_APPROVED
PHB_TRANSFER_PENDING
INTEGRATED_BUDGET_SPLIT_MISSING
FINANCIAL_ASSESSMENT_PENDING
DPA_EQUITY_LIMIT_APPROACHING
SELF_FUNDER_RECLASSIFIED
MEANS_TEST_RESULT_DISPUTED
BLOCK_CONTRACT_UNDER_DELIVERY
SPOT_PURCHASE_EXPIRED
FRAMEWORK_CODE_MISSING
OFF_FRAMEWORK_VISIT
EVV_TIME_MISMATCH
EVV_LOCATION_MISMATCH
EVV_DATA_MISSING
EVV_REQUIRED_BY_FUNDER
AI_ANOMALY_DURATION
AI_ANOMALY_LOCATION
AI_ANOMALY_DUPLICATE_BILLING
AI_ANOMALY_RATE_MISMATCH
AI_HOURS_EXPIRY_WARNING
ISF_BUDGET_OVERSPENT
ISF_RECONCILIATION_MISSING
CONTRACTOR_IR35_STATUS_MISSING
AGENCY_INVOICE_UNRECONCILED
AGENCY_INVOICE_LATE
OUT_OF_AREA_RATE_MISSING
CROSS_BORDER_CONTRACT_MISSING
GDPR_RETENTION_BLOCK
LEGAL_HOLD_ACTIVE
ARCHIVE_EXPORT_REQUIRED
RESPITE_PO_MISSING
SUPPORTED_LIVING_SPLIT_MISSING
FINAL_ACCOUNT_ESTATE_CONTACT_MISSING
FAST_TRACK_CHC_SETUP_OVERDUE
```

---

## 19.27 Updated Final Rules

The following rules are added to the Final Rules Summary in the document:

```text
14. NHS CHC is not means-tested. Invoice goes to ICB only, not to service user or family.
15. S117 aftercare must never be charged to the service user under any circumstances.
16. PHB, DPA, ISF, and integrated budget billing each require a distinct contract type and invoice line classification.
17. Block contract minimum volumes must be invoiced even when under-delivered, unless the contract explicitly states otherwise.
18. EVV mismatch must create a billing exception and must not silently override reconciled approved time.
19. AI-generated billing anomaly flags must create reviewable exceptions requiring admin action; they must not trigger automatic decisions.
20. Financial records must not be hard-deleted within statutory HMRC and regulatory retention periods.
21. Self-funder-to-LA transitions may require retrospective billing adjustments; always use credit note or adjustment flow.
22. Sub-contractor and agency invoices must be reconciled against visit records before payment is released.
23. Cross-border and out-of-area visits require explicit rate card and contract validation before billing proceeds.
24. Annual rate uplift must use a batch preview-and-approve workflow; locked or paid historical invoices must never be silently updated.
25. CHC Fast Track billing setup must be achievable within 24 hours of clinical authorisation.
26. DPA debt is deferred against the service user's property; it is not forgiven. LA does not inherit unpaid self-funder invoices.
27. GP Connect access is for direct care purposes only; log every access event for audit.
28. DSCR migration must preserve complete billing history with no silent changes to invoice or payroll data.
```

---

## 19.28 Updated Build Flow

Add Phase 19 to the Final Recommended Build Flow:

```text
Phase 19: NHS CHC, PHB, S117, DPA, block/spot contracts, EVV, DSCR, AI anomaly, ISF, GDPR retention
```


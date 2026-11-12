/**
 * Short answers to "how do I…" questions: what to do, and a link to the place. `words` are other ways people
 * ask. Shown only to people who can open that page (its route's permission, from the catalogue; or `permissions`).
 * Add one whenever someone asks "where do I…?".
 */
export type HowToAnswer = {
  question: string
  answer: string
  href: string
  search?: Record<string, string>
  /** Text on the page to scroll to and highlight. */
  highlight?: string
  words?: string
  permissions?: string[]
}

export const HOW_TO_ANSWERS: HowToAnswer[] = [
  // ─── People we support ─────────────────────────────────────────────────────
  { question: 'How do I add a new service user?', answer: 'Service Users › Add Service User. Fill in their details; the care plan and visits come after.', href: '/service-users/add', words: 'create client register new person admit' },
  { question: 'How do I record an initial assessment?', answer: 'Open Initial Assessment, choose the person, and fill in the form. A manager reviews it from the review queue.', href: '/service-users/initial-assessment', words: 'ia pre assessment needs assessment new client' },
  { question: 'How do I set up a service user’s visits?', answer: 'Open the service user, then Visit Plan: set the call pattern; the rota is built from it.', href: '/service-users/all', words: 'call pattern visit plan schedule visits times' },
  { question: 'How do I write or review a care plan?', answer: 'Open the service user, then Care Plan. Reviews that are due are listed in Care plan reviews.', href: '/care-plans/reviews', words: 'support plan review care plan update' },
  { question: 'How do I see missed or refused medication?', answer: 'Medication › Missed & refused doses lists every dose not given, with the reason.', href: '/medication/exceptions', words: 'mar missed meds refused medicine not given' },
  { question: 'How do I upload a document for a service user?', answer: 'Open the service user, then Documents, and add the file. Its text becomes searchable within a minute.', href: '/service-users/all', words: 'upload file attach pdf letter' },
  { question: 'How do I give a family member access to the portal?', answer: 'Service user portal access: add the family member and choose what they can see.', href: '/admin/service-user-portal', words: 'family portal relative login next of kin access' },
  // ─── Staff ─────────────────────────────────────────────────────────────────
  { question: 'How do I add a new member of staff?', answer: 'Staff › Add Employee. After saving, add their compliance documents, pay card and working pattern.', href: '/employee/add', words: 'new carer employee hire onboard starter' },
  { question: 'How do I see whose DBS or right to work is expiring?', answer: 'The Compliance board shows every staff check and what is due or expired.', href: '/employee/compliance', words: 'dbs right to work visa expiry expired checks compliance' },
  { question: 'How do I record staff holiday or sickness?', answer: 'Absence tracker: add the absence; the rota shows them as unavailable.', href: '/employee/absences', words: 'holiday annual leave sickness sick time off absence' },
  { question: 'How do I approve staff hours?', answer: 'Hours approvals lists hours waiting for a manager. Approve or send back with a reason.', href: '/hours-approvals', words: 'timesheets hours approve overtime' },
  { question: 'How do I add a job candidate?', answer: 'HR › Candidates: add them and move them through the stages; hire converts them to staff.', href: '/hr/candidates', words: 'recruitment applicant hiring interview' },
  { question: 'How do I give an inspector temporary access?', answer: 'Temporary Inspector Login: create a time-limited login for the inspector.', href: '/employee/temp-inspector', words: 'cqc inspector inspection temporary login access auditor' },
  // ─── Rota and visits ───────────────────────────────────────────────────────
  { question: 'How do I build the rota?', answer: 'Build Schedule: pick the week and area, then allocate carers to visits.', href: '/scheduling/build', words: 'rota schedule allocate carers shifts plan week' },
  { question: 'How do I see late or missed visits right now?', answer: 'ECM live monitoring shows visits that are late, missed or not checked in.', href: '/ecm/live', words: 'late visits missed calls ecm live monitoring check in' },
  { question: 'How do I set the on-call rota?', answer: 'On-call rota: choose who is on call for each day and time.', href: '/on-call/rota', words: 'on call out of hours emergency rota' },
  // ─── Quality and safety ────────────────────────────────────────────────────
  { question: 'How do I report an incident or accident?', answer: 'Raise incident: describe what happened; managers are alerted for serious ones.', href: '/incidents/raise', words: 'accident fall injury near miss report incident' },
  { question: 'How do I raise a safeguarding concern?', answer: 'Safeguarding: start a new case and record the concern and immediate safety steps.', href: '/safeguarding', words: 'abuse neglect harm concern safeguarding referral' },
  { question: 'How do I record a complaint or compliment?', answer: 'Complaints & Compliments: add it, then track the response and outcome.', href: '/incidents/feedback', words: 'complaint compliment feedback concern grumble' },
  { question: 'How do I send a survey?', answer: 'Surveys: create one or start from a ready-made survey, choose who gets it and send.', href: '/surveys', words: 'questionnaire feedback survey send quality' },
  { question: 'How do I add an independent reviewer for a survey?', answer: 'Independent reviewers › Add a reviewer: choose the surveys, then a reviewer added before, a new one, or staff who run surveys.', href: '/surveys/reviewers', words: 'external evaluator reviewer independent survey' },
  { question: 'How do I record answers someone gave on paper or by phone?', answer: 'Surveys to collect lists the people still to answer; record their answers there.', href: '/surveys/to-collect', words: 'paper phone survey answers record collect' },
  { question: 'How do I add a policy?', answer: 'Policy Library › Create policy, or start from Ready-made policies, then ask staff to read it.', href: '/policies/new', words: 'policy procedure sop handbook new policy' },
  { question: 'How do I see who has read a policy?', answer: 'Open the policy in the Policy Library: it shows who has read and agreed to it.', href: '/policies', words: 'acknowledge read policy signed agreed' },
  // ─── Training ──────────────────────────────────────────────────────────────
  { question: 'How do I add a training course?', answer: 'Learning › New course: build it, then assign it to staff or roles.', href: '/learning/courses/new', words: 'training course e-learning create course' },
  { question: 'How do I see who is behind on training?', answer: 'Learning compliance shows overdue and expiring training for each person.', href: '/learning/compliance', words: 'training overdue expired certificates compliance' },
  // ─── Money ─────────────────────────────────────────────────────────────────
  { question: 'How do I run invoices?', answer: 'Invoice runs: choose the period and funders, check, then finalise.', href: '/billing/invoice-runs', words: 'invoice billing bill funders run invoices' },
  { question: 'How do I pay carers for visits?', answer: 'Visit pay runs: run pay for the period from completed visits and pay cards.', href: '/billing/payroll-runs', words: 'pay carers wages payroll run visit pay' },
  { question: 'How do I set pay rates?', answer: 'Billing Management › Pay cards: set rates by time, day and type of visit.', href: '/billing', search: { tab: 'pay-cards' }, words: 'pay rate pay card hourly rate wages' },
  { question: 'How do I set what we charge funders?', answer: 'Billing Management › Charge cards: set charge rates for each funder.', href: '/billing', search: { tab: 'charge-cards' }, words: 'charge rate funder price council' },
  // ─── Referrals ─────────────────────────────────────────────────────────────
  { question: 'How do I add an enquiry or referral?', answer: 'New enquiry or referral: record the person and their needs; quote and convert to a service user when agreed.', href: '/crm/new', words: 'enquiry referral lead new client crm' },
  { question: 'How do referral emails come in?', answer: 'The Referral inbox collects referral emails from your mailboxes and suggests the details to record.', href: '/crm/referral-inbox', words: 'referral email inbox mailbox' },
  // ─── Settings and access ───────────────────────────────────────────────────
  { question: 'How do I add an office user?', answer: 'Roles & permissions › Office users: invite them and choose their role and branches.', href: '/settings/roles-permissions', search: { sub: 'office-users' }, words: 'invite user office login account manager' },
  { question: 'How do I change what a role can do?', answer: 'Roles & permissions › Roles: tick the responsibilities the role has.', href: '/settings/roles-permissions', search: { sub: 'roles' }, words: 'role permissions access responsibilities rights' },
  { question: 'How do I limit how many devices someone can sign in on?', answer: 'General Settings › App Setting: “Office website sign-in” and “Care app sign-in” set more than one device, and how many.', href: '/settings/general', search: { tab: 'app-setting' }, highlight: 'Allow multiple device login?', words: 'devices logged out signed out sign in login multiple devices phone' },
  { question: 'Why was I signed out?', answer: 'Usually because the account signed in on another device over your organisation’s limit, or the password changed. See General Settings › App Setting.', href: '/settings/general', search: { tab: 'app-setting' }, highlight: 'Allow multiple device login?', words: 'logged out signed out kicked out unauthorized session' },
  { question: 'How do I change my password?', answer: 'My account: change your password. You stay signed in on this device; other devices are signed out.', href: '/account', words: 'password reset change my password account' },
  { question: 'How do I add a branch or office?', answer: 'Location Management: add the branch and its areas.', href: '/settings/location-management', words: 'branch office location area zone new branch' },
  { question: 'How do I change our company name or logo?', answer: 'Company Details: name, address, logo and contact details.', href: '/settings/company', words: 'company logo name address branding details' },
  { question: 'How do I add a funder or local authority?', answer: 'Settings › Funders: add the funder; then set its charge card in Billing.', href: '/settings', search: { tab: 'funders' }, words: 'funder council local authority nhs commissioner' },
  { question: 'How do I change the drop-down lists (lookups)?', answer: 'Settings holds every list: job titles, skills, care types, reasons and more, each on its own tab.', href: '/settings', words: 'lookups lists dropdown options job titles reasons' },
  { question: 'How do I see who changed something?', answer: 'The Audit log records who did what and when, with before and after values.', href: '/admin/audit', words: 'audit log history who changed trail' },
  { question: 'How do I set up email and text messages?', answer: 'Message delivery: choose how emails and texts are sent, and test them.', href: '/message-delivery', words: 'email sms text messages delivery notifications' },
]

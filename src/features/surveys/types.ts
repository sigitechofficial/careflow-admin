export type SurveyTargetKind = 'EMPLOYEE' | 'SERVICE_USER' | 'PUBLIC'

/** Same as the API: an anonymous survey is sent / opened only for at least this many people. */
export const MIN_ANONYMOUS_RECIPIENTS = 5

/** The choice offered on named surveys that allow it (same words in the carer app). */
export const ANSWER_WITHOUT_NAME_LABEL = 'Answer without my name — we will not be able to reply to you'
export const ANSWER_WITH_NAME_LABEL = 'Answer with my name'
/** Said with the choice (same words as the API sends the carer app): their survey still turns Completed. */
export const ANSWER_WITHOUT_NAME_NOTE = 'Staff can see that you have answered, but not which answers are yours.'
export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

/** How a survey's status reads on screen. */
export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Open',
  CLOSED: 'Closed',
}
export type SurveyRecurrence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export const SURVEY_TARGET_KIND_LABELS: Record<SurveyTargetKind, string> = {
  EMPLOYEE: 'Employees',
  SERVICE_USER: 'Service users',
  PUBLIC: 'Public',
}

/** Who answered a service-user survey. */
export type SurveyRespondentRelation = 'SELF' | 'FAMILY_MEMBER' | 'REPRESENTATIVE' | 'STAFF'

export const SURVEY_RESPONDENT_RELATION_LABELS: Record<SurveyRespondentRelation, string> = {
  SELF: 'The service user',
  FAMILY_MEMBER: 'Family member',
  REPRESENTATIVE: 'Representative',
  STAFF: 'Staff on their behalf',
}

/** "Answered by" for a survey's audience: SELF is the employee on staff surveys, not "the service user". */
export function surveyRespondentRelationLabel(
  relation: SurveyRespondentRelation,
  targetKind: SurveyTargetKind | null | undefined,
): string {
  if (relation === 'SELF') {
    if (targetKind === 'EMPLOYEE') return 'The employee'
    if (targetKind === 'PUBLIC') return 'The respondent'
  }
  return SURVEY_RESPONDENT_RELATION_LABELS[relation]
}

/** How a response was collected. Telephone / paper / in person are recorded by office staff. */
export type SurveyResponseChannel = 'ONLINE' | 'PORTAL' | 'TELEPHONE' | 'PAPER' | 'IN_PERSON'

export const SURVEY_RESPONSE_CHANNEL_LABELS: Record<SurveyResponseChannel, string> = {
  ONLINE: 'Online',
  PORTAL: 'Portal',
  TELEPHONE: 'Telephone',
  PAPER: 'Paper',
  IN_PERSON: 'In person',
}

export type StaffRecordedChannel = 'TELEPHONE' | 'PAPER' | 'IN_PERSON'

export const SURVEY_RECURRENCE_LABELS: Record<SurveyRecurrence, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
}

export type SurveyQuestionType =
  | 'YES_NO'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'RATING'
  | 'LIKERT'

export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  YES_NO: 'Yes / No',
  SINGLE_SELECT: 'Single choice',
  MULTI_SELECT: 'Multiple choice',
  TEXT: 'Short text',
  TEXTAREA: 'Long text',
  NUMBER: 'Number',
  RATING: 'Rating scale',
  LIKERT: 'Labelled scale',
}

/** Question types whose answers come from a list of options. */
export const CHOICE_QUESTION_TYPES: SurveyQuestionType[] = ['SINGLE_SELECT', 'MULTI_SELECT']

/** "Other (please tell us)" on a single / multiple choice question: choosing it shows a text box. */
export type SurveyOtherOption = { label: string; textPrompt: string; textRequired: boolean }
/** A comment box alongside the answer; showWhen null = after any answer. */
export type SurveyCommentConfig = { prompt: string; showWhen: string[] | null }
/** Ask the question only when an earlier question (by key) has one of these answers. */
export type SurveyShowIf = { questionKey: string; answers: string[]; questionId?: string | null }

/** Respondent text, the "Other" text and comments, at most this long (same as the API). */
export const MAX_RESPONDENT_TEXT = 2000

/** Settings for respondent text and conditional questions, on every question payload. */
export type SurveyQuestionLogic = {
  /** Stable reference within the survey ("Show only if" rules point at it). */
  key?: string | null
  otherOption?: SurveyOtherOption | null
  /** MULTI_SELECT: options that clear every other tick ("None of these"). */
  exclusiveOptions?: string[]
  commentConfig?: SurveyCommentConfig | null
  showIf?: SurveyShowIf | null
}

export type SurveyListItem = {
  id: string
  title: string
  description: string | null
  targetKind: SurveyTargetKind
  /** Who it's for (e.g. FAMILIES; SEVERAL asks "Who are you?"), its label, and Other in words. */
  audienceGroup?: string | null
  audienceGroupOther?: string | null
  audienceGroupLabel?: string | null
  status: SurveyStatus
  isAnonymous: boolean
  opensAt: string | null
  closesAt: string | null
  publishedAt: string | null
  distributeAt: string | null
  distributedAt: string | null
  recurrence: SurveyRecurrence | null
  /** Sent when something happens in the care records (the event code); null = not. */
  eventTrigger?: string | null
  clonedFromId: string | null
  periodKey: string | null
  periodOpenDays: number | null
  recurrenceAnchorAt: string | null
  distributionFailedAt: string | null
  distributionError: string | null
  locationIds: string[]
  roleIds: string[]
  /** Scheduled send: chosen employees (empty = everyone in the audience). */
  audienceEmployeeIds: string[]
  /** Scheduled send: chosen people we support (empty = everyone in the branches). */
  audienceServiceUserIds?: string[]
  isTemplate: boolean
  /** The shared link: public surveys, and staff / service-user surveys with it turned on; else null. */
  shareToken: string | null
  sharedLinkEnabled?: boolean
  questionCount: number
  recipientCount: number
  /** Null when answer counts are restricted to people who may see the results. */
  completedCount: number | null
  responseCount: number | null
  /** Per-survey access: this viewer may not see how many answered. */
  countsRestricted?: boolean
  /** Repeating survey: how many period copies exist. */
  periodCount: number
  responseRate: number
  createdById: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
  /** Shared company template seen by a branch-restricted user: view and "Use" only. */
  readOnly?: boolean
  /** Closed by CareFlow when its end date passed (not by someone). */
  closedAtEndDate?: boolean
  /** Ready-made reference (e.g. SUR-PWS-001): adopted templates and surveys started from them. */
  libraryReference?: string | null
  libraryRevision?: number | null
  /** Adopted template only: the ready-made survey it was added from. */
  librarySourceId?: string | null
  /** The template this survey was started from (kept on duplicates). */
  createdFromTemplateId?: string | null
  /** Ready-made origin: anonymity follows the ready-made survey and cannot be changed. */
  anonymityLocked?: boolean
  /** Named survey: people may choose to answer without their name. */
  allowAnonymousResponses?: boolean
}

export type SurveyQuestion = {
  id: string
  questionText: string
  helpText: string | null
  questionType: SurveyQuestionType
  options: string[] | null
  /** Options from a CareFlow list (ETHNICITY …); `options` then holds its entries in use. */
  optionsFrom?: string | null
  optionGroups?: Array<{ group: string; options: Array<{ code: string; label: string }> }>
  config: Record<string, unknown> | null
  isRequired: boolean
  sortOrder: number
  /** Heading of the section the question sits in (ready-made surveys); null = no heading. */
  sectionTitle?: string | null
  /** Answers given to this question (it cannot be removed once answered). */
  answerCount?: number
  /** "Would you like someone to contact you…": not asked of someone answering without their name. */
  contactRequest?: boolean
} & SurveyQuestionLogic

/** What the signed-in user may see of a survey's answers (per-survey access). */
export type SurveyViewerAccess = {
  results: boolean
  responses: boolean
  configure: boolean
  restricted: boolean
  reportingThreshold: number
}

export type SurveyDetail = {
  viewerAccess?: SurveyViewerAccess
  audienceGroup?: string | null
  audienceGroupOther?: string | null
  audienceGroupLabel?: string | null
  id: string
  title: string
  description: string | null
  /** Shown to people after they submit (the closing screen); null = the thank-you only. */
  closingMessage?: string | null
  targetKind: SurveyTargetKind
  status: SurveyStatus
  isAnonymous: boolean
  opensAt: string | null
  closesAt: string | null
  publishedAt: string | null
  distributeAt: string | null
  distributedAt: string | null
  recurrence: SurveyRecurrence | null
  /** Sent when something happens in the care records (the event code); null = not. */
  eventTrigger?: string | null
  clonedFromId: string | null
  clonedFromTitle: string | null
  /** Shared company template seen by a branch-restricted user: view and "Use" only. */
  readOnly?: boolean
  /** Closed by CareFlow when its end date passed (not by someone). */
  closedAtEndDate?: boolean
  periodKey: string | null
  periodOpenDays: number | null
  recurrenceAnchorAt: string | null
  distributionFailedAt: string | null
  distributionError: string | null
  locationIds: string[]
  roleIds: string[]
  audienceEmployeeIds: string[]
  audienceServiceUserIds?: string[]
  isTemplate: boolean
  /** Ready-made reference (e.g. SUR-PWS-001): adopted templates and surveys started from them. */
  libraryReference?: string | null
  libraryRevision?: number | null
  /** Adopted template only: the ready-made survey it was added from. */
  librarySourceId?: string | null
  /** The template this survey was started from (kept on duplicates). */
  createdFromTemplateId?: string | null
  /** Ready-made origin: anonymity follows the ready-made survey and cannot be changed. */
  anonymityLocked?: boolean
  /** Named survey: people may choose to answer without their name. */
  allowAnonymousResponses?: boolean
  /**
   * Why that choice cannot be turned off: the ready-made survey promises it ('library'), or people
   * have been offered it ('sent'). null = it can be.
   */
  anonymousChoiceFixed?: 'library' | 'sent' | null
  /** The shared link: public surveys, and staff / service-user surveys with it turned on; else null. */
  shareToken: string | null
  /** Staff and service-user surveys: also answerable through one shared link (public: always true). */
  sharedLinkEnabled?: boolean
  /** Shared link: one answer per device. */
  sharedLinkOncePerDevice?: boolean
  createdById: string | null
  createdByName: string | null
  scheduledByName: string | null
  createdAt: string
  updatedAt: string
  recipientCount: number
  /** Null when answer counts are restricted to people who may see the results. */
  responseCount: number | null
  countsRestricted?: boolean
  periodCount: number
  /** Someone has answered: questions keep their wording, type and options (help text can change). */
  questionsLocked: boolean
  /** Introductions shown under section headings to people answering: { [sectionTitle]: text }. */
  sectionIntros?: Record<string, string>
  /** Headings used on questions that are not next to each other (the heading shows twice). */
  splitSections?: string[]
  /** Sent or answered: anonymity, audience type and branches are fixed. */
  settingsLocked: boolean
  questions: SurveyQuestion[]
}

export type SurveyQuestionOptionSummary = {
  label: string
  count: number
  /** Of the people who gave a counted answer; null for an answer marked "Not counted in percentages". */
  percent: number | null
  /** Marked "Not counted in percentages" (e.g. Don't know): its count is shown on its own. */
  notCounted?: boolean
}

/** Agreement / frequency / rating scales: the share who chose one of the top two answers. */
export type SurveyTopTwo = {
  /** e.g. ["Very good", "Good"]. */
  labels: string[]
  positive: number
  /** People who chose an answer on the scale (Don't know and answers not counted are left out). */
  base: number
  percent: number | null
}

/**
 * Repeating survey ("All periods"): `reworded` = answers to an earlier wording (or type) of a
 * question still on the survey; `removed` = answers to a question since taken off.
 */
export type SurveyQuestionSummaryStatus = 'current' | 'reworded' | 'removed'

export type SurveyQuestionSummary = {
  /** CareFlow-list (equality) questions: options are group headings; detail where enough chose it. */
  optionsFrom?: string | null
  lookupDetails?: Array<{ group: string; label: string; count: number }>
  lookupDetailsNote?: string | null
  questionId: string
  questionText: string
  questionType: SurveyQuestionType
  sortOrder: number
  sectionTitle?: string | null
  answerCount: number
  /** Choice questions: people who gave at least one counted answer (the base of the percentages). */
  countedAnswers?: number
  options?: SurveyQuestionOptionSummary[]
  /** Scale questions on a standard scale: "N% said Always or Usually"; null otherwise. */
  topTwo?: SurveyTopTwo | null
  numeric?: { average: number | null; min: number | null; max: number | null }
  textSamples?: string[]
  /** People's own words: "Other" text and comments, newest first (names on named surveys only). */
  writtenAnswers?: SurveyWrittenAnswer[]
  writtenAnswerCount?: number
  /**
   * Anonymous survey: some written answers (Other text, comments, text answers) are held back — shown
   * once the survey (or period) has closed with at least 5 responses.
   */
  writtenAnswersWithheld?: boolean
  status?: SurveyQuestionSummaryStatus
  /** Reworded: how the question reads now. */
  currentQuestionText?: string | null
  /** Retired questions: the periods they were asked in (oldest first). */
  askedIn?: { id: string; title: string; periodKey: string | null }[]
}

export type SurveyWrittenAnswer = {
  /** What they answered, e.g. "Never". */
  answer: string | null
  otherText: string | null
  comment: string | null
  /** Named surveys only; never set on anonymous surveys. */
  respondentName: string | null
}

export type SurveyPeriod = {
  id: string
  title: string
  periodKey: string | null
  opensAt: string | null
  closesAt: string | null
  status: SurveyStatus
  recipients: number
  completed: number
  responses: number
  /** Named surveys: responses given without a name in this period. */
  answeredWithoutName?: number | null
}

export type SurveyBreakdownGroup = { key: string; label: string; responses: number }

export type SurveyBreakdown = {
  /** branch / jobTitle: responses by group; channel / respondent: how people answered. */
  dimension: 'branch' | 'jobTitle' | 'channel' | 'respondent'
  groups: SurveyBreakdownGroup[]
  /** Withheld to protect anonymity (fewer than 5 responses, or groups that small). */
  suppressed: boolean
  note: string | null
}

export type SurveyResults = {
  /** Shared links: days with unusually many answers through them (possible ballot-stuffing). */
  sharedLinkCaution?: { days: Array<{ day: string; answers: number }>; note: string | null } | null
  audienceGroupLabel?: string | null
  /** Several groups: answers to "Who are you?" (count null under the threshold), and the group shown. */
  respondentGroups?: Array<{ label: string; responses: number | null }>
  respondentGroup?: string | null
  /** All periods: periods with too few answers, left out of every figure. */
  periodsLeftOut?: number
  periodsLeftOutNote?: string | null
  /** Reporting threshold: below it no question figures, headline or breakdowns are returned. */
  reporting?: { threshold: number; counted: number; belowThreshold: boolean; note: string | null }
  access?: { responses: boolean; results: boolean; configure: boolean }
  /** Set when the viewer may see the figures but not individual responses or written answers. */
  writtenAnswersRestrictedNote?: string | null
  isAnonymous?: boolean
  recipients: number
  completed: number
  /** All answers, including shared-link and staff-recorded ones without a recipient. */
  responses?: number
  responseRate: number
  /** Named surveys: responses given without a name (online, or recorded by staff without one). */
  answeredWithoutName?: number | null
  /** Their share of all responses, whole per cent. */
  answeredWithoutNamePercent?: number | null
  /** Named survey that lets people choose to answer without their name. */
  allowAnonymousResponses?: boolean
  /** Answers given without a name left out of the question figures (still open, or fewer than 5 answered that way). */
  withoutNameAnswersHeldBack?: number
  withoutNameAnswersNote?: string | null
  /** Responses counted above whose answers are not in the figures yet (unlinked answers are added in batches). */
  responsesBeingAdded?: number
  responsesBeingAddedNote?: string | null
  includesPeriodRuns?: boolean
  /** Repeating survey: each period copy, newest first. */
  periods?: SurveyPeriod[]
  questionSummaries?: SurveyQuestionSummary[]
  /** Why some written answers are not shown (anonymous surveys); null when all are. */
  writtenAnswersNote?: string | null
  breakdowns?: SurveyBreakdown[]
  /** Who took part, as totals only. */
  participation?: SurveyParticipation
  /** The overall-experience question: "N% said Very good or Good"; null without one (or answers). */
  headline?: (SurveyTopTwo & { questionId: string; questionText: string }) | null
  /** By channel and (service-user surveys) who answered; small groups combined or withheld on anonymous surveys. */
  howPeopleAnswered?: SurveyBreakdown[]
}

export type SurveyParticipation = {
  /** Everyone it was sent to; null on public surveys (there is no list). */
  sentTo: number | null
  /** All responses, every channel. */
  answered: number
  /** People it was sent to who answered (the response rate's top half); null on public surveys. */
  answeredFromSent: number | null
  responseRate: number | null
  /** Opened the survey but have not sent their answers (nothing half-answered is saved). */
  openedNotFinished: number | null
  /** Not opened yet. */
  notOpened: number | null
  /** Public surveys only. */
  answeredThroughLink: number | null
  /** Staff and service-user surveys: answered through the shared link (a count only). */
  answeredThroughSharedLink?: number | null
  recordedByStaff: number | null
  /** Over the responses in the figures, counting only the questions that applied to each person. */
  answeredEveryQuestion: number
  skippedSomeQuestions: number
  /** Responses whose answers are in the figures (some can be waiting to be added, or held back). */
  responsesInFigures: number
}

export type SurveyResponseAnswer = {
  questionId: string
  questionText: string
  questionType: SurveyQuestionType
  sectionTitle?: string | null
  booleanValue: boolean | null
  textValue: string | null
  numberValue: number | null
  selectedOptions: string[] | null
  /** The respondent's own words: their "Other" answer and their comment. */
  otherText?: string | null
  comment?: string | null
  /** Written parts held back to protect anonymity; they are kept as they are when the response is edited. */
  withheldFields?: Array<'textValue' | 'otherText' | 'comment'>
  /** A CareFlow-list (equality) answer linked to no one: only its group (or "Not shown") is given, never the answer. */
  lookupGroupOnly?: boolean
  displayValue: string
}

export type SurveyResponseItem = {
  id: string
  surveyId?: string
  /** Repeating survey: which period this answer belongs to. */
  periodTitle?: string | null
  submittedAt: string
  /** Anonymous surveys keep only the date of an answer. */
  submittedDateOnly?: boolean
  respondentLabel: string
  employeeId: string | null
  serviceUserId?: string | null
  respondentRelation?: SurveyRespondentRelation | null
  respondentName?: string | null
  channel?: SurveyResponseChannel
  /** This response is not linked to anyone. */
  isAnonymous?: boolean
  /** Named survey: the person chose to answer without their name (online). */
  answeredWithoutName?: boolean
  /** Office user who recorded it (telephone / paper / in person). */
  recordedByName?: string | null
  contactedAt?: string | null
  contactNumber?: string | null
  contactNotes?: string | null
  /** Anonymous recording: its notes are held back with its written answers (kept as they are when edited). */
  contactNotesWithheld?: boolean
  consentGiven?: boolean | null
  /** Staff-recorded responses can be corrected (with a reason). */
  canEdit?: boolean
  /** Some written answers in this response are held back (anonymous survey). */
  writtenAnswersWithheld?: boolean
  answerCount: number
  answers: SurveyResponseAnswer[]
}

/** A person a response can be recorded for. */
export type SurveyRecordCandidate = {
  id: string
  name: string
  recipientStatus: SurveyRecipientStatus | null
  hasResponse: boolean
  /** Anonymous survey: whether this person has answered is never shown. */
  statusHidden?: boolean
  /** People we support on named surveys: whether they can answer in the portal (null otherwise). */
  hasPortal?: boolean | null
  /** People we support whose care has ended (discharged): shown as "Care ended". */
  careEnded?: boolean | null
}

/** A person we support who can be chosen when sending a survey. */
export type SurveySendCandidate = {
  id: string
  name: string
  hasPortal: boolean
  /** Care has ended (discharged): can still be chosen, for the "When your care ends" survey. */
  careEnded?: boolean
  /** Named surveys: already sent to them. Anonymous surveys never say (null). */
  alreadySent: boolean | null
}

type RecordedResponseDetails = {
  answers: SurveyAnswerInput[]
  respondentRelation?: SurveyRespondentRelation
  respondentName?: string
  contactedAt?: string
  contactNumber?: string
  contactNotes?: string
}

export type RecordSurveyResponseInput = RecordedResponseDetails & {
  channel: StaffRecordedChannel
  isAnonymous?: boolean
  personId?: string
  consentGiven?: boolean
}

export type UpdateRecordedSurveyResponseInput = RecordedResponseDetails & { reason: string }

export type SurveyResponsesPayload = {
  isAnonymous: boolean
  total: number
  /** Named surveys: responses not linked to anyone (given or recorded without a name). */
  answeredWithoutName?: number | null
  /** Responses given without a name not listed yet (still open, or fewer than 5 answered that way). */
  withoutNameAnswersHeldBack?: number
  withoutNameAnswersNote?: string | null
  /** Responses counted in the total but not listed yet (unlinked answers are added in batches). */
  responsesBeingAdded?: number
  responsesBeingAddedNote?: string | null
  /** Why written answers are not shown (anonymous surveys); null when nothing is held back. */
  writtenAnswersNote?: string | null
  responses: SurveyResponseItem[]
}

/** LAPSED: not answered, and the person can no longer be sent it (died, care ended, left…). */
export type SurveyRecipientStatus = 'PENDING' | 'SENT' | 'STARTED' | 'COMPLETED' | 'LAPSED'

export type SurveyRecipientItem = {
  id: string
  status: SurveyRecipientStatus
  employeeId: string | null
  employeeName: string | null
  /** An outside person (named public surveys): their name and organisation. */
  externalName?: string | null
  serviceUserId: string | null
  serviceUserName: string | null
  sentAt: string | null
  submittedAt: string | null
  respondentRelation: SurveyRespondentRelation | null
  respondentName: string | null
  /** Reminders sent to them (named surveys only). */
  reminderCount?: number
  remindedAt?: string | null
  createdAt: string
}

export type SurveyRecipientCounts = {
  total: number
  notStarted: number
  opened: number
  completed: number
}

/** Anonymous surveys and repeating surveys (all periods) return counts only. */
export type SurveyRecipientsPayload = {
  isAnonymous: boolean
  byPeriod: boolean
  /** Individual responses are limited to particular people: who answered is part of them. */
  recipientsRestricted?: boolean
  counts: SurveyRecipientCounts
  recipients: SurveyRecipientItem[]
}

export type PublicSurveyQuestion = {
  id: string
  questionText: string
  helpText: string | null
  questionType: SurveyQuestionType
  options: string[] | null
  config: Record<string, unknown> | null
  isRequired: boolean
  sortOrder: number
  /** Heading of the section the question sits in (ready-made surveys). */
  sectionTitle?: string | null
  /** "Would you like someone to contact you…": not asked of someone answering without their name. */
  contactRequest?: boolean
  /** Options from a CareFlow list (ETHNICITY …): its entries in use, in their groups. */
  optionsFrom?: string | null
  optionGroups?: Array<{ group: string; options: Array<{ code: string; label: string }> }>
} & SurveyQuestionLogic

export type PublicSurveyForm = {
  title: string
  description: string | null
  /** Shown to people after they submit (the closing screen); null = the thank-you only. */
  closingMessage?: string | null
  isAnonymous: boolean
  /** Named survey: offer "Answer without my name" (send answerWithoutName). */
  allowAnonymousResponses?: boolean
  /** Said with that choice: staff can see that they answered, not which answers are theirs. */
  answerWithoutNameNote?: string | null
  status: SurveyStatus
  opensAt: string | null
  closesAt: string | null
  alreadyCompleted: boolean
  canSubmit: boolean
  unavailableReason: string | null
  linkKind?: 'share' | 'recipient'
  /** Linked to no one (anonymous survey, or a staff / service-user survey's shared link): no contact-me questions. */
  unlinked?: boolean
  /** A staff / service-user survey's shared link: what answering through it means. */
  sharedLinkNote?: string | null
  /** Why it cannot be answered (null = it can). */
  unavailableKind?: 'COMPLETED' | 'NOT_PUBLISHED' | 'NOT_OPEN' | 'ENDED' | 'NO_OPEN_PERIOD' | 'CLOSED_FOR_YOU' | null
  /** Not answerable: the organisation to contact instead. */
  contact?: { name: string; phone: string | null; email: string | null } | null
  /** Shared links: send back with the answers (spam protection). */
  formToken?: string | null
  /** Introductions shown under section headings: { [sectionTitle]: text }. */
  sectionIntros?: Record<string, string>
  /** One answer per device: the name of the marker kept on the device after answering (never sent). */
  deviceMarker?: string | null
  oncePerDeviceNote?: string | null
  /** Service-user links: ask who is answering (self / family member / representative). */
  askRespondent?: boolean
  /** Service-user links: whose survey this is. */
  forName?: string | null
  questions: PublicSurveyQuestion[]
}

export type SurveyAnswerInput = {
  questionId: string
  booleanValue?: boolean
  textValue?: string
  numberValue?: number
  selectedOptions?: string[]
  /** Text for the question's "Other" choice (kept only when Other is chosen). */
  otherText?: string
  /** Comment alongside the answer (kept only when the comment box is offered). */
  comment?: string
}

export type SubmitSurveyResponseInput = {
  answers: SurveyAnswerInput[]
  respondentRelation?: SurveyRespondentRelation
  respondentName?: string
  /** Named surveys that allow it: answer without my name. */
  answerWithoutName?: boolean
  /** Shared links: the form token the form came with (spam protection). */
  formToken?: string
  /** Shared links: the hidden field people never see (spam protection). */
  website?: string
}

export type SurveyListFilters = {
  status?: SurveyStatus
  targetKind?: SurveyTargetKind
  isTemplate?: boolean
}

/** New surveys start as drafts; sending and scheduling happen from the builder. */
export type CreateSurveyInput = {
  /** Who it's for (audience group code; OTHER with the group in words). */
  audienceGroup?: string | null
  audienceGroupOther?: string | null
  title: string
  description?: string
  targetKind?: SurveyTargetKind
  isAnonymous?: boolean
  allowAnonymousResponses?: boolean
  opensAt?: string
  closesAt?: string
  locationIds?: string[]
  roleIds?: string[]
  isTemplate?: boolean
}

/** Details only — status and schedules have their own actions (open, publish, close, send). */
export type UpdateSurveyInput = {
  title?: string
  description?: string | null
  /** Shown to people after they submit (empty = none). */
  closingMessage?: string | null
  /** Who it's for (SURVEY_AUDIENCE_GROUPS code; null = not said); OTHER gives audienceGroupOther. */
  audienceGroup?: string | null
  audienceGroupOther?: string | null
  targetKind?: SurveyTargetKind
  isAnonymous?: boolean
  /** Named surveys: "Let people choose to answer without their name". */
  allowAnonymousResponses?: boolean
  isTemplate?: boolean
  opensAt?: string | null
  closesAt?: string | null
  locationIds?: string[]
  roleIds?: string[]
  periodOpenDays?: number | null
}

/** Send now / schedule / repeat. Lists are sent explicitly; an empty list means everyone. */
export type SendSurveyInput = {
  employeeIds?: string[]
  /** Service-user surveys: chosen people instead of branches (empty = everyone in the branches). */
  serviceUserIds?: string[]
  locationIds?: string[]
  roleIds?: string[]
  distributeAt?: string
  recurrence?: SurveyRecurrence | null
  periodOpenDays?: number | null
  /** Send now only: also send to people surveyed in the last 4 weeks, with the reason (audited). */
  contactRuleOverride?: { reason: string }
  /** A weekly repeat: why people should be asked this often (the 4-week rule never stops a series). */
  repeatReason?: string
  /** Former people chosen by name (left, or care ended, in the last 3 months): why (5–300 characters). */
  formerReason?: string
}

export type CreateQuestionInput = {
  questionText: string
  /** "Add question here": straight after this question (sortOrder is then ignored). */
  afterQuestionId?: string
  /** null = remove it (editing). */
  helpText?: string | null
  questionType: SurveyQuestionType
  /** Scale questions: null = back to the built-in agreement scale. */
  options?: string[] | null
  /** One answer / Several answers: options from a CareFlow list (ETHNICITY …); null = own options. */
  optionsFrom?: string | null
  /** Score: { min, max }. One answer / Several answers / Scale: { notCountedOptions }; null = none. */
  config?: Record<string, unknown> | null
  isRequired?: boolean
  sortOrder?: number
  /** Section heading the question sits under; empty / null = none. */
  sectionTitle?: string | null
  /** null = none. */
  otherOption?: { label: string; textPrompt: string; textRequired: boolean } | null
  exclusiveOptions?: string[] | null
  commentConfig?: { prompt: string; showWhen: string[] | null } | null
  showIf?: { questionKey: string; answers: string[] } | null
}

export type UpdateQuestionInput = Partial<CreateQuestionInput>

export type SendSurveyResult = {
  sent: number
  /** Held back by the 4-week rule (sent on their free day if the survey is still open). */
  heldBack?: number
  /** Not in this send's sample. */
  notSampled?: number
  skippedExisting: number
  /** Service-user surveys: people in scope without an enabled portal account. */
  skippedNoPortal?: number
  /**
   * Named surveys sent to chosen people: those without a portal account, added to the list to
   * phone, visit or post (for a scheduled send, those who will be added when it goes out).
   */
  noPortal?: Array<{ id: string; name: string }>
  status: SurveyStatus
  scheduled?: boolean
  distributeAt?: string | null
  recurrence?: SurveyRecurrence | null
  /** Repeating survey started now: the first period's survey. */
  periodSurveyId?: string
}

export type SaveAsTemplateResult = {
  /** moved: the unused draft became the template; copied: a template copy was made. */
  mode: 'moved' | 'copied'
  survey: SurveyDetail
}

/** Portal: a survey sent to the signed-in service user. */
export type PortalSurveyItem = {
  token: string
  title: string
  description: string | null
  sentAt: string | null
  opensAt: string | null
  closesAt: string | null
  state: 'OPEN' | 'UNAVAILABLE' | 'COMPLETED'
  unavailableReason: string | null
  completedAt: string | null
  respondentRelation: SurveyRespondentRelation | null
  /** Their answers are kept against their name, so they can be viewed. */
  answersAvailable?: boolean
  /** They answered this named survey without their name: nothing is kept against it. */
  answeredWithoutName?: boolean
}

/** Portal: the answers the signed-in service user submitted for one survey. */
export type PortalSurveyAnswers = {
  title: string
  submittedAt: string
  respondentRelation: SurveyRespondentRelation | null
  respondentName: string | null
  answers: {
    questionId: string
    questionText: string
    sectionTitle?: string | null
    displayValue: string
    /** Their comment alongside the answer, if they wrote one. */
    comment?: string | null
  }[]
}

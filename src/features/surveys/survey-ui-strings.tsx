import * as React from 'react'

/**
 * The answer page's own wording (buttons, notes, errors), in English, keyed as the API's
 * SURVEY_UI_STRINGS (careflow-api/src/surveys/survey-translation.util.ts — generated from it, keep
 * them the same). A survey's published translation gives these in its language as `ui:<key>`;
 * anything missing shows in English. Placeholders in braces ({n}, {question}) are filled in when shown.
 */
export const SURVEY_UI_STRINGS = {
  survey: "Survey",
  forName: "For {name}",
  anonymousBadge: "Anonymous responses",
  notLinkedBadge: "Not linked to your name",
  answeringWithoutName: "Answering without your name",
  canAnswerWithoutName: "You can answer without your name",
  questionCountOne: "1 question",
  questionCountMany: "{n} questions",
  requiredNote: "Questions marked * need an answer.",
  notAccepting: "This survey is not accepting responses right now.",
  problemTitle: "There is a problem",
  answerThisQuestion: "Answer this question",
  describeOther: "Tell us your “Other” answer",
  chooseWho: "Choose who is answering this survey",
  problemItem: "{problem}: question {n}, “{question}”",
  answeredCount: "Answered {n} of {total}",
  requiredLeft: "{n} required left",
  fillOther: "Please fill in your “Other” answer",
  chooseWhoShort: "Choose who is answering",
  ready: "Ready to submit",
  whoIsAnswering: "Who is answering this survey?",
  whoHint: "A family member or representative can answer on the service user's behalf.",
  relationSelf: "I am the service user",
  relationFamily: "I am a family member answering for them",
  relationRepresentative: "I am their representative (e.g. advocate, attorney)",
  yourNameOptional: "Your name (optional)",
  footerChooseWho: "Please choose who is answering this survey.",
  footerRequired: "Please answer all required questions marked with *.",
  footerOther: "Please tell us your “Other” answer for: {question}",
  footerReady: "You can submit your response now.",
  submitting: "Submitting…",
  submit: "Submit response",
  yes: "Yes",
  no: "No",
  yourAnswer: "Your answer…",
  optional: "(optional)",
  noNames: "Please do not include names.",
  required: "(required)",
  errorPrefix: "Error:",
  giveName: "Do you want to give your name?",
  answerWithName: "Answer with my name",
  answerWithoutName: "Answer without my name — we will not be able to reply to you",
  withoutNameAbout: "You can answer without your name. Your answers are then not linked to you, so we cannot follow them up or contact you about them.",
  withoutNameNote: "Staff can see that you have answered, but not which answers are yours.",
  searchList: "Search the list",
  searchPlaceholder: "Type to narrow the list",
  answersCount: "{n} answers",
  answersMatch: "{n} answers match",
  answerMatches: "1 answer matches",
  chosen: "Chosen: {list}",
  nothingMatches: "Nothing matches. Try fewer letters.",
  thankYouTitle: "Response recorded",
  thankYou: "Thank you for completing this survey.",
  language: "Language",
  displayOptions: "Display options",
  textSize: "Text size",
  highContrast: "High contrast",
  readableFont: "Easier-to-read font",
  moreSpacing: "More space between lines",
  paperHowTo: "Tick a box like this ☑ or write in the space. Questions marked * need an answer.",
  paperNoNameAnonymous: "Please do not write your name anywhere on this form. Your answers are anonymous.",
  paperPersonName: "Name of the person we support",
  paperYourName: "Your name",
  paperWhoFilling: "Who is filling this in? Tick one box.",
  paperTickOne: "Tick one box.",
  paperTickAll: "Tick all that apply.",
  paperCircleOne: "Circle one number.",
  paperWriteAnswer: "Write your answer",
  paperWriteNumber: "Write a number",
  paperOnlyIf: "Only answer this if you answered {answers} to question {n}.",
  paperOr: "or",
  paperIfAnswered: "If you answered {answers}:",
  paperNoNames: "Please do not write any names.",
  paperThankYou: "Thank you.",
  paperGiveBack: "Please give this form back to the person who gave it to you, or send it to {organisation}.",
} as const

export type SurveyUiKey = keyof typeof SURVEY_UI_STRINGS

export type SurveyStrings = (key: SurveyUiKey, vars?: Record<string, string | number>) => string

/** Fill {placeholders} in a phrase. */
export function fillPhrase(template: string, vars?: Record<string, string | number>): string {
  return vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : template
}

/** Phrases from a translation (keys `ui:<key>`), falling back to English. */
export function surveyStrings(overrides?: Record<string, string> | null): SurveyStrings {
  return (key, vars) => fillPhrase(overrides?.[`ui:${key}`] || SURVEY_UI_STRINGS[key], vars)
}

const SurveyStringsContext = React.createContext<SurveyStrings>(surveyStrings())

export const SurveyStringsProvider = SurveyStringsContext.Provider

/** The answer page's wording in the language being shown (English outside a translated page). */
export function useSurveyStrings(): SurveyStrings {
  return React.useContext(SurveyStringsContext)
}

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { buildShareMessages, closingDay, csvCell, mailtoHref, websiteButtonSnippet, whatsappHref } from '@/features/surveys/sharing/survey-share-messages'
import { paperOnlyIf, paperQuestions } from '@/features/surveys/sharing/SurveyPaperCopyPage'
import { SurveyPaperQuestion } from '@/features/surveys/sharing/SurveyPaperQuestion'
import { personalLinksCsv } from '@/features/surveys/sharing/SurveyPersonalLinks'
import { posterPrivacyLine } from '@/features/surveys/sharing/SurveyPosterPage'
import { unavailablePage } from '@/features/surveys/pages/TakeSurveyPage'
import type { PublicSurveyForm, PublicSurveyQuestion } from '@/features/surveys/types'

vi.mock('@/store/company.store', () => ({ useCompanyStore: () => null }))

const q = (over: Partial<PublicSurveyQuestion> = {}): PublicSurveyQuestion => ({
  id: 'q1',
  questionText: 'How safe do you feel?',
  helpText: null,
  questionType: 'SINGLE_SELECT',
  options: ['Very safe', 'Fairly safe', 'Not safe'],
  config: null,
  isRequired: true,
  sortOrder: 0,
  ...over,
})

describe('ready-to-send messages', () => {
  const base = { title: 'Staff survey 2026', url: 'https://app.example/survey/abc', targetKind: 'EMPLOYEE' as const, isAnonymous: true, linkKind: 'shared' as const }

  it('carry the link, the closing day and an honest privacy line', () => {
    const m = buildShareMessages({ ...base, organisation: 'Sunrise Care', closesAt: '2026-11-20T23:59:00.000Z', minutes: 5 })
    for (const text of [m.whatsapp, m.text, m.emailBody]) {
      expect(text).toContain('https://app.example/survey/abc')
      expect(text).toContain('Your answers are anonymous')
    }
    expect(m.whatsapp).toContain('Please answer by Friday 20 November.')
    expect(m.whatsapp).toContain('It takes about 5 minutes.')
    expect(m.emailSubject).toBe('Survey: Staff survey 2026')
    expect(m.whatsapp).toContain('Thank you, Sunrise Care')
  })

  it('a personal link says it is just for them and greets them; a named survey makes no anonymity promise', () => {
    const m = buildShareMessages({ ...base, isAnonymous: false, linkKind: 'personal', firstName: 'Zara' })
    expect(m.whatsapp).toMatch(/^Hello Zara,/)
    expect(m.whatsapp).toContain('do not pass it on')
    expect(m.whatsapp).not.toMatch(/anonymous|not linked/)
  })

  it('a named survey’s shared link says answers through it are not linked to a name', () => {
    expect(buildShareMessages({ ...base, isAnonymous: false }).text).toContain('not linked to your name')
    expect(buildShareMessages({ ...base, isAnonymous: false, targetKind: 'PUBLIC' }).text).not.toContain('not linked')
  })

  it('closing day is in UK time, day only', () => {
    expect(closingDay('2026-06-30T23:30:00.000Z')).toBe('Wednesday 1 July')
    expect(closingDay(null)).toBeNull()
  })

  it('WhatsApp and email open with the text filled in, and no recipient chosen for them', () => {
    expect(whatsappHref('Hi & bye')).toBe('https://wa.me/?text=Hi%20%26%20bye')
    expect(mailtoHref('S', 'B\nC')).toBe('mailto:?subject=S&body=B%0AC')
  })

  it('website button is plain HTML that opens a new tab and escapes what it is given', () => {
    const html = websiteButtonSnippet('https://x.example/survey/"a"', '<b>Go</b>')
    expect(html).toContain('href="https://x.example/survey/&quot;a&quot;"')
    expect(html).toContain('&lt;b&gt;Go&lt;/b&gt;')
    expect(html).toContain('target="_blank" rel="noopener"')
  })
})

describe('mail merge file', () => {
  it('quotes every cell and makes formula-like names harmless', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    const csv = personalLinksCsv([
      { recipientId: 'r1', name: 'Zara Ali', kind: 'EMPLOYEE', path: '/survey/t1', answered: false },
      { recipientId: 'r2', name: '+Adam', kind: 'EMPLOYEE', path: '/survey/t2', answered: true },
    ])
    const [head, first, second] = csv.split('\r\n')
    expect(head).toBe('"Name","Link","Answered"')
    expect(first).toMatch(/^"Zara Ali","http.*\/survey\/t1","No"$/)
    expect(second).toMatch(/^"'\+Adam"/)
  })

  it('leaves out whether they answered when the user may not see it', () => {
    const csv = personalLinksCsv([{ recipientId: 'r1', name: 'Zara', kind: 'EMPLOYEE', path: '/survey/t1', answered: null }])
    expect(csv.split('\r\n')[0]).toBe('"Name","Link"')
  })
})

describe('paper copy', () => {
  it('an anonymous survey’s paper copy never asks to be contacted (nor its follow-ups)', () => {
    const contact = q({ id: 'qc', key: 'contact', questionText: 'Would you like us to contact you?', questionType: 'YES_NO', contactRequest: true, sortOrder: 1 })
    const follow = q({ id: 'qf', key: 'phone', questionText: 'Your phone number', questionType: 'TEXT', sortOrder: 2, showIf: { questionKey: 'contact', answers: ['Yes'] } })
    const survey = { isAnonymous: true, questions: [q(), contact, follow] } as never
    expect(paperQuestions(survey).map(x => x.id)).toEqual(['q1'])
    expect(paperQuestions({ ...(survey as object), isAnonymous: false } as never).map(x => x.id)).toEqual(['q1', 'qc', 'qf'])
  })

  it('says a "Show only if" rule with the earlier question’s number', () => {
    const first = q({ key: 'safe' })
    const second = q({ id: 'q2', sortOrder: 1, showIf: { questionKey: 'safe', answers: ['Fairly safe', 'Not safe'] } })
    expect(paperOnlyIf(second, [first, second])).toBe('Only answer this if you answered Fairly safe or Not safe to question 1.')
    expect(paperOnlyIf(first, [first, second])).toBeNull()
  })

  it('draws tick boxes for the same answers as online, with Other and the comment box', () => {
    render(
      <SurveyPaperQuestion
        q={q({
          otherOption: { label: 'Other (please tell us)', textPrompt: 'Please tell us', textRequired: false },
          commentConfig: { prompt: 'Why do you say that?', showWhen: ['Not safe'] },
        })}
        number={3}
        onlyIf={null}
        anonymous
      />,
    )
    expect(screen.getByRole('heading', { name: /3\. How safe do you feel\?/ })).toBeInTheDocument()
    for (const o of ['Very safe', 'Fairly safe', 'Not safe']) expect(screen.getByText(o)).toBeInTheDocument()
    expect(screen.getByText('Tick one box.')).toBeInTheDocument()
    expect(screen.getByText(/Other \(please tell us\): Please tell us/)).toBeInTheDocument()
    expect(screen.getByText(/If you answered Not safe: Why do you say that\? \(optional\)/)).toBeInTheDocument()
    expect(screen.getByText('Please do not write any names.')).toBeInTheDocument()
  })
})

describe('poster and ended page', () => {
  it('the poster promises only what is true', () => {
    expect(posterPrivacyLine({ isAnonymous: true, targetKind: 'EMPLOYEE' })).toMatch(/anonymous/)
    expect(posterPrivacyLine({ isAnonymous: false, targetKind: 'EMPLOYEE' })).toMatch(/not linked to your name/)
    expect(posterPrivacyLine({ isAnonymous: false, targetKind: 'PUBLIC' })).toBeNull()
  })

  const form = (over: Partial<PublicSurveyForm>): PublicSurveyForm => ({
    title: 'Family survey',
    description: null,
    isAnonymous: false,
    status: 'ACTIVE',
    opensAt: null,
    closesAt: null,
    alreadyCompleted: false,
    canSubmit: false,
    unavailableReason: null,
    questions: [],
    ...over,
  })

  it('an ended survey gets a page of its own saying so', () => {
    const page = unavailablePage(form({ unavailableKind: 'ENDED', status: 'ACTIVE', closesAt: '2026-11-20T12:00:00.000Z' }))
    expect(page?.title).toBe('This survey has ended')
    expect(page?.description).toContain('closed on 20 November 2026')
    expect(unavailablePage(form({ unavailableKind: 'NOT_OPEN', opensAt: '2026-12-01T09:00:00.000Z' }))?.description).toContain('opens on 1 December 2026')
    expect(unavailablePage(form({ unavailableKind: 'NO_OPEN_PERIOD', unavailableReason: 'The next one opens on 1 Dec 2026.' }))?.title).toBe('No survey is open right now')
    // An invitation that lapsed (the person can no longer be sent it): closed for them.
    expect(unavailablePage(form({ unavailableKind: 'CLOSED_FOR_YOU', unavailableReason: 'This survey is closed for you. Thank you.' }))?.title).toBe('This survey is closed for you')
    expect(unavailablePage(form({ canSubmit: true }))).toBeNull()
    expect(unavailablePage(form({ unavailableKind: 'COMPLETED' }))).toBeNull()
  })
})

describe('Part 4: device marker, named + shared figures, burst caution', () => {
  it('one answer per device: remembered only on this device, as a random value', async () => {
    const { answeredOnThisDevice, rememberAnswered } = await import('@/features/surveys/pages/TakeSurveyPage')
    const key = 'careflow-survey-answered-test'
    window.localStorage.removeItem(key)
    expect(answeredOnThisDevice(key)).toBe(false)
    rememberAnswered(key)
    expect(answeredOnThisDevice(key)).toBe(true)
    expect(window.localStorage.getItem(key)).toMatch(/^[0-9a-f]{16}$/)
    window.localStorage.removeItem(key)
  })

  it('a named survey’s trade-offs say a recipient could answer twice', async () => {
    const { sharedLinkTradeOffs } = await import('@/features/surveys/sharing/SurveySharePanel')
    expect(sharedLinkTradeOffs(true).join(' ')).toMatch(/could answer twice/)
    expect(sharedLinkTradeOffs(false).join(' ')).not.toMatch(/could answer twice/)
  })

  it('Results show answers from the list and through the shared link apart, with a burst caution', async () => {
    const { SurveyParticipationPanel } = await import('@/features/surveys/components/SurveyParticipationPanel')
    render(
      <SurveyParticipationPanel
        isPublic={false}
        results={
          {
            recipients: 20,
            completed: 8,
            responseRate: 40,
            responses: 15,
            sharedLinkCaution: { days: [{ day: '2026-11-04', answers: 45 }], note: 'Unusually many answers came through the shared link.' },
            participation: {
              sentTo: 20, answered: 15, answeredFromSent: 8, responseRate: 40, openedNotFinished: 0, notOpened: 12,
              answeredThroughLink: null, recordedByStaff: null, answeredThroughSharedLink: 7,
              answeredEveryQuestion: 15, skippedSomeQuestions: 0, responsesInFigures: 15,
            },
          } as never
        }
      />,
    )
    expect(screen.getByTestId('participation-from-list')).toHaveTextContent('8')
    expect(screen.getByTestId('participation-shared-link')).toHaveTextContent('7')
    expect(screen.getByTestId('participation-rate')).toHaveTextContent('shared-link answers are not counted')
    expect(screen.getByTestId('shared-link-caution')).toHaveTextContent('Unusually many answers')
  })
})

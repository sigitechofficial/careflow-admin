import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LibrarySurvey, LibrarySurveyDetail } from '@/features/surveys/api/survey-library.api'

const { state, adoptMock, navigateMock } = vi.hoisted(() => ({
  state: {
    surveys: [] as LibrarySurvey[],
    detail: null as LibrarySurveyDetail | null,
    canManage: true,
    assignedLocationIds: null as string[] | null,
  },
  adoptMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}))
// The one New survey dialog is reused; here it only shows what it was opened with.
vi.mock('@/features/surveys/components/NewSurveyDialog', () => ({
  NewSurveyDialog: ({
    start,
  }: {
    start: { kind: string; template?: { id: string; title: string; targetKind: string; isAnonymous: boolean; librarySourceId?: string | null } } | null
  }) =>
    start?.template ? (
      <div data-testid="new-survey-dialog">{`${start.kind}|${start.template.id}|${start.template.title}|${start.template.targetKind}|${String(start.template.isAnonymous)}|${start.template.librarySourceId}`}</div>
    ) : null,
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean; user: { assignedLocationIds: string[] | null } }) => unknown) =>
    pick({ can: () => state.canManage, user: { assignedLocationIds: state.assignedLocationIds } }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/features/surveys/api/survey-library.api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/surveys/api/survey-library.api')>()
  return {
    ...actual,
    useLibrarySurveys: () => ({ data: state.surveys, isLoading: false, isError: false }),
    useLibrarySurvey: (id: string | null) => ({ data: id ? state.detail : undefined, isLoading: false, isError: false }),
    useAdoptLibrarySurveys: () => ({ mutate: adoptMock, isPending: false }),
  }
})

import ReadyMadeSurveysPage from '@/features/surveys/pages/ReadyMadeSurveysPage'

const survey = (over: Partial<LibrarySurvey> = {}): LibrarySurvey => ({
  id: 'lib-1',
  reference: 'SUR-PWS-001',
  title: 'Annual satisfaction survey',
  summary: 'How people we support feel about their care. Confidential, 12 questions, about 8 minutes, by portal or phone.',
  group: { code: 'PEOPLE_WE_SUPPORT', short: 'PWS', name: 'People we support', displayOrder: 10 },
  researchedOn: '2026-11-05',
  audience: 'SERVICE_USER',
  respondents: 'People we support',
  anonymous: false,
  estimatedMinutes: 8,
  questionCount: 12,
  sectionCount: 3,
  cqc: { keyQuestions: ['CARING', 'RESPONSIVE'], qualityStatements: [] },
  timing: { when: 'Once a year: opens on the first working day of February and closes 4 weeks later', recurrence: 'YEARLY', trigger: null },
  channels: ['PORTAL', 'TELEPHONE'],
  revision: 1,
  revisionNote: null,
  adoptedTemplateId: null,
  adoptedRevision: null,
  updateAvailable: false,
  ...over,
})

const library = () => [
  survey(),
  survey({ id: 'lib-2', reference: 'SUR-PWS-002', title: 'Six-week check-in', estimatedMinutes: 3, questionCount: 6 }),
  survey({
    id: 'lib-3',
    reference: 'SUR-STF-001',
    title: 'Staff pulse',
    group: { code: 'STAFF', short: 'STF', name: 'Staff', displayOrder: 30 },
    audience: 'EMPLOYEE',
    respondents: 'Care workers',
    anonymous: true,
    adoptedTemplateId: 'tpl-3',
    adoptedRevision: 1,
  }),
  survey({
    id: 'lib-4',
    reference: 'SUR-STF-002',
    title: 'Staff exit survey',
    group: { code: 'STAFF', short: 'STF', name: 'Staff', displayOrder: 30 },
    audience: 'EMPLOYEE',
    revision: 2,
    revisionNote: 'Added a question on supervision',
    adoptedTemplateId: 'tpl-4',
    adoptedRevision: 1,
    updateAvailable: true,
  }),
]

const detail = (): LibrarySurveyDetail => ({
  ...survey(),
  purpose: 'Shows whether people feel well cared for.',
  introduction: 'Allfor Care wants to hear what you think of your care.',
  privacyNotice: 'Only managers at Allfor Care see your answers. We keep them for two years.',
  sections: [
    {
      title: 'Your visits',
      evidence: [],
      questions: [
        { id: 'q1', questionText: 'Do your care workers arrive on time?', helpText: null, questionType: 'YES_NO', options: null, config: null, isRequired: true },
        { id: 'q2', questionText: 'How would you rate your care?', helpText: null, questionType: 'RATING', options: null, config: { min: 1, max: 5 }, isRequired: true },
      ],
    },
    {
      title: 'Your say',
      evidence: [],
      questions: [
        {
          id: 'q3', questionText: 'How do you contact us?', helpText: null, questionType: 'SINGLE_SELECT', options: ['Phone', 'Portal', "Don't know"], config: { notCountedOptions: ["Don't know"] }, notCountedOptions: ["Don't know"], isRequired: true,
          key: 'q-contact', otherOption: { label: 'Other (please tell us)', textPrompt: 'Please tell us', textRequired: true },
          commentConfig: { prompt: 'Please tell us why', showWhen: ['Phone'] },
        },
        {
          id: 'q4', questionText: 'Anything else?', helpText: null, questionType: 'TEXTAREA', options: null, config: null, isRequired: false,
          showIf: { questionKey: 'q-contact', answers: ['Phone', 'Portal'], questionText: 'How do you contact us?' },
        },
      ],
    },
  ],
  managerGuidance: {
    howToRun: ['Offer a phone call to anyone who prefers it.'],
    actingOnResults: ['Share what you heard and what you will change.'],
    alerts: [{ when: 'Someone says they do not feel safe', action: 'Raise a safeguarding concern the same day.' }],
  },
  relatedPolicies: [{ reference: 'POL-CD-001', title: 'Care Delivery Policy' }],
  regulatoryBasis: [{ source: 'Regulation 17', url: 'https://www.legislation.gov.uk/uksi/2014/2936/regulation/17' }],
})

const adoptResult = (created: Array<{ libraryId: string; templateId: string; reference: string; title: string }>) =>
  adoptMock.mockImplementation((_ids: string[], opts: { onSuccess: (r: unknown) => void }) =>
    opts.onSuccess({ created, skipped: [] }),
  )

describe('ReadyMadeSurveysPage', () => {
  beforeEach(() => {
    adoptMock.mockReset()
    navigateMock.mockReset()
    state.surveys = library()
    state.detail = detail()
    state.canManage = true
    state.assignedLocationIds = null
  })

  it('groups surveys with counts, shows the facts and adoption badges', () => {
    render(<ReadyMadeSurveysPage />)
    expect(screen.getByRole('tab', { name: 'All (4)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'People we support (2)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Staff (2)' })).toBeInTheDocument()
    expect(screen.getByText('4 surveys · 2 adopted')).toBeInTheDocument()
    const [first, , pulse] = screen.getAllByTestId('ready-made-survey')
    // Summary without the repeated counts; facts in a fixed order; CQC chips; reference last.
    expect(within(first!).getByTestId('ready-made-summary')).toHaveTextContent(/^How people we support feel about their care\.$/)
    expect(within(first!).getByTestId('ready-made-facts')).toHaveTextContent(
      'Who answers:People we supportWhen:Once a year, FebruaryTime:About 8 minutesQuestions:12 questionsResponses:Confidential',
    )
    expect(within(first!).getByRole('list', { name: 'CQC key questions' })).toHaveTextContent('CaringResponsive')
    expect(first!.textContent!.trim().endsWith('SUR-PWS-001ReadAdopt')).toBe(true)
    // The long "who answers" sentence is only in the Read dialog.
    expect(within(pulse!).queryByText(/Care workers/)).not.toBeInTheDocument()
    expect(within(pulse!).getByTestId('ready-made-facts')).toHaveTextContent('Who answers:Staff')
    expect(within(pulse!).getByTestId('ready-made-facts')).toHaveTextContent('Responses:Anonymous')
    expect(screen.getByText('Adopted')).toBeInTheDocument()
    expect(screen.getByText('Update available')).toBeInTheDocument()
  })

  it('shows how it works, then search and groups, then the selection bar, then the surveys', () => {
    render(<ReadyMadeSurveysPage />)
    const steps = within(screen.getByTestId('ready-made-how-it-works')).getAllByRole('listitem')
    expect(steps.map(s => s.textContent)).toEqual([
      expect.stringMatching(/^1Read a survey/),
      expect.stringMatching(/^2Adopt it.*organisation’s name/),
      expect.stringMatching(/^3Start a survey from your template.*phone and paper/),
    ])
    const order = [
      screen.getByTestId('ready-made-how-it-works'),
      screen.getByLabelText('Search ready-made surveys'),
      screen.getByRole('tablist', { name: 'Groups' }),
      screen.getByTestId('ready-made-selection-bar'),
      screen.getAllByTestId('ready-made-survey')[0]!,
    ]
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(within(screen.getByTestId('ready-made-selection-bar')).getByRole('button', { name: /adopt selected/i })).toBeDisabled()
  })

  it('adopted cards offer Open template and Start a survey instead of Adopt', async () => {
    render(<ReadyMadeSurveysPage />)
    const pulse = screen.getAllByTestId('ready-made-survey')[2]!
    expect(within(pulse).queryByRole('button', { name: 'Adopt' })).not.toBeInTheDocument()
    await userEvent.click(within(pulse).getByRole('button', { name: /Open template/ }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/surveys/$surveyId', params: { surveyId: 'tpl-3' } })
    await userEvent.click(within(pulse).getByRole('button', { name: /Start a survey/ }))
    expect(screen.getByTestId('new-survey-dialog')).toHaveTextContent('template|tpl-3|Staff pulse|EMPLOYEE|true|lib-3')
  })

  it('after adopting one survey: offers to start a survey, open the template or stay', async () => {
    adoptResult([{ libraryId: 'lib-1', templateId: 'tpl-new', reference: 'SUR-PWS-001', title: 'Annual satisfaction survey' }])
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(within(screen.getAllByTestId('ready-made-survey')[0]!).getByRole('button', { name: 'Adopt' }))
    expect(adoptMock).toHaveBeenCalledWith(['lib-1'], expect.any(Object))
    const done = within(screen.getByTestId('ready-made-adopted-dialog'))
    expect(done.getByText('Added to your templates')).toBeInTheDocument()
    expect(done.getByText(/organisation’s name filled in/)).toBeInTheDocument()
    expect(done.getByText(/never sent/)).toBeInTheDocument()
    expect(done.getByRole('button', { name: 'Stay here' })).toBeInTheDocument()
    expect(done.getByRole('button', { name: 'Open the template' })).toBeInTheDocument()
    await userEvent.click(done.getByRole('button', { name: 'Start a survey now' }))
    expect(screen.queryByTestId('ready-made-adopted-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('new-survey-dialog')).toHaveTextContent('template|tpl-new|Annual satisfaction survey|SERVICE_USER|false|lib-1')
  })

  it('after adopting one survey, Open the template goes to its builder', async () => {
    adoptResult([{ libraryId: 'lib-1', templateId: 'tpl-new', reference: 'SUR-PWS-001', title: 'Annual satisfaction survey' }])
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(within(screen.getAllByTestId('ready-made-survey')[0]!).getByRole('button', { name: 'Adopt' }))
    await userEvent.click(screen.getByRole('button', { name: 'Open the template' }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/surveys/$surveyId', params: { surveyId: 'tpl-new' } })
  })

  it('after adopting several: lists them and goes to Templates', async () => {
    adoptResult([
      { libraryId: 'lib-1', templateId: 'tpl-a', reference: 'SUR-PWS-001', title: 'Annual satisfaction survey' },
      { libraryId: 'lib-2', templateId: 'tpl-b', reference: 'SUR-PWS-002', title: 'Six-week check-in' },
    ])
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Select all not yet adopted (2)' }))
    await userEvent.click(screen.getByRole('button', { name: /adopt selected/i }))
    const done = within(screen.getByTestId('ready-made-adopted-dialog'))
    expect(done.getByTestId('ready-made-adopted-list')).toHaveTextContent('Annual satisfaction survey (SUR-PWS-001)Six-week check-in (SUR-PWS-002)')
    expect(done.queryByRole('button', { name: 'Start a survey now' })).not.toBeInTheDocument()
    await userEvent.click(done.getByRole('button', { name: 'Go to Templates' }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/surveys', search: { view: 'templates' } })
  })

  it('filters by group and search', async () => {
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Staff (2)' }))
    expect(screen.getAllByTestId('ready-made-survey')).toHaveLength(2)
    await userEvent.click(screen.getByRole('tab', { name: 'All (4)' }))
    await userEvent.type(screen.getByLabelText('Search ready-made surveys'), 'check-in')
    expect(screen.getAllByTestId('ready-made-survey')).toHaveLength(1)
    expect(screen.getByText('Six-week check-in')).toBeInTheDocument()
  })

  it('selects every survey not yet adopted and adopts them', async () => {
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Select all not yet adopted (2)' }))
    expect(screen.getByText('2 surveys selected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /adopt selected/i }))
    expect(adoptMock).toHaveBeenCalledWith(['lib-1', 'lib-2'], expect.any(Object))
  })

  it('reads a survey: summary and facts, questions, what people see, guidance, CQC, policies and sources', async () => {
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Annual satisfaction survey' }))
    await userEvent.click(screen.getByRole('button', { name: 'Questions and guidance' }))
    const dialog = screen.getByTestId('ready-made-survey-detail')
    const headings = within(dialog)
      .getAllByRole('heading', { level: 3 })
      .map(h => h.textContent)
    expect(headings).toEqual([
      'Why run it',
      'What it asks',
      'What people see first',
      'How to run it',
      'Acting on the results',
      'Answers that need action',
      'CQC areas',
      'Related policies',
      'Sources',
    ])
    const overview = within(dialog).getByTestId('ready-made-detail-overview')
    expect(overview).toHaveTextContent('How people we support feel about their care.')
    expect(overview).toHaveTextContent('People we support: People we support')
    expect(overview).toHaveTextContent('Once a year: opens on the first working day of February')
    expect(overview).toHaveTextContent('Confidential')
    expect(within(dialog).getByText('Allfor Care wants to hear what you think of your care.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Only managers at Allfor Care see your answers/)).toBeInTheDocument()
    const sections = within(dialog).getAllByTestId('ready-made-survey-section')
    expect(sections.map(s => within(s).getByRole('heading').textContent)).toEqual(['Your visits', 'Your say'])
    expect(within(dialog).getByText('Yes or no')).toBeInTheDocument()
    expect(within(dialog).getByText('Score from 1 to 5')).toBeInTheDocument()
    expect(within(dialog).getByText("Choose one: Phone / Portal / Don't know")).toBeInTheDocument()
    expect(within(dialog).getByText('Written comment')).toBeInTheDocument()
    expect(within(dialog).getByText('4. Anything else?')).toBeInTheDocument()
    expect(within(dialog).getAllByTestId('ready-made-question-extra').map(e => e.textContent)).toEqual([
      "Not counted in percentages: Don't know",
      'Other (please tell us)',
      'Comment box after: Phone',
      'Asked only if “How do you contact us?” is Phone or Portal',
    ])
    expect(within(dialog).getByText('Offer a phone call to anyone who prefers it.')).toBeInTheDocument()
    expect(within(dialog).getByTestId('ready-made-survey-alerts')).toHaveTextContent(
      'Someone says they do not feel safe: Raise a safeguarding concern the same day.',
    )
    expect(within(dialog).getByText('Care Delivery Policy')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Regulation 17' })).toHaveAttribute(
      'href',
      'https://www.legislation.gov.uk/uksi/2014/2936/regulation/17',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Adopt' }))
    expect(adoptMock).toHaveBeenCalledWith(['lib-1'], expect.any(Object))
  })

  it('opens a survey as people see it: the form with its intro, sections and questions; nothing is saved', async () => {
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Annual satisfaction survey' }))
    expect(screen.getByRole('button', { name: 'As people see it' })).toHaveAttribute('aria-pressed', 'true')
    const view = within(screen.getByTestId('ready-made-survey-detail')).getByTestId('library-respondent-view')
    expect(within(view).getByText(/Nothing you enter here is saved/)).toBeInTheDocument()
    expect(within(view).getByText('Allfor Care wants to hear what you think of your care.', { exact: false })).toBeInTheDocument()
    expect(within(view).getByText('Your visits')).toBeInTheDocument()
    expect(within(view).getByRole('button', { name: 'Submit response' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Questions and guidance' }))
    expect(screen.queryByTestId('library-respondent-view')).not.toBeInTheDocument()
  })

  it('reading a named survey with an anonymous version shows that version and what it leaves out', async () => {
    state.detail = {
      ...detail(),
      anonymousVariant: {
        introduction: 'We want to hear from you. This survey is anonymous.',
        privacyNotice: 'We never know who answered.',
        questionsLeftOut: ['Would you like someone to contact you about your answers?'],
        alertsLeftOut: ['Someone asks to be contacted'],
      },
    }
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Annual satisfaction survey' }))
    await userEvent.click(screen.getByRole('button', { name: 'Questions and guidance' }))
    const section = within(screen.getByTestId('ready-made-survey-detail')).getByTestId('library-anonymous-version')
    expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent('Also available as an anonymous version')
    expect(section).toHaveTextContent('We never know who answered.')
    expect(section).toHaveTextContent('Questions left out')
    expect(section).toHaveTextContent('Would you like someone to contact you about your answers?')
    expect(section).toHaveTextContent('Someone asks to be contacted')
  })

  it('the Read dialog of an adopted survey offers Open template and Start a survey', async () => {
    state.detail = { ...detail(), ...library()[2]!, id: 'lib-3' }
    render(<ReadyMadeSurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Staff pulse' }))
    expect(screen.queryByRole('button', { name: 'Adopt' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Start a survey/ }))
    expect(screen.getByTestId('new-survey-dialog')).toHaveTextContent('template|tpl-3|Staff pulse|EMPLOYEE|true|lib-3')
  })

  it('lets branch-restricted and read-only users read but not adopt', async () => {
    state.assignedLocationIds = ['loc-1']
    const { unmount } = render(<ReadyMadeSurveysPage />)
    expect(screen.queryByRole('button', { name: /select all not yet adopted/i })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getByTestId('ready-made-branch-note')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Annual satisfaction survey' }))
    expect(screen.queryByRole('button', { name: 'Adopt' })).not.toBeInTheDocument()
    unmount()

    state.assignedLocationIds = null
    state.canManage = false
    render(<ReadyMadeSurveysPage />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByTestId('ready-made-branch-note')).not.toBeInTheDocument()
  })

  it('says when the library is empty', () => {
    state.surveys = []
    render(<ReadyMadeSurveysPage />)
    expect(screen.getByText('No ready-made surveys are available yet.')).toBeInTheDocument()
  })
})

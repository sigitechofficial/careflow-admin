import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LibrarySurvey } from '@/features/surveys/api/survey-library.api'
import type { SurveyListItem } from '@/features/surveys/types'

const { state, createMock, duplicateMock, adoptMock, fetchLibraryMock, navigateMock, toast } = vi.hoisted(() => ({
  state: {
    templates: [] as unknown[],
    library: [] as unknown[],
    details: {} as Record<string, unknown>,
    links: {} as Record<string, unknown>,
    assignedLocationIds: null as string[] | null,
  },
  createMock: vi.fn(),
  duplicateMock: vi.fn(),
  adoptMock: vi.fn(),
  fetchLibraryMock: vi.fn(),
  navigateMock: vi.fn(),
  toast: { toastSuccess: vi.fn(), toastApiError: vi.fn(), toastError: vi.fn() },
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean; user: { assignedLocationIds: string[] | null } }) => unknown) =>
    pick({ can: () => true, user: { assignedLocationIds: state.assignedLocationIds } }),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurveys: () => ({ data: state.templates, isLoading: false, isError: false }),
  useSurvey: (id: string | undefined) => ({ data: id ? state.details[id] : undefined, isLoading: false }),
  useCreateSurvey: () => ({ mutateAsync: createMock, isPending: false }),
  useDuplicateSurvey: () => ({ mutateAsync: duplicateMock, isPending: false }),
}))
vi.mock('@/features/surveys/api/survey-library.api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/api/survey-library.api')>()),
  useLibrarySurveys: () => ({ data: state.library, isLoading: false, isError: false }),
  useLibrarySurvey: (id: string | null) => ({
    data: id ? { ...(state.library as LibrarySurvey[]).find(s => s.id === id), ...readDetail } : undefined,
    isLoading: false,
    isError: false,
  }),
  useAdoptLibrarySurveys: () => ({ mutateAsync: adoptMock, isPending: false }),
  useSurveyLibraryLink: (id: string, enabled = true) => ({ data: enabled ? (state.links[id] ?? null) : undefined }),
  fetchLibrarySurveys: fetchLibraryMock,
}))
vi.mock('@/features/surveys/components/SurveyPreviewDialog', () => ({
  SurveyPreviewDialog: ({ surveyId, open }: { surveyId: string | null; open: boolean }) =>
    open ? <div data-testid="template-preview">{surveyId}</div> : null,
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({
    data: { zones: [{ id: 'z1', name: 'North', branches: [{ id: 'b1', name: 'Leeds', locationId: 'loc-1' }] }] },
  }),
}))
vi.mock('@/features/employees/hooks/useEmployees', () => ({
  useEmployeeLookups: () => ({ data: { jobTitles: [{ id: 'jt-1', name: 'Carer' }] } }),
}))
vi.mock('@/features/employees/hooks/useEmployeeTabs', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('@/shared/lib/toast', () => toast)
// The organisation's calendar day is fixed so suggested names are predictable.
vi.mock('@/shared/lib/operational-day.util', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/lib/operational-day.util')>()),
  dayKeyInTimeZone: () => '2026-11-05',
}))

import { NewSurveyDialog, type NewSurveyStart } from '@/features/surveys/components/NewSurveyDialog'

const readDetail = {
  purpose: 'Shows whether people feel well cared for.',
  introduction: 'We want to hear what you think.',
  privacyNotice: 'Only managers see your answers.',
  sections: [],
  managerGuidance: { howToRun: [], actingOnResults: [], alerts: [] },
  relatedPolicies: [],
  regulatoryBasis: [],
}

function template(over: Partial<SurveyListItem> = {}): SurveyListItem {
  return {
    id: 't1',
    title: 'Staff wellbeing',
    description: 'How are you doing at work?',
    targetKind: 'EMPLOYEE',
    status: 'DRAFT',
    isAnonymous: true,
    opensAt: null,
    closesAt: null,
    publishedAt: null,
    distributeAt: null,
    distributedAt: null,
    recurrence: null,
    clonedFromId: null,
    periodKey: null,
    periodOpenDays: null,
    recurrenceAnchorAt: null,
    distributionFailedAt: null,
    distributionError: null,
    locationIds: ['loc-1'],
    roleIds: ['jt-1'],
    audienceEmployeeIds: [],
    isTemplate: true,
    shareToken: null,
    questionCount: 7,
    recipientCount: 0,
    completedCount: 0,
    responseCount: 0,
    periodCount: 0,
    responseRate: 0,
    createdById: null,
    createdByName: null,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    ...over,
  }
}

const librarySurvey = (over: Partial<LibrarySurvey> = {}): LibrarySurvey => ({
  id: 'lib-1',
  reference: 'SUR-PWS-001',
  title: 'Annual satisfaction survey',
  summary: 'How people we support feel about their care.',
  group: { code: 'PWS', short: 'PWS', name: 'People we support', displayOrder: 10 },
  researchedOn: '2026-11-05',
  audience: 'SERVICE_USER',
  respondents: 'People we support',
  anonymous: false,
  estimatedMinutes: 8,
  questionCount: 12,
  sectionCount: 3,
  cqc: { keyQuestions: ['CARING'], qualityStatements: [] },
  timing: {
    when: 'Once a year: opens on the first working day of February and closes 4 weeks later.',
    recurrence: 'YEARLY',
    trigger: null,
  },
  channels: ['PORTAL'],
  revision: 1,
  revisionNote: null,
  adoptedTemplateId: null,
  adoptedRevision: null,
  updateAvailable: false,
  ...over,
})

const library = () => [
  librarySurvey(),
  librarySurvey({
    id: 'lib-2',
    reference: 'SUR-STF-001',
    title: 'Staff pulse',
    group: { code: 'STF', short: 'STF', name: 'Staff', displayOrder: 30 },
    audience: 'EMPLOYEE',
    anonymous: true,
    timing: { when: 'Every quarter', recurrence: 'QUARTERLY', trigger: null },
    adoptedTemplateId: 'tpl-pulse',
    adoptedRevision: 1,
  }),
]

function open(start: NewSurveyStart) {
  const onClose = vi.fn()
  render(<NewSurveyDialog start={start} onClose={onClose} />)
  return { dialog: within(screen.getByTestId('new-survey-dialog')), onClose }
}

const choose = (dialog: ReturnType<typeof within>, name: RegExp) =>
  userEvent.click(within(dialog.getByRole('radiogroup', { name: 'Start from' })).getByRole('radio', { name }))

describe('NewSurveyDialog', () => {
  beforeEach(() => {
    for (const m of [createMock, duplicateMock, adoptMock, fetchLibraryMock, navigateMock, ...Object.values(toast)]) m.mockReset()
    createMock.mockResolvedValue({ id: 'new-1' })
    duplicateMock.mockResolvedValue({ id: 'copy-1' })
    state.templates = [
      template(),
      template({ id: 't2', title: 'Public feedback', targetKind: 'PUBLIC', isAnonymous: false, locationIds: [], roleIds: [], questionCount: 4, description: null }),
      template({ id: 't3', title: 'Empty template', questionCount: 0 }),
    ]
    state.library = library()
    state.details = {
      t1: { id: 't1', description: 'How are you doing at work?', librarySourceId: null },
      'tpl-new': { id: 'tpl-new', description: 'Tell us about your care.', librarySourceId: 'lib-1' },
      // Adopted at an older revision: the template's own 3 questions, not the library's 12.
      'tpl-pulse': { id: 'tpl-pulse', description: null, questions: [{}, {}, {}], librarySourceId: 'lib-2' },
    }
    state.assignedLocationIds = null
    state.links = {}
  })

  it('step 1 is one radio group: Tab reaches the chosen card, arrow keys change it (native radio buttons)', async () => {
    const { dialog } = open({ kind: 'choose' })
    const blank = dialog.getByRole('radio', { name: /Blank survey/ })
    blank.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(dialog.getByRole('radio', { name: /^One of your templates/ })).toBeChecked()
    expect(dialog.getByRole('radio', { name: /^One of your templates/ })).toHaveFocus()
    expect(dialog.getByRole('radio', { name: /^One of your templates/ })).toHaveAccessibleDescription(/templates? in your organisation/)
  })

  describe('Blank survey', () => {
    it('creates a blank survey from step 1 and opens it in the builder', async () => {
      const { dialog, onClose } = open({ kind: 'choose' })
      expect(dialog.getByRole('radio', { name: /Blank survey/ })).toBeChecked()
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(dialog.getByText('Step 2 of 2 · Details')).toBeInTheDocument()
      // Who it is for can be chosen; anonymity is up to them; description is written here.
      expect(dialog.getByRole('combobox', { name: 'Who is it for' })).toBeInTheDocument()
      expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeEnabled()
      expect(dialog.getByPlaceholderText('Optional context shown to recipients')).toBeInTheDocument()
      expect(dialog.getByRole('checkbox', { name: /Make this a template instead/ })).not.toBeChecked()

      const create = dialog.getByRole('button', { name: 'Create & add questions' })
      expect(create).toBeDisabled()
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'Winter check-in')
      await userEvent.type(dialog.getByPlaceholderText('Optional context shown to recipients'), 'Five minutes')
      await userEvent.click(create)
      expect(createMock).toHaveBeenCalledWith({
        title: 'Winter check-in',
        description: 'Five minutes',
        targetKind: 'EMPLOYEE',
        isAnonymous: false,
        allowAnonymousResponses: false,
        opensAt: undefined,
        closesAt: undefined,
        locationIds: undefined,
        roleIds: undefined,
        isTemplate: undefined,
      })
      expect(toast.toastSuccess).toHaveBeenCalledWith('Survey created — add its questions')
      expect(onClose).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith({ to: '/surveys/$surveyId', params: { surveyId: 'new-1' } })
    })

    it('"Make this a template instead" creates a template (no dates)', async () => {
      const { dialog } = open({ kind: 'blank', asTemplate: true })
      expect(dialog.getByRole('heading', { name: 'New template' })).toBeInTheDocument()
      expect(dialog.queryByRole('group', { name: 'Start' })).not.toBeInTheDocument()
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'Spot check')
      await userEvent.click(dialog.getByRole('button', { name: 'Create template' }))
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Spot check', isTemplate: true, opensAt: undefined }))
      expect(toast.toastSuccess).toHaveBeenCalledWith('Template created — add its questions')
    })

    it('shows the API error and stays open when creating fails', async () => {
      createMock.mockRejectedValue(new Error('boom'))
      const { dialog, onClose } = open({ kind: 'blank' })
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'X')
      await userEvent.click(dialog.getByRole('button', { name: 'Create & add questions' }))
      expect(toast.toastApiError).toHaveBeenCalledWith(expect.any(Error), 'Could not create survey')
      expect(onClose).not.toHaveBeenCalled()
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })

  describe('One of your templates', () => {
    it('lists templates with who, questions and how answers are kept; search and preview', async () => {
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /^One of your templates/)
      const list = within(dialog.getByRole('radiogroup', { name: 'Your templates' }))
      const wellbeing = list.getByRole('radio', { name: 'Staff wellbeing' })
      expect(wellbeing.closest('label')).toHaveTextContent('For: Employees7 questionsAnonymous')
      expect(list.getByRole('radio', { name: 'Public feedback' }).closest('label')).toHaveTextContent('For: Public4 questionsNamed')
      expect(list.getByRole('radio', { name: 'Empty template' })).toBeDisabled()
      expect(list.getByRole('radio', { name: 'Empty template' }).closest('label')).toHaveTextContent('No questions yet')

      await userEvent.click(list.getByRole('button', { name: 'Preview Staff wellbeing' }))
      expect(screen.getByTestId('template-preview')).toHaveTextContent('t1')

      await userEvent.type(dialog.getByLabelText('Search your templates'), 'public')
      expect(within(dialog.getByRole('radiogroup', { name: 'Your templates' })).getAllByRole('radio')).toHaveLength(1)
    })

    it('starts a survey from a template: name, audience and anonymity prefilled; who it is for fixed', async () => {
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /^One of your templates/)
      expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled()
      await userEvent.click(dialog.getByRole('radio', { name: 'Staff wellbeing' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))

      expect(dialog.getByTestId('new-survey-source')).toHaveTextContent(
        'From template: Staff wellbeing7 questions, with their section headings and settings, are copied into a new draft. The template itself stays unchanged.',
      )
      expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Staff wellbeing')
      expect(dialog.getByTestId('new-survey-target-fixed')).toHaveTextContent('Employees')
      expect(dialog.queryByRole('combobox', { name: 'Who is it for' })).not.toBeInTheDocument()
      // An organisation's own template: anonymity can be changed.
      expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeChecked()
      expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeEnabled()
      expect(dialog.getByTestId('new-survey-description-preview')).toHaveTextContent('How are you doing at work?')
      expect(dialog.getByText(/Leeds/)).toBeInTheDocument()
      expect(dialog.getByText(/Carer/)).toBeInTheDocument()
      // Templates come from blank or the library, so this is never a template itself.
      expect(dialog.queryByRole('checkbox', { name: /Make this a template instead/ })).not.toBeInTheDocument()
      expect(dialog.queryByTestId('new-survey-recommended-timing')).not.toBeInTheDocument()

      await userEvent.clear(dialog.getByRole('textbox', { name: 'Name' }))
      expect(dialog.getByRole('button', { name: 'Create survey' })).toBeDisabled()
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'Wellbeing — winter')
      await userEvent.click(dialog.getByRole('checkbox', { name: /Anonymous responses/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith({
        id: 't1',
        overrides: {
          title: 'Wellbeing — winter',
          targetKind: 'EMPLOYEE',
          isAnonymous: false,
          allowAnonymousResponses: false,
          locationIds: ['loc-1'],
          roleIds: ['jt-1'],
          opensAt: undefined,
          closesAt: undefined,
        },
      })
      expect(toast.toastSuccess).toHaveBeenCalledWith('Survey created from template — check it, then send it')
      expect(navigateMock).toHaveBeenCalledWith({ to: '/surveys/$surveyId', params: { surveyId: 'copy-1' } })
    })

    it('opened from a template ("Use this template") lands on step 2, and Back returns to step 1 with it chosen', async () => {
      const { dialog } = open({
        kind: 'template',
        template: { id: 't1', title: 'Staff wellbeing', targetKind: 'EMPLOYEE', isAnonymous: true, locationIds: [], roleIds: [], questionCount: 7 },
      })
      expect(dialog.getByText('Step 2 of 2 · Details')).toBeInTheDocument()
      expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Staff wellbeing')
      await userEvent.click(dialog.getByRole('button', { name: 'Back' }))
      expect(dialog.getByRole('radio', { name: /^One of your templates/ })).toBeChecked()
      expect(dialog.getByRole('radio', { name: 'Staff wellbeing' })).toBeChecked()
    })

    it('shows the API error when starting from a template fails', async () => {
      duplicateMock.mockRejectedValue(new Error('nope'))
      const { dialog } = open({
        kind: 'template',
        template: { id: 't1', title: 'Staff wellbeing', targetKind: 'EMPLOYEE', isAnonymous: true, locationIds: [], roleIds: [] },
      })
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(toast.toastApiError).toHaveBeenCalledWith(expect.any(Error), 'Could not create from template')
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })

  describe('Ready-made library', () => {
    it('lists ready-made surveys by group, with Read', async () => {
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      const group = dialog.getByRole('radiogroup', { name: 'Ready-made surveys' })
      expect(within(group).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['People we support', 'Staff'])
      expect(within(group).getByRole('radio', { name: 'Annual satisfaction survey' }).closest('label')).toHaveTextContent(
        'For: People we supportOnce a year, February12 questionsConfidential',
      )
      expect(within(group).getByRole('radio', { name: 'Staff pulse' }).closest('label')).toHaveTextContent('In your templates')

      await userEvent.click(within(group).getByRole('button', { name: 'Read Annual satisfaction survey' }))
      expect(screen.getByTestId('ready-made-survey-detail')).toHaveTextContent('We want to hear what you think.')
      await userEvent.click(screen.getByRole('button', { name: 'Choose this survey' }))
      expect(within(group).getByRole('radio', { name: 'Annual satisfaction survey' })).toBeChecked()

      await userEvent.type(dialog.getByLabelText('Search ready-made surveys'), 'pulse')
      expect(within(dialog.getByRole('radiogroup', { name: 'Ready-made surveys' })).getAllByRole('radio')).toHaveLength(1)
    })

    it('adopts a survey not yet adopted, then shows its details: dated name, locked anonymity, timing as a suggestion', async () => {
      adoptMock.mockResolvedValue({
        created: [{ libraryId: 'lib-1', templateId: 'tpl-new', reference: 'SUR-PWS-001', title: 'Annual satisfaction survey' }],
        skipped: [],
      })
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Annual satisfaction survey' }))
      expect(dialog.getByTestId('new-survey-adopt-note')).toHaveTextContent('will be added to your Templates')
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(adoptMock).toHaveBeenCalledWith(['lib-1'])

      expect(dialog.getByTestId('new-survey-source')).toHaveTextContent(
        'From the ready-made survey: Annual satisfaction survey12 questions',
      )
      expect(dialog.getByTestId('new-survey-source')).toHaveTextContent('It has been added to your Templates.')
      // Repeats yearly in February: the next February is suggested.
      expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Annual satisfaction survey — February 2027')
      expect(dialog.getByTestId('new-survey-target-fixed')).toHaveTextContent('Service users')
      const anonymous = dialog.getByRole('checkbox', { name: /Anonymous responses/ })
      expect(anonymous).toBeDisabled()
      expect(anonymous).not.toBeChecked()
      expect(dialog.getByTestId('new-survey-anonymity-reason')).toHaveTextContent(
        'Set by the ready-made survey — its introduction and privacy notice are written for named, confidential answers.',
      )
      expect(dialog.getByTestId('new-survey-recommended-timing')).toHaveTextContent('Recommended: once a year in February')
      expect(dialog.getByTestId('new-survey-recommended-timing')).toHaveTextContent('Nothing is sent or scheduled now')
      expect(dialog.getByTestId('new-survey-description-preview')).toHaveTextContent('Tell us about your care.')

      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith({
        id: 'tpl-new',
        overrides: {
          title: 'Annual satisfaction survey — February 2027',
          targetKind: 'SERVICE_USER',
          isAnonymous: false,
          allowAnonymousResponses: false,
          locationIds: [],
          roleIds: [],
          opensAt: undefined,
          closesAt: undefined,
        },
      })
      // Only a draft is created — nothing is sent or scheduled.
      expect(Object.keys(duplicateMock.mock.calls[0]![0].overrides)).not.toContain('distributeAt')
      expect(navigateMock).toHaveBeenCalledWith({ to: '/surveys/$surveyId', params: { surveyId: 'copy-1' } })
    })

    it('uses the existing template when the survey is already adopted (no second copy)', async () => {
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Staff pulse' }))
      expect(dialog.queryByTestId('new-survey-adopt-note')).not.toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(adoptMock).not.toHaveBeenCalled()
      expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Staff pulse — October–December 2026')
      expect(dialog.getByTestId('new-survey-source')).toHaveTextContent('3 questions, with their section headings')
      expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeChecked()
      expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeDisabled()
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tpl-pulse', overrides: expect.objectContaining({ isAnonymous: true, targetKind: 'EMPLOYEE' }) }),
      )
    })

    it('if someone adopted it meanwhile, carries on from their template', async () => {
      adoptMock.mockResolvedValue({ created: [], skipped: [{ libraryId: 'lib-1', reference: 'SUR-PWS-001', title: 'x', reason: 'Already adopted' }] })
      fetchLibraryMock.mockResolvedValue([{ ...librarySurvey(), adoptedTemplateId: 'tpl-new' }])
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Annual satisfaction survey' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(await dialog.findByText('Step 2 of 2 · Details')).toBeInTheDocument()
      expect(dialog.getByTestId('new-survey-source')).toHaveTextContent('Annual satisfaction survey')
    })

    it('adopted at the same moment: carries on from the template the API returns (no extra lookup)', async () => {
      adoptMock.mockResolvedValue({
        created: [],
        skipped: [{ libraryId: 'lib-1', reference: 'SUR-PWS-001', title: 'x', reason: 'Already adopted', templateId: 'tpl-theirs' }],
      })
      fetchLibraryMock.mockReset()
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Annual satisfaction survey' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(await dialog.findByText('Step 2 of 2 · Details')).toBeInTheDocument()
      expect(fetchLibraryMock).not.toHaveBeenCalled()
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'tpl-theirs' }))
    })

    it('stays on step 1 and explains when adopting fails', async () => {
      adoptMock.mockRejectedValue(new Error('Forbidden'))
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Annual satisfaction survey' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(toast.toastApiError).toHaveBeenCalledWith(expect.any(Error), 'Could not add the ready-made survey to your templates')
      expect(dialog.getByText('Step 1 of 2 · Choose what to start from')).toBeInTheDocument()
    })

    it('"Start a survey now" after adopting opens step 2 with that template (library rules apply)', () => {
      const { dialog } = open({
        kind: 'template',
        template: {
          id: 'tpl-new',
          title: 'Annual satisfaction survey',
          targetKind: 'SERVICE_USER',
          isAnonymous: false,
          locationIds: [],
          roleIds: [],
          questionCount: 12,
          librarySourceId: 'lib-1',
          libraryReference: 'SUR-PWS-001',
        },
      })
      expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Annual satisfaction survey — February 2027')
      expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeDisabled()
      expect(dialog.getByTestId('new-survey-recommended-timing')).toHaveTextContent('Recommended: once a year in February')
      expect(dialog.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })

    it('a named ready-made template with an anonymous version: the version is chosen here and sent', async () => {
      state.links['tpl-new'] = {
        anonymousVariant: {
          introduction: 'We want to hear from you. This survey is anonymous.',
          privacyNotice: 'We never know who answered.',
          questionsLeftOut: ['Would you like someone to contact you about your answers?'],
          alertsLeftOut: ['Someone asks to be contacted'],
        },
      }
      const template = {
        id: 'tpl-new',
        title: 'Annual satisfaction survey',
        targetKind: 'SERVICE_USER' as const,
        isAnonymous: false,
        locationIds: [],
        roleIds: [],
        questionCount: 12,
        librarySourceId: 'lib-1',
        libraryReference: 'SUR-PWS-001',
      }
      const { dialog } = open({ kind: 'template', template })
      const versions = within(dialog.getByRole('group', { name: 'Which version of this ready-made survey?' }))
      expect(versions.getByRole('radio', { name: /^Named/ })).toBeChecked()
      // The fixed anonymity checkbox is replaced by the choice.
      expect(dialog.queryByRole('checkbox', { name: /Anonymous responses/ })).not.toBeInTheDocument()
      await userEvent.click(versions.getByRole('radio', { name: /^Anonymous/ }))
      expect(dialog.getByTestId('new-survey-version-anonymous')).toHaveTextContent(
        'Left out: Would you like someone to contact you about your answers?',
      )
      // Anonymous: "answer without my name" is not offered (every answer is unlinked).
      expect(dialog.queryByRole('checkbox', { name: 'Let people choose to answer without their name' })).not.toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tpl-new', overrides: expect.objectContaining({ isAnonymous: true, allowAnonymousResponses: false }) }),
      )
    })
  })

  describe('branch-restricted users', () => {
    beforeEach(() => {
      state.assignedLocationIds = ['loc-1']
      state.templates = [template({ id: 't-shared', title: 'Company template', locationIds: [], roleIds: [], readOnly: true, isAnonymous: false })]
    })

    it('cannot pick the ready-made library, and are told why', async () => {
      const { dialog } = open({ kind: 'choose' })
      const libraryChoice = dialog.getByRole('radio', { name: /Ready-made library/ })
      expect(libraryChoice).toBeDisabled()
      expect(libraryChoice.closest('label')).toHaveTextContent('shared by every branch, so someone with access to all branches adds them')
      expect(dialog.queryByRole('radiogroup', { name: 'Ready-made surveys' })).not.toBeInTheDocument()
      expect(adoptMock).not.toHaveBeenCalled()
    })

    it('can still start a survey from a shared (read-only) company template', async () => {
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /^One of your templates/)
      const shared = dialog.getByRole('radio', { name: 'Company template' })
      expect(shared.closest('label')).toHaveTextContent('Shared')
      await userEvent.click(shared)
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 't-shared' }))
    })
  })

  describe('Duplicate', () => {
    it('copies a survey on the same form: "(Copy)" name, who it is for can change, no Back', async () => {
      const { dialog } = open({
        kind: 'duplicate',
        survey: { id: 's9', title: 'Spring check-in', targetKind: 'SERVICE_USER', isAnonymous: false, locationIds: [], roleIds: [] },
      })
      expect(dialog.getByRole('heading', { name: 'Duplicate survey' })).toBeInTheDocument()
      expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Spring check-in (Copy)')
      expect(dialog.getByRole('combobox', { name: 'Who is it for' })).toBeInTheDocument()
      expect(dialog.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Duplicate & edit' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's9', overrides: expect.objectContaining({ title: 'Spring check-in (Copy)', targetKind: 'SERVICE_USER' }) }),
      )
      expect(toast.toastSuccess).toHaveBeenCalledWith('Survey duplicated — edit the copy')
    })

    it('a survey started from a ready-made template keeps its anonymity when copied', async () => {
      state.details['s10'] = { id: 's10', anonymityLocked: true, libraryReference: 'SUR-STF-002', librarySourceId: null }
      const { dialog } = open({
        kind: 'duplicate',
        survey: { id: 's10', title: 'Staff pulse', targetKind: 'EMPLOYEE', isAnonymous: true, locationIds: [], roleIds: [] },
      })
      const box = dialog.getByRole('checkbox', { name: /Anonymous responses/ })
      expect(box).toBeDisabled()
      expect(box).toBeChecked()
      expect(dialog.getByTestId('new-survey-anonymity-reason')).toHaveTextContent('Set by the ready-made survey')
      await userEvent.click(dialog.getByRole('button', { name: 'Duplicate & edit' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's10', overrides: expect.objectContaining({ isAnonymous: true }) }),
      )
    })
  })

  describe("Who it's for", () => {
    it('a blank survey sends the group chosen, and the words for Other', async () => {
      const { dialog } = open({ kind: 'blank' })
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'Carer check-in')
      await userEvent.selectOptions(dialog.getByRole('combobox', { name: "Who it's for" }), 'OTHER')
      await userEvent.type(dialog.getByRole('textbox', { name: "Who it's for, in your words" }), 'Night carers')
      await userEvent.click(dialog.getByRole('button', { name: 'Create & add questions' }))
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ audienceGroup: 'OTHER', audienceGroupOther: 'Night carers' }))
    })

    it('a template sends the group chosen for the new survey', async () => {
      const { dialog } = open({
        kind: 'template',
        template: { id: 't1', title: 'Wellbeing', targetKind: 'EMPLOYEE', isAnonymous: false, locationIds: [], roleIds: [], questionCount: 3 },
      })
      await userEvent.selectOptions(dialog.getByRole('combobox', { name: "Who it's for" }), 'CARE_WORKERS')
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1', overrides: expect.objectContaining({ audienceGroup: 'CARE_WORKERS', audienceGroupOther: null }) }),
      )
    })
  })

  describe('"Let people choose to answer without their name"', () => {
    const box = (dialog: ReturnType<typeof within>) =>
      dialog.getByRole('checkbox', { name: 'Let people choose to answer without their name' })

    it('is offered on a named blank survey, off by default, and sent when ticked', async () => {
      const { dialog } = open({ kind: 'blank' })
      expect(box(dialog)).not.toBeChecked()
      expect(box(dialog)).toBeEnabled()
      expect(dialog.getByTestId('new-survey-allow-without-name-help')).toHaveTextContent(/only once the survey has closed and at least 5 people/)
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'Carer check-in')
      await userEvent.click(box(dialog))
      await userEvent.click(dialog.getByRole('button', { name: 'Create & add questions' }))
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: false, allowAnonymousResponses: true }))
    })

    it('is not offered on an anonymous survey (every answer is unlinked there)', async () => {
      const { dialog } = open({ kind: 'blank' })
      await userEvent.click(box(dialog))
      await userEvent.click(dialog.getByRole('checkbox', { name: /Anonymous responses/ }))
      expect(dialog.queryByTestId('new-survey-allow-without-name')).not.toBeInTheDocument()
      await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'Pulse')
      await userEvent.click(dialog.getByRole('button', { name: 'Create & add questions' }))
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true, allowAnonymousResponses: false }))
    })

    it('follows the template, and can be changed for the new survey', async () => {
      state.templates = [template({ id: 't2', title: 'Public feedback', targetKind: 'PUBLIC', isAnonymous: false, allowAnonymousResponses: true })]
      state.details = { t2: { id: 't2', description: null, librarySourceId: null, allowAnonymousResponses: true, anonymousChoiceFixed: null } }
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /^One of your templates/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Public feedback' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(box(dialog)).toBeChecked()
      await userEvent.click(box(dialog))
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't2', overrides: expect.objectContaining({ allowAnonymousResponses: false }) }),
      )
    })

    it('is locked on when the ready-made template promises it', async () => {
      state.library = [librarySurvey({ allowAnonymousResponses: true, adoptedTemplateId: 'tpl-promise', adoptedRevision: 1 })]
      state.details = {
        'tpl-promise': { id: 'tpl-promise', description: null, librarySourceId: 'lib-1', allowAnonymousResponses: true, anonymousChoiceFixed: 'library' },
      }
      const { dialog } = open({ kind: 'choose' })
      await choose(dialog, /Ready-made library/)
      await userEvent.click(dialog.getByRole('radio', { name: 'Annual satisfaction survey' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Next' }))
      expect(box(dialog)).toBeChecked()
      expect(box(dialog)).toBeDisabled()
      expect(dialog.getByTestId('new-survey-allow-without-name-help')).toHaveTextContent(
        'Set by the ready-made survey SUR-PWS-001 — its privacy notice tells people they can answer without their name.',
      )
      await userEvent.click(dialog.getByRole('button', { name: 'Create survey' }))
      expect(duplicateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tpl-promise', overrides: expect.objectContaining({ allowAnonymousResponses: true }) }),
      )
    })
  })

  it('the old separate dialogs are gone: nothing in the survey screens uses SurveyCopyDialog', () => {
    expect(Object.keys(import.meta.glob('/src/features/surveys/components/SurveyCopyDialog.tsx'))).toHaveLength(0)
    const sources = import.meta.glob('/src/features/surveys/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >
    const users = Object.entries(sources)
      .filter(([path]) => !path.endsWith('.test.tsx'))
      .filter(([, text]) => text.includes('SurveyCopyDialog'))
      .map(([path]) => path)
    expect(users).toEqual([])
    // SurveysPage no longer has its own create dialog.
    const page = sources['/src/features/surveys/pages/SurveysPage.tsx']!
    expect(page).toContain('NewSurveyDialog')
    expect(page).not.toContain('Create & add questions')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { SurveyAlertRulesPayload } from '@/features/surveys/alerts/survey-alerts'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

const save = vi.fn().mockResolvedValue({})
const remove = vi.fn().mockResolvedValue({})
const restore = vi.fn().mockResolvedValue({})
const setRole = vi.fn().mockResolvedValue({})
const setNever = vi.fn().mockResolvedValue({})
let payload: SurveyAlertRulesPayload

vi.mock('@/features/surveys/alerts/survey-alerts', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/alerts/survey-alerts')>()),
  useAlertRules: () => ({ data: payload, isLoading: false, isError: false }),
  useSaveAlertRule: () => ({ mutateAsync: save, isPending: false }),
  useDeleteAlertRule: () => ({ mutateAsync: remove, isPending: false }),
  useRestoreLibraryRules: () => ({ mutateAsync: restore, isPending: false }),
  useSetOwnerRole: () => ({ mutateAsync: setRole, isPending: false }),
  useSetNeverRouteTo: () => ({ mutateAsync: setNever, isPending: false }),
}))

import { SurveyAlertRulesPanel } from '@/features/surveys/alerts/SurveyAlertRulesPanel'

const basePayload = (): SurveyAlertRulesPayload => ({
  surveyId: 's1',
  editedOnSurveyId: null,
  isAnonymous: false,
  offersAnswerWithoutName: false,
  fromLibrary: true,
  anonymityNote: null,
  rules: [
    {
      id: 'r1',
      key: 'library-0',
      title: 'Feels unsafe',
      whenText: '"Do you feel safe?" answered Never',
      actionText: 'Pass it to the safeguarding lead.',
      match: 'any',
      minimumAnswers: null,
      conditions: [{ questionKey: 'q-safe', answers: ['Never'], questionText: 'Do you feel safe?' }],
      ownerKey: 'SAFEGUARDING_LEAD',
      ownerLabel: 'Safeguarding lead',
      roleId: null,
      role: { id: 'rm', name: 'Registered Manager', holders: 0 },
      dueWorkingDays: 0,
      dueCalendarDays: null,
      urgent: true,
      recordKind: 'SAFEGUARDING',
      contactRequest: false,
      isActive: true,
      fromLibrary: true,
      problems: [],
    },
  ],
  questions: [
    { key: 'q-safe', questionText: 'Do you feel safe?', answers: ['Always', 'Never'], contactRequest: false },
    { key: 'q-contact', questionText: 'Would you like someone to contact you about your answers?', answers: ['Yes', 'No'], contactRequest: true },
  ],
  owners: [
    { key: 'REGISTERED_MANAGER', label: 'Registered Manager', role: { id: 'rm', name: 'Registered Manager', holders: 0 }, chosen: false },
    { key: 'CARE_COORDINATOR', label: 'Care Coordinator', role: { id: 'cc', name: 'Care Coordinator', holders: 2 }, chosen: false },
  ],
  roles: [
    { id: 'rm', name: 'Registered Manager' },
    { id: 'cc', name: 'Care Coordinator' },
  ],
  manualChecks: [{ when: 'Any comment suggesting abuse.', action: 'Read it and act the same day.' }],
  neverRouteTo: [],
})

describe('SurveyAlertRulesPanel', () => {
  beforeEach(() => {
    payload = basePayload()
    save.mockClear()
  })

  it('lists each alert with its role, timescale and record, and warns when no one has the role', () => {
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    const row = screen.getByTestId('alert-rule')
    expect(within(row).getByText('Feels unsafe')).toBeInTheDocument()
    expect(within(row).getByText('Urgent')).toBeInTheDocument()
    expect(row).toHaveTextContent('Registered Manager (as Safeguarding lead)')
    expect(row).toHaveTextContent('No one has this role yet, so survey managers are told.')
    expect(row).toHaveTextContent('The same working day')
    expect(row).toHaveTextContent('May need a safeguarding concern')
    expect(screen.getByText(/Checked by a person \(1\)/)).toBeInTheDocument()
  })

  it('heads the panel with a count, and an empty survey gets a friendly empty state with the restore option', () => {
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    expect(screen.getByRole('heading', { level: 3, name: 'Alerts: answers that need action' })).toBeInTheDocument()
    expect(screen.getByTestId('alert-count')).toHaveTextContent('1 alert')
    payload = { ...basePayload(), rules: [] }
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    const empty = screen.getByTestId('alerts-empty')
    expect(empty).toHaveTextContent('No alerts yet')
    expect(within(empty).getByRole('button', { name: /Restore ready-made alerts/ })).toBeInTheDocument()
    expect(screen.getAllByTestId('alert-count').at(-1)).toHaveTextContent('No alerts')
  })

  it('shows the anonymity note and no editing on a period', () => {
    payload = { ...basePayload(), editedOnSurveyId: 'src', anonymityNote: 'Answers to this survey are linked to no one.' }
    render(<SurveyAlertRulesPanel surveyId="p1" canEdit />)
    expect(screen.getByText('Answers to this survey are linked to no one.')).toBeInTheDocument()
    expect(screen.getByText(/This period uses the repeating survey’s alerts/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add alert' })).not.toBeInTheDocument()
  })

  it('adds an alert from chosen answers', async () => {
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    fireEvent.click(screen.getByRole('button', { name: 'Add alert' }))
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Wants a call' } })
    fireEvent.change(screen.getByLabelText('Question 1'), { target: { value: 'q-contact' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Yes' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /contact-me list/ }))
    fireEvent.change(screen.getByLabelText(/What to do/), { target: { value: 'Call them within 5 working days.' } })
    fireEvent.change(screen.getByLabelText('Time to do it in'), { target: { value: '5' } })
    expect(screen.getByText(/Within 5 working days \(0 = the same working day\)\. Weekends and bank holidays/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add alert' }).at(-1)!)
    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].input).toMatchObject({
      title: 'Wants a call',
      conditions: [{ questionKey: 'q-contact', answers: ['Yes'] }],
      contactRequest: true,
      dueWorkingDays: 5,
      ownerKey: 'REGISTERED_MANAGER',
      match: 'any',
    })
  })

  it('combines questions with "all of them" and a "none of these chosen" condition', async () => {
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    fireEvent.click(screen.getByRole('button', { name: 'Add alert' }))
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Unsafe and wants a call' } })
    fireEvent.click(screen.getByRole('radio', { name: 'All of them together' }))
    fireEvent.change(screen.getByLabelText('Question 1'), { target: { value: 'q-safe' } })
    fireEvent.change(screen.getByLabelText('Fires when'), { target: { value: 'not' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Always' }))
    fireEvent.click(screen.getByRole('button', { name: 'And another question' }))
    fireEvent.change(screen.getByLabelText('Question 2'), { target: { value: 'q-contact' } })
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Yes' })[0])
    fireEvent.change(screen.getByLabelText(/What to do/), { target: { value: 'Call them today.' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Add alert' }).at(-1)!)
    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls[0][0].input).toMatchObject({
      match: 'all',
      conditions: [
        { questionKey: 'q-safe', answers: ['Always'], not: true },
        { questionKey: 'q-contact', answers: ['Yes'] },
      ],
    })
  })

  it('keeps a ready-made combination it cannot show, and asks for a minimum only where names can be left off', () => {
    payload = { ...basePayload(), isAnonymous: true, rules: [{ ...basePayload().rules[0]!, match: 'mixed' }] }
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    fireEvent.click(screen.getByRole('button', { name: 'Change alert: Feels unsafe' }))
    expect(screen.getByTestId('alert-mixed-conditions')).toBeInTheDocument()
    expect(screen.getByLabelText(/raise only if at least this many answered/)).toBeInTheDocument()
  })

  it('sets a timescale in calendar days ("within 7 days")', async () => {
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    fireEvent.click(screen.getByRole('button', { name: 'Change alert: Feels unsafe' }))
    fireEvent.change(screen.getByLabelText('Day type'), { target: { value: 'calendar' } })
    fireEvent.change(screen.getByLabelText('Time to do it in'), { target: { value: '7' } })
    expect(screen.getByText(/Within 7 days, as a policy says it/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save alert' }))
    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls.at(-1)![0].input).toMatchObject({ dueCalendarDays: 7 })
    expect(save.mock.calls.at(-1)![0].input).not.toHaveProperty('dueWorkingDays')
  })

  it('never offers the contact-me list on an anonymous survey', () => {
    payload = { ...basePayload(), isAnonymous: true }
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    fireEvent.click(screen.getByRole('button', { name: 'Add alert' }))
    expect(screen.queryByRole('checkbox', { name: /contact-me list/ })).not.toBeInTheDocument()
  })

  it('chooses the organisation role for a library role', async () => {
    render(<SurveyAlertRulesPanel surveyId="s1" canEdit />)
    fireEvent.click(screen.getByRole('button', { name: /Who handles alerts/ }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Care Coordinator' }), { target: { value: 'rm' } })
    await vi.waitFor(() => expect(setRole).toHaveBeenCalledWith({ ownerKey: 'CARE_COORDINATOR', roleId: 'rm' }))
    // A role this survey rates: its alerts never go to it.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Care Coordinator' }))
    await vi.waitFor(() => expect(setNever).toHaveBeenCalledWith(['CARE_COORDINATOR']))
  })
})

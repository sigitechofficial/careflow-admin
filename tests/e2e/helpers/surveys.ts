/**
 * A throwaway public survey for the accessibility scan: made through the API before the scan and
 * deleted after it, so no real survey or answer is touched. Its title starts "E2E A11Y".
 */

const API = process.env.E2E_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

export type A11ySurvey = { id: string; title: string; shareToken: string }

async function call<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${text.slice(0, 300)}`)
  const json = text ? (JSON.parse(text) as { data?: T }) : {}
  return (json.data ?? json) as T
}

/** One of each kind of question, two of them required (so the answer page can show its errors), in two sections. */
export async function createA11ySurvey(token: string): Promise<A11ySurvey> {
  const title = `E2E A11Y survey ${new Date().toISOString().slice(0, 16)}`
  const survey = await call<{ id: string }>(token, 'POST', '/surveys', {
    title,
    description: 'Made by the accessibility scan and deleted after it.',
    targetKind: 'PUBLIC',
  })
  const questions = [
    { questionText: 'Were you treated with respect?', questionType: 'YES_NO', isRequired: true, sectionTitle: 'Your visits', helpText: 'Think about the last month.' },
    { questionText: 'How do you rate your care overall?', questionType: 'RATING', config: { min: 1, max: 5 }, isRequired: true, sectionTitle: 'Your visits' },
    {
      questionText: 'Which help do you get?',
      questionType: 'MULTI_SELECT',
      options: ['Washing', 'Meals', 'Medicines'],
      sectionTitle: 'Your support',
      otherOption: { label: 'Other (please tell us)', textPrompt: 'What else do we help with?', textRequired: true },
    },
    { questionText: 'Do carers listen to you?', questionType: 'LIKERT', sectionTitle: 'Your support' },
    { questionText: 'How many carers visit you?', questionType: 'NUMBER', sectionTitle: 'Your support' },
    { questionText: 'Anything else you would like to tell us?', questionType: 'TEXTAREA', sectionTitle: 'Your support' },
  ]
  try {
    for (const q of questions) await call(token, 'POST', `/surveys/${survey.id}/questions`, q)
    const published = await call<{ shareToken?: string | null }>(token, 'POST', `/surveys/${survey.id}/publish`, {})
    if (!published.shareToken) throw new Error('Publishing the survey gave no shared link')
    return { id: survey.id, title, shareToken: published.shareToken }
  } catch (err) {
    await deleteA11ySurvey(token, survey.id)
    throw err
  }
}

export async function deleteA11ySurvey(token: string, id: string): Promise<void> {
  await call(token, 'POST', `/surveys/${id}/close`, {}).catch(() => undefined)
  await call(token, 'DELETE', `/surveys/${id}`)
}

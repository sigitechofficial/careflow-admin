import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SummernoteCustomEditor } from '@/shared/ui/summernote-custom-editor'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = true
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  constructor() {
    FakeRecognition.last = this
  }
  start() {}
  stop() {}
  abort() {}
  say(transcript: string, isFinal = true) {
    const result = Object.assign([{ transcript }], { isFinal })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}

function Editor({ onHtml }: { onHtml: (html: string) => void }) {
  const [value, setValue] = React.useState('<p>Lives alone</p>')
  return (
    <SummernoteCustomEditor
      dictation
      value={value}
      onChange={(html) => {
        setValue(html)
        onHtml(html)
      }}
    />
  )
}

describe('SummernoteCustomEditor dictation', () => {
  beforeEach(() => {
    ;(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition
  })
  afterEach(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    FakeRecognition.last = null
  })

  it('writes words into the editor as they are spoken; the final words replace them', async () => {
    let html = ''
    render(<Editor onHtml={(h) => (html = h)} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dictate (speech to text)' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!

    act(() => rec.say('with a', false))
    expect(html).toBe('<p>Lives alone with a</p>')
    act(() => rec.say('with a cat and', false))
    expect(html).toBe('<p>Lives alone with a cat and</p>')
    act(() => rec.say('with a cat and dog'))
    expect(html).toBe('<p>Lives alone with a cat and dog</p>')
    act(() => rec.say('uses', false))
    expect(html).toBe('<p>Lives alone with a cat and dog uses</p>')

    // Listening ends: the words shown stay.
    act(() => rec.onend?.())
    expect(html).toBe('<p>Lives alone with a cat and dog uses</p>')
  })

  it('undoes a finished phrase in one step, without leaving the words shown while it was spoken', async () => {
    let html = ''
    render(<Editor onHtml={(h) => (html = h)} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dictate (speech to text)' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!

    act(() => rec.say('with a', false))
    act(() => rec.say('with a cat'))
    expect(html).toBe('<p>Lives alone with a cat</p>')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(html).toBe('<p>Lives alone</p>')
  })
})

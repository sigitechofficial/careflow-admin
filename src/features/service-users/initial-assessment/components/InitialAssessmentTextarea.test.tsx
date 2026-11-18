import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import {
  InitialAssessmentTextarea,
  readInitialAssessmentTextareaValue,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'

describe('readInitialAssessmentTextareaValue', () => {
  it('reads the editor HTML, so saving and loading it back adds no empty lines', async () => {
    let setValue: (v: string) => void = () => {}
    function Host({ initial }: { initial: string }) {
      const [value, set] = React.useState(initial)
      setValue = set
      return <InitialAssessmentTextarea id="q1" value={value} onChange={(e) => set(e.target.value)} />
    }

    const { unmount } = render(<Host initial="" />)
    await act(async () => {})
    const host = () => document.getElementById('q1')
    // An empty field reads as empty, not as the placeholder / trailing-break markup.
    expect(readInitialAssessmentTextareaValue(host())).toBe('')
    unmount()

    render(<Host initial="<p>Lives alone</p>" />)
    await act(async () => {})
    // What autosave does: read the live editor and put that back as the value, several times.
    for (let i = 0; i < 3; i++) {
      const read = readInitialAssessmentTextareaValue(host())
      act(() => setValue(read))
      await act(async () => {})
    }
    expect(readInitialAssessmentTextareaValue(host())).toBe('<p>Lives alone</p>')
    expect(host()?.querySelectorAll('.ProseMirror br:not(.ProseMirror-trailingBreak)')).toHaveLength(0)
  })
})

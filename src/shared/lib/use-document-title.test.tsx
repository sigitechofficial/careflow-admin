import { describe, expect, it } from 'vitest'
import * as React from 'react'
import { render } from '@testing-library/react'
import { useDocumentTitle } from '@/shared/lib/use-document-title'

function Layout({ title, children }: { title: string; children?: React.ReactNode }) {
  useDocumentTitle(title)
  return <>{children}</>
}
function Page({ title }: { title: string | null }) {
  useDocumentTitle(title)
  return null
}

describe('useDocumentTitle', () => {
  it('a page title wins over its layout, and the layout title comes back when the page goes', () => {
    document.title = 'App'
    const { rerender, unmount } = render(
      <Layout title="Surveys – CareAdmin">
        <Page title="Results: Staff survey – CareAdmin" />
      </Layout>,
    )
    expect(document.title).toBe('Results: Staff survey – CareAdmin')
    // Navigating: the layout's route title changes and the page leaves in the same render.
    rerender(<Layout title="Home – CareAdmin" />)
    expect(document.title).toBe('Home – CareAdmin')
    unmount()
    expect(document.title).toBe('App')
  })

  it('a page still loading (no title yet) leaves the layout title', () => {
    render(
      <Layout title="Survey – CareAdmin">
        <Page title={null} />
      </Layout>,
    )
    expect(document.title).toBe('Survey – CareAdmin')
  })
})

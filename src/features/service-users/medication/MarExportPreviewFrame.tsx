import * as React from 'react'
import { patchMarExportPreviewHtml } from '@/features/service-users/medication/mar-export-preview'

export type MarExportPreviewFrameHandle = {
  print: () => void
}

type MarExportPreviewFrameProps = {
  html: string
  includeHeader: boolean
  includeLegend: boolean
}

export const MarExportPreviewFrame = React.forwardRef<
  MarExportPreviewFrameHandle,
  MarExportPreviewFrameProps
>(function MarExportPreviewFrame({ html, includeHeader, includeLegend }, ref) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [frameHeight, setFrameHeight] = React.useState(480)

  const srcDoc = React.useMemo(
    () => patchMarExportPreviewHtml(html, { includeHeader, includeLegend }),
    [html, includeHeader, includeLegend],
  )

  const measureHeight = React.useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.body) return
    const next = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) + 16
    setFrameHeight(next)
  }, [])

  React.useImperativeHandle(ref, () => ({
    print: () => {
      const win = iframeRef.current?.contentWindow
      if (!win) return
      win.focus()
      win.print()
    },
  }))

  return (
    <iframe
      ref={iframeRef}
      title="MAR export preview"
      className="block w-full border-0 bg-white"
      style={{ height: frameHeight }}
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      onLoad={measureHeight}
    />
  )
})

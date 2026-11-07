import * as React from 'react'
import QRCode from 'qrcode'
import { cn } from '@/shared/lib/utils'

/**
 * A QR code for a survey link, drawn in the browser as SVG (nothing is sent anywhere). Error
 * correction M: still reads when a printed poster is a little marked or folded.
 */
export function useQrSvg(url: string | null): string | null {
  const [svg, setSvg] = React.useState<string | null>(null)
  React.useEffect(() => {
    let live = true
    if (!url) {
      setSvg(null)
      return
    }
    QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(s => {
        if (live) setSvg(s)
      })
      .catch(() => {
        if (live) setSvg(null)
      })
    return () => {
      live = false
    }
  }, [url])
  return svg
}

export function SurveyQrCode({ url, label, className }: { url: string; label: string; className?: string }) {
  const svg = useQrSvg(url)
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('aspect-square bg-white [&>svg]:h-full [&>svg]:w-full', className)}
      data-testid="survey-qr"
      // The SVG comes from the qrcode library for our own URL: paths only, no script.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}

/** Save the QR code as an SVG file (sharp at any size, for leaflets and newsletters). */
export async function downloadQrSvg(url: string, fileName: string): Promise<void> {
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 })
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

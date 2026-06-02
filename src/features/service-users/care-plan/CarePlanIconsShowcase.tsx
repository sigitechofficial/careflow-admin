import * as React from 'react'
import { useStandardCarePictures } from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { Loader2 } from 'lucide-react'

type FigmaManifest = {
  icons?: { name: string; slug: string; file: string }[]
}

/** Dev/reference grid: all standard + optional Figma-exported care plan icons. */
export function CarePlanIconsShowcase() {
  const { data: standardRows, isLoading: standardLoading, error: standardError } = useStandardCarePictures()
  const [figma, setFigma] = React.useState<{ name: string; file: string }[]>([])
  const [figmaLoading, setFigmaLoading] = React.useState(true)
  const [figmaError, setFigmaError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setFigmaLoading(true)
      setFigmaError(null)
      try {
        const [figmaManifestRes, staticManifestRes] = await Promise.all([
          fetch('/care-plan-icons/figma/manifest.json').catch(() => null),
          fetch('/care-plan-icons/standard/manifest.json').catch(() => null),
        ])
        if (cancelled) return

        if (figmaManifestRes?.ok) {
          const manifest = (await figmaManifestRes.json()) as FigmaManifest
          setFigma(manifest.icons ?? [])
        } else {
          setFigma([])
        }

        if (!standardRows?.length && staticManifestRes?.ok) {
          const m = (await staticManifestRes.json()) as FigmaManifest
          void m
        }
      } catch {
        if (!cancelled) setFigmaError('Could not load Figma icon manifest.')
      } finally {
        if (!cancelled) setFigmaLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [standardRows?.length])

  const loading = standardLoading || figmaLoading
  const error =
    standardError instanceof Error
      ? standardError.message
      : figmaError

  const standard = React.useMemo(() => {
    const apiIcons = (standardRows ?? []).filter(r => r.fileUrl).map(r => ({ name: r.name, fileUrl: r.fileUrl }))
    return apiIcons
  }, [standardRows])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className="space-y-6" data-testid="care-plan-icons-showcase">
      {figma.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#0f766e]">Figma exports</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            From node 354-10508 — run <code className="rounded bg-muted px-1">pnpm run fetch:figma-icons</code> with{' '}
            <code className="rounded bg-muted px-1">FIGMA_ACCESS_TOKEN</code> set.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {figma.map(icon => (
              <div
                key={icon.file}
                className="flex flex-col items-center gap-1 rounded border border-[#c5cdd6] bg-white p-2 shadow-sm"
              >
                <StandardIconImage
                  src={icon.file}
                  label={icon.name}
                  className="h-12 w-12"
                  imgClassName="h-12 w-12"
                />
                <span className="max-w-full truncate text-center text-[10px] text-[#475569]">{icon.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#0f766e]">Standard gallery icons</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Used on care plan cards when a form has a standard <code className="rounded bg-muted px-1">pictureUrl</code>.
        </p>
        {standard.length === 0 ? (
          <p className="text-sm text-muted-foreground">No standard icons in the gallery API.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {standard.map(icon => (
              <div
                key={icon.fileUrl}
                className="flex flex-col items-center gap-1 rounded border border-[#c5cdd6] bg-white p-2 shadow-sm"
              >
                <StandardIconImage
                  src={icon.fileUrl}
                  label={icon.name}
                  className="h-12 w-12"
                  imgClassName="h-12 w-12"
                />
                <span className="max-w-full truncate text-center text-[10px] text-[#475569]">{icon.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

import { cn } from '@/shared/lib/utils'
import paintbrush from '@interests/paintbrush.svg?raw'
import prayingHands from '@interests/praying-hands.svg?raw'
import mapLocationPin from '@interests/map-location-pin.svg?raw'
import earListening from '@interests/ear-listening.svg?raw'

export type InterestsIconId =
  | 'hobbiesAndInterests'
  | 'religiousSpiritualPreferences'
  | 'whereIAmFrom'
  | 'whatILikeToTalkAbout'

const INTERESTS_ICONS: Record<InterestsIconId, { raw: string; viewBox: string }> = {
  hobbiesAndInterests: { raw: paintbrush, viewBox: '148 43 507 546' },
  religiousSpiritualPreferences: { raw: prayingHands, viewBox: '105 42 859 1026' },
  whereIAmFrom: { raw: mapLocationPin, viewBox: '81 50 1039 944' },
  whatILikeToTalkAbout: { raw: earListening, viewBox: '56 50 1028 767' },
}

function prepareInlineSvg(raw: string, viewBox: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(
      /<svg\b[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
    )
}

export function InterestsIcon({ id, className }: { id: InterestsIconId; className?: string }) {
  const { raw, viewBox } = INTERESTS_ICONS[id]

  return (
    <span
      className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full',
        'sm:h-16 sm:w-16',
        className,
      )}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: prepareInlineSvg(raw, viewBox) }}
    />
  )
}

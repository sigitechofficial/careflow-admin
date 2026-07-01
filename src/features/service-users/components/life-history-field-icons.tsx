import { cn } from '@/shared/lib/utils'
import avatarWoman from '@life_history/avatar-woman.svg?raw'
import myChildhood from '@life_history/my-childhood.svg?raw'
import myEducation from '@life_history/my-education.svg?raw'
import myOccupation from '@life_history/my-occupation.svg?raw'
import myAdulthood from '@life_history/my-adulthood.svg?raw'
import starThumbsUp from '@life_history/star-thumbs-up.svg?raw'

export type LifeHistoryIconId =
  | 'familyAndFriends'
  | 'myChildhood'
  | 'myEducation'
  | 'myOccupation'
  | 'myAdulthood'
  | 'lifeHistoryFavourites'

const LIFE_HISTORY_ICONS: Record<LifeHistoryIconId, { raw: string; viewBox: string }> = {
  familyAndFriends: { raw: avatarWoman, viewBox: '42 -5 860 894' },
  myChildhood: { raw: myChildhood, viewBox: '42 -5 925 920' },
  myEducation: { raw: myEducation, viewBox: '41 -5 926 660' },
  myOccupation: { raw: myOccupation, viewBox: '32 -5 935 894' },
  myAdulthood: { raw: myAdulthood, viewBox: '41 -5 926 751' },
  lifeHistoryFavourites: { raw: starThumbsUp, viewBox: '31 41 706 632' },
}

function prepareInlineSvg(raw: string, viewBox: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(
      /<svg\b[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
    )
}

export function LifeHistoryIcon({ id, className }: { id: LifeHistoryIconId; className?: string }) {
  const { raw, viewBox } = LIFE_HISTORY_ICONS[id]

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

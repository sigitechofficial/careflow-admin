import { cn } from '@/shared/lib/utils'
import drinks from '@favourite_things/drinks.svg?raw'
import starThumbsUp from '@favourite_things/star-thumbs-up.svg?raw'
import radio from '@favourite_things/radio.svg?raw'
import artsHobbies from '@favourite_things/arts-hobbies.svg?raw'
import house from '@favourite_things/house.svg?raw'
import bookPencil from '@favourite_things/book-pencil.svg?raw'

export type FavouriteThingsIconId =
  | 'foodDrinksLike'
  | 'foodDrinksDontLike'
  | 'favouriteItems'
  | 'tvProgrammes'
  | 'favouriteActivities'
  | 'favouriteRooms'
  | 'favouriteOther'

const FAVOURITE_THINGS_ICONS: Record<FavouriteThingsIconId, { raw: string; viewBox: string }> = {
  foodDrinksLike: { raw: drinks, viewBox: '33 34 728 629' },
  foodDrinksDontLike: { raw: drinks, viewBox: '33 34 728 629' },
  favouriteItems: { raw: starThumbsUp, viewBox: '31 41 706 632' },
  tvProgrammes: { raw: radio, viewBox: '32 38 678 687' },
  favouriteActivities: { raw: artsHobbies, viewBox: '35 33 715 696' },
  favouriteRooms: { raw: house, viewBox: '-5 -6 609 539' },
  favouriteOther: { raw: bookPencil, viewBox: '36 31 717 555' },
}

function prepareInlineSvg(raw: string, viewBox: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(
      /<svg\b[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
    )
}

export function FavouriteThingsIcon({ id, className }: { id: FavouriteThingsIconId; className?: string }) {
  const { raw, viewBox } = FAVOURITE_THINGS_ICONS[id]

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

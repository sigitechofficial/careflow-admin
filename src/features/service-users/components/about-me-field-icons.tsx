import { cn } from '@/shared/lib/utils'
import avatarWomanYellow from '@about_me_svgs/avatar-woman-yellow.svg?raw'
import avatarManGreyHair from '@about_me_svgs/avatar-man-grey-hair.svg?raw'
import avatarManSerious from '@about_me_svgs/avatar-man-serious.svg?raw'
import groupThreePeople from '@about_me_svgs/group-three-people.svg?raw'
import strengthsFlexBrain from '@about_me_svgs/strengths-flex-brain.svg?raw'
import stopHand from '@about_me_svgs/stop-hand.svg?raw'
import checklistOnHand from '@about_me_svgs/checklist-on-hand.svg?raw'
import thumbsUpPerson from '@about_me_svgs/thumbs-up-person.svg?raw'
import openBookPencil from '@about_me_svgs/open-book-pencil.svg?raw'
import avatarWoman from '@life_history/avatar-woman.svg?raw'

export type AboutMeMainIconId =
  | 'whatIsMostImportantToMe'
  | 'peopleImportantToMe'
  | 'howICommunicate'
  | 'myWellness'
  | 'whatMakesAGoodDay'
  | 'whatMakesMeHappy'
  | 'whatMakesMeUnhappy'
  | 'whatMakesABadDay'
  | 'howAndWhenToSupportMe'
  | 'alsoWorthKnowing'
  | 'supportedToWriteThisBy'

const ABOUT_ME_MAIN_ICONS: Record<AboutMeMainIconId, { raw: string; viewBox: string }> = {
  whatIsMostImportantToMe: { raw: avatarWoman, viewBox: '42 -5 860 894' },
  peopleImportantToMe: { raw: groupThreePeople, viewBox: '135 127 844 725' },
  howICommunicate: { raw: avatarWoman, viewBox: '42 -5 860 894' },
  myWellness: { raw: strengthsFlexBrain, viewBox: '68 149 926 949' },
  whatMakesAGoodDay: { raw: avatarManGreyHair, viewBox: '76 175 827 875' },
  whatMakesMeHappy: { raw: avatarWomanYellow, viewBox: '207 147 597 720' },
  whatMakesMeUnhappy: { raw: stopHand, viewBox: '328 153 600 815' },
  whatMakesABadDay: { raw: avatarManSerious, viewBox: '156 178 671 889' },
  howAndWhenToSupportMe: { raw: checklistOnHand, viewBox: '106 23 1126 1083' },
  alsoWorthKnowing: { raw: thumbsUpPerson, viewBox: '94 0 1139 987' },
  supportedToWriteThisBy: { raw: openBookPencil, viewBox: '100 23 1144 927' },
}

function prepareInlineSvg(raw: string, viewBox: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(
      /<svg\b[^>]*>/i,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
    )
}

export function AboutMeMainIcon({ id, className }: { id: AboutMeMainIconId; className?: string }) {
  const { raw, viewBox } = ABOUT_ME_MAIN_ICONS[id]

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

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BookOpen,
  BookmarkCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  LifeBuoy,
  Link2,
  Loader2,
  Palette,
  RotateCcw,
  ScanFace,
  Star,
  UserCircle,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  ABOUT_ME_REF_TYPE,
  type AboutMeV1,
  type RoutineDay,
  type RoutineSlot,
  defaultAboutMe,
  mergeAboutMeReference,
  parseAboutMeFromReferences,
  ROUTINE_DAY_LABEL,
  ROUTINE_DAYS,
  ROUTINE_SLOT_LABEL,
  ROUTINE_SLOTS,
} from '@/features/service-users/service-user-about-me'
import { type ServiceUserDetail } from '@/features/service-users/types'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { cn } from '@/shared/lib/utils'
import { AboutMeMainIcon, type AboutMeMainIconId } from '@/features/service-users/components/about-me-field-icons'
import { InterestsIcon, type InterestsIconId } from '@/features/service-users/components/interests-field-icons'
import { LifeHistoryIcon, type LifeHistoryIconId } from '@/features/service-users/components/life-history-field-icons'
import { DailyRoutineIcon } from '@/features/service-users/components/daily-routine-field-icons'
import { SupportNeedIcon, type SupportNeedIconId } from '@/features/service-users/components/support-need-field-icons'
import { FavouriteThingsIcon, type FavouriteThingsIconId } from '@/features/service-users/components/favourite-things-field-icons'

const ABOUT_SUBTABS: ReadonlyArray<{ id: string; label: string; Icon: LucideIcon }> = [
  { id: 'about-main', label: 'About Me', Icon: UserCircle },
  { id: 'interests', label: 'Interests', Icon: Palette },
  { id: 'history', label: 'My Life History', Icon: BookOpen },
  { id: 'routine', label: 'My Daily Routine', Icon: CalendarClock },
  { id: 'support', label: 'Support I Need', Icon: LifeBuoy },
  { id: 'favourites', label: 'My Favourite Things', Icon: Star },
  { id: 'id-chars', label: 'Identification Characteristics', Icon: Fingerprint },
]

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        'bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400',
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  )
}

function AboutField({
  icon: Icon,
  aboutIcon,
  interestIcon,
  lifeHistoryIcon,
  supportNeedIcon,
  favouriteThingsIcon,
  label,
  value,
  onChange,
  hint,
}: {
  icon?: LucideIcon
  aboutIcon?: AboutMeMainIconId
  interestIcon?: InterestsIconId
  lifeHistoryIcon?: LifeHistoryIconId
  supportNeedIcon?: SupportNeedIconId
  favouriteThingsIcon?: FavouriteThingsIconId
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-start gap-3 sm:gap-4">
        {aboutIcon ? (
          <AboutMeMainIcon id={aboutIcon} />
        ) : interestIcon ? (
          <InterestsIcon id={interestIcon} />
        ) : lifeHistoryIcon ? (
          <LifeHistoryIcon id={lifeHistoryIcon} />
        ) : supportNeedIcon ? (
          <SupportNeedIcon id={supportNeedIcon} />
        ) : favouriteThingsIcon ? (
          <FavouriteThingsIcon id={favouriteThingsIcon} />
        ) : Icon ? (
          <FieldIcon icon={Icon} />
        ) : null}
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium text-foreground">{label}</label>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <textarea
        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
      />
    </div>
  )
}

function AboutUrlCard({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-start gap-3">
        <FieldIcon icon={Link2} />
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium text-foreground">{label}</label>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Input
        type="url"
        className="border-border"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
      />
    </div>
  )
}

export function ServiceUserAboutMeForm({
  serviceUserId,
  detail,
  onSaved,
}: {
  serviceUserId: string
  detail: ServiceUserDetail
  onSaved: (d: ServiceUserDetail) => void
}) {
  const canUpdate = useAuthStore((s) => s.can('service_users.update'))
  const updateMutation = useUpdateServiceUser(serviceUserId)
  const [sub, setSub] = React.useState<string>('about-main')
  const [about, setAbout] = React.useState<AboutMeV1>(() => parseAboutMeFromReferences(detail.references))
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState(false)
  const saving = updateMutation.isPending

  const aboutBlob = detail.references.find((r) => r.referenceType === ABOUT_ME_REF_TYPE)?.referenceValue ?? ''
  React.useEffect(() => {
    setAbout(parseAboutMeFromReferences(detail.references))
  }, [detail.id, aboutBlob])

  function setRoutine(day: RoutineDay, slot: RoutineSlot, v: string) {
    setAbout((p) => ({
      ...p,
      routine: {
        ...p.routine,
        [day]: { ...p.routine[day], [slot]: v },
      },
    }))
  }

  async function onSave() {
    if (!canUpdate) return
    setError(null)
    setOk(false)
    try {
      const references = mergeAboutMeReference(detail.references, about)
      await updateMutation.mutateAsync({ body: { references } })
      onSaved(detail)
      setOk(true)
      toastSuccess('About Me saved', 'Your changes were applied successfully.')
      window.setTimeout(() => setOk(false), 4000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <div className="-mx-1 overflow-x-auto border-b border-border">
          <TabsList variant="underline" className="min-w-max bg-transparent px-1">
            {ABOUT_SUBTABS.map((t) => {
              const TabIcon = t.Icon
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  variant="underline"
                  className="shrink-0 gap-1.5 px-2.5 text-xs sm:px-3 sm:text-sm data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
                >
                  <TabIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {t.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <TabsContent value="about-main" className="mt-6 space-y-6">
          <AboutField
            aboutIcon="whatIsMostImportantToMe"
            label="What is most important to me"
            value={about.whatIsMostImportantToMe}
            onChange={(v) => setAbout((p) => ({ ...p, whatIsMostImportantToMe: v }))}
          />
          <AboutField
            aboutIcon="peopleImportantToMe"
            label="People who are important to me"
            value={about.peopleImportantToMe}
            onChange={(v) => setAbout((p) => ({ ...p, peopleImportantToMe: v }))}
          />
          <AboutUrlCard
            label="External About Me link"
            hint="Optional link to another care record or editor (for example ePlan Care resident view)."
            value={about.externalAboutMeUrl}
            onChange={(v) => setAbout((p) => ({ ...p, externalAboutMeUrl: v }))}
          />
          <AboutField
            aboutIcon="howICommunicate"
            label="How I communicate and how to communicate with me"
            value={about.howICommunicate}
            onChange={(v) => setAbout((p) => ({ ...p, howICommunicate: v }))}
          />
          <AboutField
            aboutIcon="myWellness"
            label="My wellness"
            value={about.myWellness}
            onChange={(v) => setAbout((p) => ({ ...p, myWellness: v }))}
          />
          <AboutField
            aboutIcon="whatMakesAGoodDay"
            label="What makes a good day"
            value={about.whatMakesAGoodDay}
            onChange={(v) => setAbout((p) => ({ ...p, whatMakesAGoodDay: v }))}
          />
          <AboutField
            aboutIcon="whatMakesMeHappy"
            label="What makes me happy (please do!)"
            value={about.whatMakesMeHappy}
            onChange={(v) => setAbout((p) => ({ ...p, whatMakesMeHappy: v }))}
          />
          <AboutField
            aboutIcon="whatMakesMeUnhappy"
            label="What makes me unhappy (please don't!)"
            value={about.whatMakesMeUnhappy}
            onChange={(v) => setAbout((p) => ({ ...p, whatMakesMeUnhappy: v }))}
          />
          <AboutField
            aboutIcon="whatMakesABadDay"
            label="What makes a bad day"
            value={about.whatMakesABadDay}
            onChange={(v) => setAbout((p) => ({ ...p, whatMakesABadDay: v }))}
          />
          <AboutField
            aboutIcon="howAndWhenToSupportMe"
            label="How and when to support me"
            value={about.howAndWhenToSupportMe}
            onChange={(v) => setAbout((p) => ({ ...p, howAndWhenToSupportMe: v }))}
          />
          <AboutField
            aboutIcon="alsoWorthKnowing"
            label="Also worth knowing about me"
            value={about.alsoWorthKnowing}
            onChange={(v) => setAbout((p) => ({ ...p, alsoWorthKnowing: v }))}
          />
          <AboutField
            aboutIcon="supportedToWriteThisBy"
            label="Supported to write this by"
            value={about.supportedToWriteThisBy}
            onChange={(v) => setAbout((p) => ({ ...p, supportedToWriteThisBy: v }))}
          />
        </TabsContent>

        <TabsContent value="interests" className="mt-6 space-y-6">
          <AboutField
            interestIcon="hobbiesAndInterests"
            label="Hobbies and interests"
            value={about.hobbiesAndInterests}
            onChange={(v) => setAbout((p) => ({ ...p, hobbiesAndInterests: v }))}
          />
          <AboutField
            interestIcon="religiousSpiritualPreferences"
            label="Religious and/or spiritual preferences"
            value={about.religiousSpiritualPreferences}
            onChange={(v) => setAbout((p) => ({ ...p, religiousSpiritualPreferences: v }))}
          />
          <AboutField
            interestIcon="whereIAmFrom"
            label="Where I am from"
            value={about.whereIAmFrom}
            onChange={(v) => setAbout((p) => ({ ...p, whereIAmFrom: v }))}
          />
          <AboutField
            interestIcon="whatILikeToTalkAbout"
            label="What I like to talk about"
            value={about.whatILikeToTalkAbout}
            onChange={(v) => setAbout((p) => ({ ...p, whatILikeToTalkAbout: v }))}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-6">
          <AboutField
            lifeHistoryIcon="familyAndFriends"
            label="Family and friends"
            value={about.familyAndFriends}
            onChange={(v) => setAbout((p) => ({ ...p, familyAndFriends: v }))}
          />
          <AboutField
            lifeHistoryIcon="myChildhood"
            label="My childhood"
            value={about.myChildhood}
            onChange={(v) => setAbout((p) => ({ ...p, myChildhood: v }))}
          />
          <AboutField
            lifeHistoryIcon="myEducation"
            label="My education"
            value={about.myEducation}
            onChange={(v) => setAbout((p) => ({ ...p, myEducation: v }))}
          />
          <AboutField
            lifeHistoryIcon="myOccupation"
            label="My occupation"
            value={about.myOccupation}
            onChange={(v) => setAbout((p) => ({ ...p, myOccupation: v }))}
          />
          <AboutField
            lifeHistoryIcon="myAdulthood"
            label="My adulthood"
            value={about.myAdulthood}
            onChange={(v) => setAbout((p) => ({ ...p, myAdulthood: v }))}
          />
          <AboutField
            lifeHistoryIcon="lifeHistoryFavourites"
            label="My favourite things"
            hint="Life history context — distinct from the “My Favourite Things” tab below."
            value={about.lifeHistoryFavourites}
            onChange={(v) => setAbout((p) => ({ ...p, lifeHistoryFavourites: v }))}
          />
        </TabsContent>

        <TabsContent value="routine" className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 dark:border-sky-400/20 dark:bg-sky-400/10">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Use the grid for a typical week. Leave cells blank if not applicable.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="sticky left-0 z-10 border-r border-border bg-muted/40 px-2 py-2 text-left font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      Time
                    </span>
                  </th>
                  {ROUTINE_DAYS.map((d) => (
                    <th key={d} className="min-w-[7rem] px-2 py-2 text-left font-medium text-muted-foreground">
                      {ROUTINE_DAY_LABEL[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROUTINE_SLOTS.map((slot) => (
                  <tr key={slot} className="border-b border-border last:border-0">
                    <th className="sticky left-0 z-10 border-r border-border bg-muted/20 px-2 py-2 text-left font-medium text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <DailyRoutineIcon id={slot} className="h-9 w-9 sm:h-10 sm:w-10" />
                        <span className="text-sm">{ROUTINE_SLOT_LABEL[slot]}</span>
                      </span>
                    </th>
                    {ROUTINE_DAYS.map((day) => (
                      <td key={`${day}-${slot}`} className="align-top p-1">
                        <textarea
                          className="min-h-[4rem] w-full resize-y rounded border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={about.routine[day][slot]}
                          onChange={(e) => setRoutine(day, slot, e.target.value)}
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="support" className="mt-6 space-y-6">
          <AboutField
            supportNeedIcon="personalHygiene"
            label="Personal hygiene"
            value={about.personalHygiene}
            onChange={(v) => setAbout((p) => ({ ...p, personalHygiene: v }))}
          />
          <AboutField
            supportNeedIcon="domesticSupport"
            label="Domestic support"
            value={about.domesticSupport}
            onChange={(v) => setAbout((p) => ({ ...p, domesticSupport: v }))}
          />
          <AboutField
            supportNeedIcon="shoppingArrangements"
            label="Shopping arrangements"
            value={about.shoppingArrangements}
            onChange={(v) => setAbout((p) => ({ ...p, shoppingArrangements: v }))}
          />
          <AboutField
            supportNeedIcon="nightSupport"
            label="Night support"
            value={about.nightSupport}
            onChange={(v) => setAbout((p) => ({ ...p, nightSupport: v }))}
          />
          <AboutField
            supportNeedIcon="supportOther"
            label="Other"
            value={about.supportOther}
            onChange={(v) => setAbout((p) => ({ ...p, supportOther: v }))}
          />
        </TabsContent>

        <TabsContent value="favourites" className="mt-6 space-y-6">
          <AboutField
            favouriteThingsIcon="foodDrinksLike"
            label="Food and drinks — I like"
            value={about.foodDrinksLike}
            onChange={(v) => setAbout((p) => ({ ...p, foodDrinksLike: v }))}
          />
          <AboutField
            favouriteThingsIcon="foodDrinksDontLike"
            label="Food and drinks — I don't like"
            value={about.foodDrinksDontLike}
            onChange={(v) => setAbout((p) => ({ ...p, foodDrinksDontLike: v }))}
          />
          <AboutField
            favouriteThingsIcon="favouriteItems"
            label="Favourite items"
            value={about.favouriteItems}
            onChange={(v) => setAbout((p) => ({ ...p, favouriteItems: v }))}
          />
          <AboutField
            favouriteThingsIcon="tvProgrammes"
            label="TV programmes"
            value={about.tvProgrammes}
            onChange={(v) => setAbout((p) => ({ ...p, tvProgrammes: v }))}
          />
          <AboutField
            favouriteThingsIcon="favouriteActivities"
            label="Activities"
            value={about.favouriteActivities}
            onChange={(v) => setAbout((p) => ({ ...p, favouriteActivities: v }))}
          />
          <AboutField
            favouriteThingsIcon="favouriteRooms"
            label="Rooms"
            value={about.favouriteRooms}
            onChange={(v) => setAbout((p) => ({ ...p, favouriteRooms: v }))}
          />
          <AboutField
            favouriteThingsIcon="favouriteOther"
            label="Other"
            value={about.favouriteOther}
            onChange={(v) => setAbout((p) => ({ ...p, favouriteOther: v }))}
          />
        </TabsContent>

        <TabsContent value="id-chars" className="mt-6 space-y-6">
          <AboutField
            icon={ScanFace}
            label="My identification characteristics — so people can recognise me"
            value={about.identificationCharacteristics}
            onChange={(v) => setAbout((p) => ({ ...p, identificationCharacteristics: v }))}
          />
        </TabsContent>
      </Tabs>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          About Me saved.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <p className="max-w-xl text-xs text-muted-foreground">
          All sections are stored together as one JSON document on the service user record (
          <code className="rounded bg-muted px-1">{ABOUT_ME_REF_TYPE}</code>). Saving updates only that reference and leaves
          other references unchanged. Clearing every field and saving removes the About Me record.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUpdate || saving}
            onClick={() => setAbout(defaultAboutMe())}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset form (unsaved)
          </Button>
          <Button type="button" disabled={!canUpdate || saving} onClick={() => void onSave()} className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <BookmarkCheck className="h-4 w-4" aria-hidden />
                Save About Me
              </>
            )}
          </Button>
        </div>
        {!canUpdate && <p className="w-full text-xs text-muted-foreground">You need service_users.update to save.</p>}
      </div>
    </div>
  )
}

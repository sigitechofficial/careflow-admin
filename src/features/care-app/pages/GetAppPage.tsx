import * as React from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Loader2, Smartphone } from 'lucide-react'
import { CompanyBrandingPublicBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { CompanyBrandMark } from '@/components/company/CompanyBrandMark'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { detectPlatform, planGetApp, type CareAppLinks, type GetAppPlan } from '@/features/care-app/get-app'

/** How long to wait for the app to open before going to the store instead. */
const OPEN_APP_WAIT_MS = 1500

async function fetchCareAppLinks(): Promise<CareAppLinks | null> {
  const base = getApiBaseUrl()
  if (!base) return null
  const res = await fetch(`${base}/care-app/links`, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const body = (await res.json()) as { data?: CareAppLinks }
  return body.data ?? null
}

/**
 * Public /get-app (linked from the welcome emails' store badges): opens the Care app if it's installed, otherwise
 * sends iPhones to the App Store and Android phones to Google Play. A computer gets both store buttons.
 */
export default function GetAppPage() {
  const store = useRouterState({ select: s => new URLSearchParams(s.location.searchStr).get('store') })
  const [plan, setPlan] = React.useState<GetAppPlan | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetchCareAppLinks()
      .catch(() => null)
      .then(links => {
        if (cancelled) return
        if (!links) setFailed(true)
        setPlan(planGetApp(links, detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0), store))
      })
    return () => {
      cancelled = true
    }
  }, [store])

  React.useEffect(() => {
    if (plan?.kind !== 'open') return
    if (!plan.openAppUrl) {
      window.location.replace(plan.storeUrl)
      return
    }
    // Try the app; if this page is still showing a moment later, it isn't installed: go to the store.
    window.location.href = plan.openAppUrl
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.replace(plan.storeUrl)
    }, OPEN_APP_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [plan])

  let content: React.ReactNode
  if (!plan) {
    content = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding the Care app…
      </p>
    )
  } else if (plan.kind === 'not-configured') {
    content = (
      <div className="space-y-2" data-testid="get-app-not-configured">
        <p className="text-sm text-foreground">The Care app isn’t in the App Store or Google Play yet.</p>
        <p className="text-sm text-muted-foreground">
          {failed
            ? 'We couldn’t check just now. Try again in a minute.'
            : 'Your office will tell you when it’s ready. Your password is already set, so you’ll only need to sign in.'}
        </p>
      </div>
    )
  } else if (plan.kind === 'open') {
    content = (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening the Care app…
        </p>
        <p className="text-sm text-muted-foreground">
          Not installed?{' '}
          <a className="text-primary hover:underline" href={plan.storeUrl}>
            Get it from your phone’s store
          </a>
          .
        </p>
      </div>
    )
  } else {
    content = (
      <div className="space-y-4" data-testid="get-app-choose">
        <p className="text-sm text-muted-foreground">
          Open this page on your phone, or choose your phone’s store. Then sign in with your email and the password you chose.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {plan.appStoreUrl ? (
            <a href={plan.appStoreUrl} className={plan.highlight === 'apple' ? 'rounded-lg ring-2 ring-primary ring-offset-2' : undefined}>
              <img src="/email/app-store-badge.svg" alt="Download on the App Store" width={150} height={50} className="h-[50px] w-[150px]" />
            </a>
          ) : null}
          {plan.playStoreUrl ? (
            <a href={plan.playStoreUrl} className={plan.highlight === 'google' ? 'rounded-lg ring-2 ring-primary ring-offset-2' : undefined}>
              <img src="/email/google-play-badge.png" alt="Get it on Google Play" width={168} height={65} className="h-[65px] w-[168px]" />
            </a>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-muted/40 p-4 md:p-8">
      <CompanyBrandingPublicBootstrap />
      <div className="mb-8">
        <CompanyBrandMark />
      </div>
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Smartphone className="h-5 w-5 text-primary" aria-hidden /> Get the Care app
        </h1>
        {content}
      </div>
    </div>
  )
}

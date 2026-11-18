/** Where to get the Care app: GET /care-app/links (public), from the API's CARE_APP_* settings. */
export type CareAppLinks = {
  iosAppId: string | null
  androidPackage: string | null
  urlScheme: string | null
  appStoreUrl: string | null
  playStoreUrl: string | null
  openAppUrl: string | null
  configured: boolean
}

export type Platform = 'ios' | 'android' | 'other'

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios'
  return 'other'
}

export type GetAppPlan =
  /** Store IDs not set yet: say so, nothing to open. */
  | { kind: 'not-configured' }
  /** On a phone: try to open the app, then go to the store if it didn't open. */
  | { kind: 'open'; openAppUrl: string | null; storeUrl: string }
  /** A computer, or a phone whose store isn't set up: show the store buttons. */
  | { kind: 'choose'; appStoreUrl: string | null; playStoreUrl: string | null; highlight: 'apple' | 'google' | null }

/**
 * What /get-app does. iPhone → App Store, Android → Google Play (trying the app first when it may be installed);
 * a computer gets both buttons. ?store=apple|google (the email's badges) is honoured on a computer, and on a phone
 * only when it matches that phone (an iPhone can't install from Google Play).
 */
export function planGetApp(links: CareAppLinks | null, platform: Platform, store: string | null): GetAppPlan {
  if (!links || !links.configured) return { kind: 'not-configured' }
  const wanted = store === 'apple' || store === 'google' ? store : null
  if (platform === 'ios' && links.appStoreUrl) return { kind: 'open', openAppUrl: links.openAppUrl, storeUrl: links.appStoreUrl }
  if (platform === 'android' && links.playStoreUrl) {
    // Android: an intent link opens the app when installed and falls back to Google Play on its own.
    const intent = links.urlScheme && links.androidPackage
      ? `intent://open#Intent;scheme=${links.urlScheme};package=${links.androidPackage};S.browser_fallback_url=${encodeURIComponent(links.playStoreUrl)};end`
      : null
    return { kind: 'open', openAppUrl: intent, storeUrl: links.playStoreUrl }
  }
  return { kind: 'choose', appStoreUrl: links.appStoreUrl, playStoreUrl: links.playStoreUrl, highlight: wanted }
}

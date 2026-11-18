import { describe, expect, it } from 'vitest'
import { detectPlatform, planGetApp, type CareAppLinks } from './get-app'
import { suggestionText } from '@/features/employees/components/StaffSignInAccessSection'

const links: CareAppLinks = {
  iosAppId: '1234567890',
  androidPackage: 'uk.co.allforcare.careapp',
  urlScheme: 'careflow',
  appStoreUrl: 'https://apps.apple.com/gb/app/id1234567890',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=uk.co.allforcare.careapp',
  openAppUrl: 'careflow://',
  configured: true,
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'

describe('/get-app', () => {
  it('detects the phone', () => {
    expect(detectPlatform(IPHONE)).toBe('ios')
    expect(detectPlatform(ANDROID)).toBe('android')
    expect(detectPlatform(WINDOWS)).toBe('other')
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
  })

  it('says it is not set up yet when the store IDs are missing', () => {
    expect(planGetApp(null, 'ios', null)).toEqual({ kind: 'not-configured' })
    expect(planGetApp({ ...links, configured: false }, 'android', 'google')).toEqual({ kind: 'not-configured' })
  })

  it('iPhone: tries the app, then the App Store (even from the Google badge)', () => {
    expect(planGetApp(links, 'ios', 'google')).toEqual({ kind: 'open', openAppUrl: 'careflow://', storeUrl: links.appStoreUrl })
  })

  it('Android: an intent link that falls back to Google Play', () => {
    const plan = planGetApp(links, 'android', null)
    expect(plan.kind).toBe('open')
    if (plan.kind !== 'open') return
    expect(plan.storeUrl).toBe(links.playStoreUrl)
    expect(plan.openAppUrl).toContain('intent://open#Intent;scheme=careflow;package=uk.co.allforcare.careapp;')
    expect(plan.openAppUrl).toContain(`S.browser_fallback_url=${encodeURIComponent(links.playStoreUrl!)}`)
  })

  it('a computer gets both stores, the chosen badge highlighted', () => {
    expect(planGetApp(links, 'other', 'apple')).toEqual({ kind: 'choose', appStoreUrl: links.appStoreUrl, playStoreUrl: links.playStoreUrl, highlight: 'apple' })
  })

  it('a phone whose store is not set up yet gets the buttons that exist', () => {
    expect(planGetApp({ ...links, appStoreUrl: null, iosAppId: null }, 'ios', null)).toMatchObject({ kind: 'choose', appStoreUrl: null })
  })
})

describe('sign-in access suggestion', () => {
  it('follows the RBAC level', () => {
    expect(suggestionText({ rbacLevel: 'Carer/Domestic', suggested: { website: false, app: true } })).toBe('Suggested for Carer/Domestic: Care app. Both are possible.')
    expect(suggestionText({ rbacLevel: 'Administrator', suggested: { website: true, app: false } })).toBe('Suggested for Administrator: office login. Both are possible.')
    expect(suggestionText({ rbacLevel: null, suggested: { website: false, app: false } })).toContain('Choose an RBAC level')
  })
})

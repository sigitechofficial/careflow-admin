import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'

const APP_MAIN_SCROLL_ATTR = 'data-app-main-scroll'

/**
 * Reset scroll when the route pathname changes.
 * The admin shell scrolls inside <main>, not window — window-only scroll restoration
 * leaves list scroll position on detail pages.
 */
export function ScrollToTopOnNavigate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const main = document.querySelector(`[${APP_MAIN_SCROLL_ATTR}]`)
    if (main instanceof HTMLElement) {
      main.scrollTop = 0
      main.scrollLeft = 0
    }
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export { APP_MAIN_SCROLL_ATTR }

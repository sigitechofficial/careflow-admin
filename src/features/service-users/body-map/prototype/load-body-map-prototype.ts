let loadPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-body-map-proto="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.dataset.bodyMapProto = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(el)
  })
}

/** Loads catalog → anatomy (same order as careflow-body-map.html). */
export function loadBodyMapPrototype(): Promise<void> {
  if (window.BodyMapAnatomy && window.BodyMapCatalog) return Promise.resolve()
  if (!loadPromise) {
    loadPromise = (async () => {
      await loadScript('/body-map/svg-inline.js')
      await loadScript('/body-map/catalog.js')
      await loadScript('/body-map/anatomy.js')
      if (!window.BodyMapAnatomy || !window.BodyMapCatalog) {
        throw new Error('Body map prototype scripts did not initialize')
      }
    })().catch(err => {
      loadPromise = null
      throw err
    })
  }
  return loadPromise
}

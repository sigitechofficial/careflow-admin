import '@testing-library/jest-dom'

// jsdom lacks ResizeObserver, which Radix UI primitives (Popover, etc.) rely on.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

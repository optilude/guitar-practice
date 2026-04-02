import "@testing-library/jest-dom/vitest"

// jsdom doesn't implement ResizeObserver; provide a no-op stub for components that use it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

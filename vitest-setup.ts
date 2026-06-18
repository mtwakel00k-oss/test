import "@testing-library/jest-dom/vitest"

if (typeof window !== "undefined") {
  if (!window.scrollTo) {
    Object.defineProperty(window, "scrollTo", { value: () => {}, writable: true })
  }
  if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {}
  }
}

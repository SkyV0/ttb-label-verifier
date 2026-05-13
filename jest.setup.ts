// Runs after Jest is installed in the environment — safe to import matcher
// extensions that call `expect.extend(...)` on load.

import "@testing-library/jest-dom";

// JSDOM doesn't ship URL.createObjectURL / revokeObjectURL — UploadZone uses
// these to build preview thumbnails. Stub with sentinel-string returns.
if (typeof URL.createObjectURL === "undefined") {
  Object.defineProperty(URL, "createObjectURL", { value: () => "blob:test-preview" });
}
if (typeof URL.revokeObjectURL === "undefined") {
  Object.defineProperty(URL, "revokeObjectURL", { value: () => {} });
}

// JSDOM does not implement matchMedia. ThemeProvider reads it to honor the
// `system` preference; stub it with a no-op MediaQueryList.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }) as unknown as MediaQueryList,
  });
}

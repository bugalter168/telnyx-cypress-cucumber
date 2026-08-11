/**
 * Viewport constants, shared by BOTH sides of Cypress.
 *
 * This module must stay IMPORT-FREE. Step definitions run in the browser and esbuild
 * bundles whatever they import, so anything reachable from here that touches a Node API
 * breaks the build with `Could not resolve "node:fs"`. config/shared.ts re-exports these.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ DO NOT LOWER THE DESKTOP WIDTH BELOW 1260.                                    │
 * │                                                                              │
 * │ telnyx.com switches its header layout at exactly 1260px:                      │
 * │     .max-header-md\:hidden { … }   @media not all and (min-width: 1260px)    │
 * │                                                                              │
 * │ At >= 1260px the desktop menu (#main-menu-content) renders and the hamburger │
 * │ is hidden. Below 1260px the desktop menu is not in the layout at all, and    │
 * │ TC-TLNX-002/003 fail with a misleading "element not found".                  │
 * │                                                                              │
 * │ Cypress's DEFAULT viewport is 1000x660 — below the breakpoint. Deleting      │
 * │ these constants to "just use the default" is the trap.                       │
 * │                                                                              │
 * │ Both run profiles use the SAME viewport on purpose: a CI-only viewport gives │
 * │ you green locally and red in CI for a reason unrelated to the product.       │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */

export const headerBreakpointPx = 1260;

export const desktopViewport = { width: 1440, height: 900 } as const;

export const mobileViewport = { width: 390, height: 844 } as const;

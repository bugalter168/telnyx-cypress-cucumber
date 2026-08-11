/**
 * CI profile — headless, resilient, artefact-producing. Run with `npm run test:ci`.
 *
 * There is deliberately NO `if (process.env.CI)` branching: the two profiles are separate
 * files so each reads top-to-bottom on its own. Differences are tabulated in the README.
 *
 * This file must stay at the project root — Cypress treats the config file's directory as
 * the project root, so moving it into config/ breaks resolution of cypress/ and supportFile.
 */
import { defineConfig } from 'cypress';

import { buildSetupNodeEvents, desktopViewport, sharedConfig } from './config/shared';

export default defineConfig({
  e2e: {
    ...sharedConfig,

    // Overridable so CI can be pointed at a staging mirror without editing this file.
    baseUrl: process.env.CYPRESS_BASE_URL ?? sharedConfig.baseUrl,

    /*
     * IDENTICAL to the local profile, on purpose — this is the one axis the profiles must
     * NOT differ on. A CI-only viewport reintroduces exactly the failure the 1260px finding
     * warns about: green locally, red in CI, for a reason unrelated to the product.
     * See config/viewports.ts.
     */
    viewportWidth: desktopViewport.width,
    viewportHeight: desktopViewport.height,

    // telnyx.com is a third-party production site behind Cloudflare; an edge hiccup is not
    // our defect. openMode stays 0 so retries never hide a failure while debugging.
    retries: {
      runMode: 2,
      openMode: 0,
    },

    /*
     * DO NOT re-enable video compression. It writes a temp file and replaces the original,
     * which on Windows races the Allure reporter reading the same file to attach it:
     *     EBUSY: resource busy or locked, unlink 'cypress\videos\footer.feature.mp4'
     * That aborts the entire run, and `npm run test:ci` is the documented way to reproduce
     * CI locally, so it has to work on Windows too.
     */
    video: true,
    videoCompression: false,
    screenshotOnRunFailure: true,

    // `spec` keeps a red GitHub Actions log readable inline; Allure is the machine-readable
    // output and is where this profile's richer metadata goes.
    reporter: 'spec',

    setupNodeEvents: buildSetupNodeEvents('ci'),
  },
});

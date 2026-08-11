/**
 * LOCAL profile — fast feedback while developing. `npm run test:local` / `npm run open`.
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

    baseUrl: sharedConfig.baseUrl,

    // Must not drop below 1260 — see config/viewports.ts.
    viewportWidth: desktopViewport.width,
    viewportHeight: desktopViewport.height,

    // No retries locally: a flaky test should be visible immediately, not smoothed over.
    retries: {
      runMode: 0,
      openMode: 0,
    },

    video: false,
    screenshotOnRunFailure: false,
    reporter: 'spec',

    setupNodeEvents: buildSetupNodeEvents('local'),
  },
});

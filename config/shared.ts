/**
 * Shared config object, imported by both root config files.
 *
 * This is deliberately NOT a Cypress config file. Cypress treats the directory containing
 * the config file as the project root, so moving a real config in here would silently make
 * config/ the root and break resolution of cypress/, fixtures/ and supportFile.
 */
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
// Named import, not default: the subpath entry exposes BOTH `createEsbuildPlugin` and
// `default`, and the default one does not survive Cypress's config loader interop
// ("createEsbuildPlugin is not a function"). The named export is unambiguous.
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import { allureCypress } from 'allure-cypress/reporter';

import { allureCategories, buildEnvironmentInfo } from './allure';
import paths from './paths.json' with { type: 'json' };
import { baseUrl } from './site';
import { desktopViewport } from './viewports';

/**
 * Defined ONCE in config/paths.json and reused by both configs, scripts/allure.mjs and
 * the CI workflow. Do not write the literal "allure-results" anywhere else.
 */
export const allureResultsDir = paths.allureResultsDir;

/*
 * Re-exported from import-free modules so the configs have one place to look. Browser-side
 * code must import those directly, never this file — see config/viewports.ts.
 */
export { desktopViewport, headerBreakpointPx, mobileViewport } from './viewports';
export { baseUrl } from './site';

export const sharedConfig = {
  baseUrl,
  specPattern: 'cypress/e2e/features/**/*.feature',
  supportFile: 'cypress/support/e2e.ts',
  fixturesFolder: 'cypress/fixtures',
  screenshotsFolder: paths.screenshotsDir,
  videosFolder: paths.videosDir,

  // Timeouts belong here, not as per-command { timeout } overrides in the specs.
  // 10s is measured, not round: the consent banner appears 3.2-4.5s after a cold load.
  defaultCommandTimeout: 10_000,
  pageLoadTimeout: 60_000,
  requestTimeout: 15_000,
  responseTimeout: 30_000,

  viewportWidth: desktopViewport.width,
  viewportHeight: desktopViewport.height,

  /*
   * DO NOT set `allowCypressEnv: false` to silence Cypress 15's deprecation warning about
   * browser-side `Cypress.env()`. The cucumber preprocessor calls it inside the spec code
   * it generates, so every spec dies before its first test with "An uncaught error was
   * detected outside of a test". The warning is accepted until the preprocessor migrates.
   */
} as const;

/**
 * The browser this run will actually use.
 *
 * NOT `config.browsers[0]` — that is the first browser Cypress *detected*, which reported
 * "Chrome" in the Allure widget on a run executing in Electron. Wrong metadata silently
 * misattributes a result.
 */
function resolveBrowserName(profile: 'local' | 'ci'): string {
  const flagIndex = process.argv.indexOf('--browser');
  const fromFlag = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
  return fromFlag ?? (profile === 'ci' ? 'electron' : 'chrome');
}

/** Shared setupNodeEvents; `profile` is what makes the Allure output differ per run. */
export function buildSetupNodeEvents(
  profile: 'local' | 'ci',
): (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => Promise<Cypress.PluginConfigOptions> {
  return async (
    on: Cypress.PluginEvents,
    config: Cypress.PluginConfigOptions,
  ): Promise<Cypress.PluginConfigOptions> => {
    await addCucumberPreprocessorPlugin(on, config);

    on(
      'file:preprocessor',
      createBundler({
        plugins: [createEsbuildPlugin(config)],
      }),
    );

    /*
     * DO NOT enable `videoOnFailOnly`. It deletes the video of every passing spec, and on
     * Windows that unlink races the video compressor still holding the handle:
     *     EBUSY: resource busy or locked, unlink 'cypress\videos\footer.feature.mp4'
     * which aborts the whole run. Videos are uploaded as CI artefacts regardless.
     *
     * This call is only HALF the Allure wiring — cypress/support/e2e.ts must also import
     * 'allure-cypress'. Without it the report is silently empty. See site-recon.md §14.
     */
    allureCypress(on, config, {
      resultsDir: allureResultsDir,
      environmentInfo: buildEnvironmentInfo(profile, resolveBrowserName(profile)),
      categories: [...allureCategories],
      videoOnFailOnly: false,
    });

    on('before:browser:launch', (browser, launchOptions) => {
      if (browser.family === 'chromium' && browser.name !== 'electron') {
        // OneTrust localises the banner from navigator.languages, NOT from <html lang>.
        // We never assert its copy, but pinning the locale keeps failure screenshots
        // readable and runs reproducible across machines.
        launchOptions.args.push('--lang=en-US');

        // Deterministic window size for screenshots/video regardless of the host display.
        launchOptions.args.push(`--window-size=${config.viewportWidth},${config.viewportHeight}`);
      }
      return launchOptions;
    });

    return config;
  };
}

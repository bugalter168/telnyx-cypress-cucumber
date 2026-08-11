/** Support file, loaded before every spec. */

/*
 * Allure's BROWSER-side half. REQUIRED, and its absence is silent: without it the browser
 * emits no test lifecycle messages, so allure-results/ gets only environment.properties
 * and categories.json and the report is empty while the suite reports every test green.
 * See site-recon.md §14.
 */
import 'allure-cypress';

import './commands';

/*
 * Third-party tags whose uncaught exceptions we suppress. Each was observed loading on the
 * site during recon.
 *
 * Deliberately ABSENT: dila2qpfw3s64.cloudfront.net, which serves Telnyx's own Next.js
 * bundle. A first-party crash is what this suite exists to catch and must fail the test.
 */
const IGNORED_SCRIPT_ORIGINS: readonly string[] = [
  'googletagmanager.com',
  'google-analytics.com',
  'googletagservices.com',
  'google.com/recaptcha',
  'gstatic.com/recaptcha',
  'marketo.net',
  'marketo.com',
  'cookielaw.org',
  'onetrust.com',
  '/scripts/vector.js',
];

const OPAQUE_CROSS_ORIGIN_MESSAGE = 'Script error';

/**
 * A cross-origin script throwing without CORS headers yields the bare string
 * "Script error." with an EMPTY stack — nothing to attribute it to.
 *
 * Checked alongside the message because the message text is not a stable contract: Cypress
 * may hand us the bare string or its own wrapped description. No `http(s)://` frame in the
 * stack is the structural signal.
 *
 * KNOWN LIMITATION: Telnyx serves its own bundle from a CDN origin too, so an opaque error
 * could in principle be first-party. The two cannot be told apart. Repeated in the README.
 */
const hasAttributableStack = (stack: string): boolean => /https?:\/\//.test(stack);

/**
 * `Cypress.log()`, NOT `cy.log()`.
 *
 * This runs inside an event handler that can fire mid-`cy.visit()`. `cy.log()` enqueues a
 * command, which Cypress rejects — and because it only happens when a third-party script
 * throws at the wrong moment, it presents as random flake across unrelated scenarios.
 */
function logSuppression(reason: string, message: string): void {
  Cypress.log({
    name: 'suppressed',
    message: `${reason} — ${message.split('\n')[0] ?? ''}`,
  });
}

// `false | undefined` rather than Cypress's `false | void`: a `void` union trips
// @typescript-eslint/no-invalid-void-type, and `undefined` is assignable to `void`.
Cypress.on('uncaught:exception', (error: Error): false | undefined => {
  const stack = error.stack ?? '';

  const matchedOrigin = IGNORED_SCRIPT_ORIGINS.find((origin) => stack.includes(origin));
  if (matchedOrigin !== undefined) {
    logSuppression(`third-party script: ${matchedOrigin}`, error.message);
    return false;
  }

  if (error.message.includes(OPAQUE_CROSS_ORIGIN_MESSAGE) || !hasAttributableStack(stack)) {
    logSuppression('opaque cross-origin script (no stack to attribute)', error.message);
    return false;
  }

  // Attributable and not on the allowlist: first-party. Fail the test, loudly.
  return undefined;
});

// Explicit despite Cypress's default, because TC-TLNX-007/012 assert on banner visibility
// and are only meaningful if no earlier test left OptanonAlertBoxClosed behind.
beforeEach((): void => {
  cy.clearCookies();
});

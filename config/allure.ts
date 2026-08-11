/** Allure reporting metadata: the environment widget and the failure categories. */
import type { allureCypress } from 'allure-cypress/reporter';

import { baseUrl } from './site';
import { desktopViewport, headerBreakpointPx } from './viewports';

/*
 * Types are derived from the reporter's own signature rather than imported: `Category`
 * lives in a subpath of `allure-js-commons`, which is only a TRANSITIVE dependency here.
 * A hand-rolled equivalent does not work either — Allure's `Status` is a nominal enum, so
 * the literal 'failed' is not assignable to it.
 */
type AllureConfig = NonNullable<Parameters<typeof allureCypress>[2]>;

export type EnvironmentInfo = NonNullable<AllureConfig['environmentInfo']>;

export type AllureCategory = NonNullable<AllureConfig['categories']>[number];

/**
 * Records the things that actually explain a differing result between two runs: target,
 * browser, viewport, and the breakpoint the viewport must stay above.
 */
export function buildEnvironmentInfo(profile: 'local' | 'ci', browser: string): EnvironmentInfo {
  return {
    'Site under test': baseUrl,
    'Run profile': profile === 'ci' ? 'CI (cypress.ci.config.ts)' : 'Local (cypress.config.ts)',
    Browser: browser,
    Viewport: `${String(desktopViewport.width)}x${String(desktopViewport.height)}`,
    'Header breakpoint': `${String(headerBreakpointPx)}px (viewport must stay above this)`,
    'Node version': process.version,
    Platform: `${process.platform} ${process.arch}`,
    'Cookie banner': 'OneTrust, en-US forced via --lang for reproducibility',
  };
}

/**
 * Failure categories.
 *
 * The point of these is triage: on a suite that tests somebody else's production site,
 * "is this our bug, their bug, or the network?" is the first question anyone asks.
 *
 * ORDER MATTERS — Allure takes the FIRST match, so these run most specific to least.
 * `matchedStatuses` is omitted deliberately (see the type note above); the regexes are
 * specific enough and the last entry is a catch-all.
 */
export const allureCategories: AllureCategory[] = [
  {
    name: 'Site unreachable or blocked (Cloudflare / network)',
    messageRegex: '(?s).*(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|cy\\.visit\\(\\) failed|503).*',
  },
  {
    name: 'Third-party script failure (GTM / Marketo / OneTrust)',
    messageRegex: '(?s).*(googletagmanager|marketo|cookielaw|onetrust|Script error).*',
  },
  {
    name: 'Timed out waiting for an element',
    messageRegex: '(?s).*Timed out retrying.*',
  },
  {
    name: 'Content changed on the site under test',
    messageRegex: '(?s).*(to have text|to have attr|to equal).*',
  },
  {
    // No regex: matches anything not caught above, so nothing lands untriaged.
    name: 'Uncategorised failure — needs a human',
  },
];

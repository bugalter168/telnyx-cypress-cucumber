/**
 * Shapes of the JSON files in cypress/fixtures/.
 *
 * Fixtures are read as `cy.fixture<SiteFixture>(...)` because a bare `cy.fixture()`
 * returns `any`, which would silently disable every downstream strict-lint check.
 *
 * Declared interfaces also keep `noUncheckedIndexedAccess` out of the way: property
 * access on one is not *indexed* access, so no narrowing is needed. Iterate arrays with
 * for..of, never by index, for the same reason.
 */

export interface SiteFixture {
  readonly baseUrl: string;
  readonly titleToken: string;
  readonly canonicalUrl: string;
  readonly minMetaDescriptionLength: number;
  readonly openGraph: {
    readonly site_name: string;
    readonly type: string;
    readonly url: string;
  };
  readonly notFound: {
    readonly path: string;
    readonly status: number;
    readonly heading: string;
    readonly errorCode: string;
  };
}

export interface NavigationFixture {
  readonly headerBreakpointPx: number;
  readonly primaryMenuLabels: readonly string[];
}

export interface FooterLink {
  readonly label: string;
  readonly href: string;
}

export interface FooterLinksFixture {
  readonly legalLinks: readonly FooterLink[];
  readonly navigationTarget: {
    readonly label: string;
    readonly path: string;
    readonly heading: string;
  };
}

export interface ExternalLink {
  readonly name: string;
  readonly href: string;
}

export interface ExternalLinksFixture {
  readonly requiredRelTokens: readonly string[];
  readonly header: readonly ExternalLink[];
  readonly footer: readonly ExternalLink[];
}

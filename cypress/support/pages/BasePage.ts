/**
 * Shared behaviour for every page object.
 *
 * Page objects expose element getters and navigation only — NO assertions. Those belong in
 * the step definitions so a failing expectation points at the scenario that cares about it.
 *
 * Return types are the precise DOM interface where one exists. Where the element genuinely
 * IS a plain HTMLElement (<header>, <main>, <footer> have no more specific interface in
 * lib.dom) the type is `Cypress.Chainable<JQuery>` — the identical type, written without a
 * redundant type argument so it does not trip no-unnecessary-type-arguments.
 */
export abstract class BasePage {
  protected readonly defaultPath: string;

  protected constructor(defaultPath: string) {
    this.defaultPath = defaultPath;
  }

  public visit(): Cypress.Chainable<Cypress.AUTWindow> {
    return this.visitPath(this.defaultPath);
  }

  /** Used by the Scenario Outlines, where the path comes from the Examples table. */
  public visitPath(path: string): Cypress.Chainable<Cypress.AUTWindow> {
    return cy.visit(path);
  }

  /** State gate built from retrying assertions — there is no fixed sleep in this project. */
  public waitForPageLoad(): Cypress.Chainable<JQuery<HTMLHeadingElement>> {
    cy.document({ log: false }).its('readyState').should('eq', 'complete');
    return this.getHeading().should('be.visible');
  }

  public acceptCookiesIfShown(): Cypress.Chainable<void> {
    return cy.acceptCookiesIfShown();
  }

  public getSiteHeader(): Cypress.Chainable<JQuery> {
    return cy.get('header#site-header');
  }

  public getSiteFooter(): Cypress.Chainable<JQuery> {
    return cy.get('footer#site-footer');
  }

  /**
   * `.first()` is required, not cosmetic: the homepage ships TWO <main> elements, one
   * nested inside the other (site defect DEF-TLNX-002). Every other page has exactly one.
   */
  public getMainContent(): Cypress.Chainable<JQuery> {
    return cy.get('main').first();
  }

  public getHeading(): Cypress.Chainable<JQuery<HTMLHeadingElement>> {
    return cy.get('h1');
  }

  public getCanonicalLink(): Cypress.Chainable<JQuery<HTMLLinkElement>> {
    return cy.get<HTMLLinkElement>('link[rel="canonical"]');
  }

  public getMetaDescription(): Cypress.Chainable<JQuery<HTMLMetaElement>> {
    return cy.get<HTMLMetaElement>('meta[name="description"]');
  }

  public getOpenGraphMeta(property: string): Cypress.Chainable<JQuery<HTMLMetaElement>> {
    return cy.get<HTMLMetaElement>(`meta[property="og:${property}"]`);
  }

  /**
   * Matches an EXPLICIT `role` attribute only.
   *
   * CSS attribute selectors do not match implicit ARIA roles, so `[role="navigation"]`
   * finds nothing on this site — landmarks are reached through the semantic getters above.
   * Explicit roles here appear only on interactive widgets (menu, combobox, tab, table).
   *
   * `cy.findByRole` is not used: it needs @testing-library/cypress, and a dependency is not
   * worth it for the handful of explicit roles this site exposes.
   */
  public getByRole(role: string): Cypress.Chainable<JQuery> {
    return cy.get(`[role="${role}"]`);
  }

  /**
   * Anchored on purpose: a substring match on marketing copy is the brittleness we are
   * avoiding. `^\s*Products\s*$` fails loudly rather than drifting onto "Products & More".
   * Whitespace is tolerated because the text sits inside nested spans.
   */
  protected static anchoredText(text: string): RegExp {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escaped}\\s*$`);
  }
}

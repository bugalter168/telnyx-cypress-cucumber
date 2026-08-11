import { BasePage } from './BasePage';

/**
 * The branded 404 page. Three constraints (site-recon.md §3):
 *
 *  - `/404` must NOT be used as a fixture — Cloudflare answers that path with 403.
 *  - The page reuses the HOMEPAGE's <title> and canonical, so it cannot be identified by
 *    title. The headings are the only reliable signal.
 *  - Its <h1> contains a curly apostrophe U+2019 ("doesn’t"), not an ASCII quote.
 */
export class ErrorPage extends BasePage {
  private static readonly errorCodeHeading = 'h2';

  constructor() {
    super('/');
  }

  /**
   * `failOnStatusCode: false` is mandatory — without it Cypress fails on the 404 response
   * itself and the assertions never run.
   */
  public visitExpectingNotFound(path: string): Cypress.Chainable<Cypress.AUTWindow> {
    return cy.visit(path, { failOnStatusCode: false });
  }

  /** Status without rendering, so the HTTP contract is asserted as well as the page. */
  public requestStatus(path: string): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({ url: path, failOnStatusCode: false });
  }

  /** The "Error 404" strapline above the main heading. */
  public getErrorCode(): Cypress.Chainable<JQuery<HTMLHeadingElement>> {
    return cy.get<HTMLHeadingElement>(ErrorPage.errorCodeHeading).first();
  }
}

export const errorPage = new ErrorPage();

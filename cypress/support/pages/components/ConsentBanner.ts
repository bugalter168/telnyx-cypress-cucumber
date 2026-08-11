/**
 * OneTrust cookie consent banner. Verified against the live SDK (v202605.1.0) — see
 * test-plan/site-recon.md §4. Four facts that constrain how it can be tested:
 *
 *  - Rendered INLINE, not in an iframe.
 *  - Copy is localised from navigator.languages, so text is NEVER asserted. The
 *    --lang=en-US pin in both configs is for reproducible screenshots, nothing more.
 *  - After accepting, the banner REMAINS IN THE DOM, merely hidden with display:none.
 *    Assert `not.be.visible`, never `not.exist`.
 *  - On a page loaded with consent stored the banner is never created, but the SDK root
 *    always is — which is what makes the root a reliable gate in BOTH states.
 */
export class ConsentBanner {
  /** Injected once the SDK has run, banner due or not. The synchronisation gate. */
  public static readonly rootSelector = '#onetrust-consent-sdk';

  /** Only created when consent has not yet been given. */
  public static readonly bannerSelector = '#onetrust-banner-sdk';

  public static readonly acceptButtonSelector = '#onetrust-accept-btn-handler';

  public static readonly consentCookieName = 'OptanonAlertBoxClosed';

  public getRoot(): Cypress.Chainable<JQuery> {
    return cy.get(ConsentBanner.rootSelector);
  }

  public getBanner(): Cypress.Chainable<JQuery> {
    return cy.get(ConsentBanner.bannerSelector);
  }

  public getAcceptButton(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return cy.get<HTMLButtonElement>(ConsentBanner.acceptButtonSelector);
  }

  public getConsentCookie(): Cypress.Chainable<Cypress.Cookie | null> {
    return cy.getCookie(ConsentBanner.consentCookieName);
  }

  /**
   * Returns a boolean rather than asserting, because the caller needs to branch and
   * Cypress assertions cannot be caught. Safe only because callers gate on `getRoot()`
   * first — see acceptCookiesIfShown in commands.ts.
   *
   * Lives here so that no selector, not even `body`, is written outside a page object.
   */
  public isBannerShowing(): Cypress.Chainable<boolean> {
    return cy
      .get('body', { log: false })
      .then(
        ($body: JQuery<HTMLBodyElement>): boolean =>
          $body.find(`${ConsentBanner.bannerSelector}:visible`).length > 0,
      );
  }
}

export const consentBanner = new ConsentBanner();

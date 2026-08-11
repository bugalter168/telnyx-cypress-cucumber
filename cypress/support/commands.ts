/**
 * Custom Cypress commands. Type declarations live in cypress/support/index.d.ts.
 *
 * No raw selectors here — every element is reached through a page object, which stays the
 * single place a selector is written down.
 */
import { anyPage } from './pages/AnyPage';
import { consentBanner } from './pages/components/ConsentBanner';

/**
 * Dismisses the OneTrust cookie banner when one is shown.
 *
 * The conditional is safe because of the gate on the next line, and the gate is why this
 * is not the usual flaky conditional-testing pattern: OneTrust injects `#onetrust-consent-sdk`
 * in BOTH states, in the same DOM update as the banner, so once the root exists the
 * decision has already been made and the branch cannot race it. Do not remove the gate.
 *
 * The banner renders bottom-left and OVERLAPS the footer, so any scenario touching a footer
 * link must call this first or the click is intercepted.
 */
Cypress.Commands.add('acceptCookiesIfShown', (): void => {
  consentBanner.getRoot().should('exist');

  consentBanner.isBannerShowing().then((bannerIsShowing: boolean): void => {
    if (!bannerIsShowing) {
      cy.log('Cookie banner not shown — consent already stored, nothing to dismiss.');
      return;
    }

    consentBanner.getAcceptButton().should('be.visible').click();

    // Postcondition, not decoration: the banner must be gone before the caller continues
    // or it can still intercept a later footer click.
    // `not.be.visible`, never `not.exist` — OneTrust leaves the element in the DOM.
    consentBanner.getBanner().should('not.be.visible');
  });
});

/**
 * Asserts the shared page-load contract. Every page on telnyx.com was verified to expose
 * exactly one <h1> plus the header and footer landmarks, so this is a real contract rather
 * than a wrapper for its own sake. Scenario-specific expectations stay in step definitions.
 */
Cypress.Commands.add('assertPageLoaded', (expectedPath: string): void => {
  cy.location('pathname').should('eq', expectedPath);
  anyPage.getSiteHeader().should('be.visible');
  anyPage.getHeading().should('be.visible').and('not.have.text', '');
});

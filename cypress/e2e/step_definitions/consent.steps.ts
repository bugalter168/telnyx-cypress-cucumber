import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

import { consentBanner } from '../../support/pages/components/ConsentBanner';

/**
 * TC-TLNX-007 and TC-TLNX-012 — cookie consent.
 *
 * NOTHING here asserts the banner's TEXT: OneTrust localises it from navigator.languages,
 * so a copy assertion passes on one machine and fails on another. Structure, behaviour
 * and the stored cookie are asserted instead.
 */

Then('the cookie banner is visible', (): void => {
  consentBanner.getBanner().should('be.visible');
});

Then('the cookie banner is not inside an iframe', (): void => {
  // OneTrust renders inline. Verified in the live DOM: banner.closest('iframe') === null.
  consentBanner.getBanner().parents('iframe').should('not.exist');
});

Then('the accept button is visible', (): void => {
  consentBanner.getAcceptButton().should('be.visible').and('not.be.disabled');
});

When('I accept all cookies', (): void => {
  cy.acceptCookiesIfShown();
});

Then('the cookie banner is no longer visible', (): void => {
  /*
   * `not.be.visible`, NOT `not.exist`. Verified: after accepting, OneTrust leaves
   * #onetrust-banner-sdk in the DOM and hides it with display:none. `not.exist` fails.
   */
  consentBanner.getBanner().should('not.be.visible');
});

Then('the cookie banner is not shown', (): void => {
  /*
   * Different assertion from the one above, on purpose. On a page loaded with consent
   * already stored, OneTrust never creates the banner element at all - so here
   * `not.exist` is the correct and stronger check.
   */
  consentBanner.getRoot().should('exist');
  consentBanner.getBanner().should('not.exist');
});

Then('the consent cookie is stored', (): void => {
  consentBanner.getConsentCookie().should('not.be.null');
});

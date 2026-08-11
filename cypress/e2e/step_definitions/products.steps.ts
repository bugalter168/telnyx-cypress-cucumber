import { Then } from '@badeball/cypress-cucumber-preprocessor';

import { productPage } from '../../support/pages/ProductPage';
import type { SiteFixture } from '../../support/types';

/** TC-TLNX-004 — product landing pages. */

Then('the canonical URL is {string}', (path: string): void => {
  cy.fixture<SiteFixture>('site').then((site: SiteFixture): void => {
    // Asserted instead of <title>: titles are marketing-owned and rewritten often, while
    // the canonical is structural. It also catches a page that renders but self-identifies
    // as a different URL.
    productPage.getCanonicalLink().should('have.attr', 'href', `${site.baseUrl}${path}`);
  });
});

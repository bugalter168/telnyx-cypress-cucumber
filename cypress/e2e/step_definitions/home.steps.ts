import { Then } from '@badeball/cypress-cucumber-preprocessor';

import { homePage } from '../../support/pages/HomePage';
import type { SiteFixture } from '../../support/types';

/** TC-TLNX-001 and TC-TLNX-015 — homepage structure and metadata. */

Then('the page has exactly one visible heading', (): void => {
  homePage.getHeading().should('have.length', 1).and('be.visible');
});

Then('the meta description is present and non-trivial', (): void => {
  cy.fixture<SiteFixture>('site').then((site: SiteFixture): void => {
    // Copy is marketing-owned and changes without notice, so only presence and a minimum
    // length are asserted.
    homePage
      .getMetaDescription()
      .should('have.attr', 'content')
      .and('have.length.greaterThan', site.minMetaDescriptionLength);
  });
});

Then('the canonical URL is the site root', (): void => {
  cy.fixture<SiteFixture>('site').then((site: SiteFixture): void => {
    homePage.getCanonicalLink().should('have.attr', 'href', site.canonicalUrl);
  });
});

Then('the Open Graph tags match the expected values', (): void => {
  cy.fixture<SiteFixture>('site').then((site: SiteFixture): void => {
    homePage.getOpenGraphMeta('site_name').should('have.attr', 'content', site.openGraph.site_name);
    homePage.getOpenGraphMeta('type').should('have.attr', 'content', site.openGraph.type);
    homePage.getOpenGraphMeta('url').should('have.attr', 'content', site.openGraph.url);
  });
});

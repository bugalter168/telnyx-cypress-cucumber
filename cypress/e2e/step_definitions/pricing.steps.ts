import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

import { pricingPage } from '../../support/pages/PricingPage';

/** TC-TLNX-005 and TC-TLNX-006 — pricing pages and the category filter. */

Then('the category filter is visible and collapsed', (): void => {
  pricingPage
    .getCategoryFilter()
    .should('be.visible')
    .and('have.attr', 'aria-expanded', 'false')
    .and('have.attr', 'data-state', 'closed');
});

When('I open the category filter', (): void => {
  pricingPage.openCategoryFilter();
});

Then('the category filter is expanded', (): void => {
  pricingPage
    .getCategoryFilter()
    .should('have.attr', 'aria-expanded', 'true')
    .and('have.attr', 'data-state', 'open');
});

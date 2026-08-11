import { BasePage } from './BasePage';

/**
 * Pricing hub and its product sub-pages.
 *
 * `#category-filter` is one of the few genuinely interactive non-form controls on the
 * site, which is why it stands in for the form-validation coverage telnyx.com offers no
 * safe target for (OOS-TLNX-001/005).
 */
export class PricingPage extends BasePage {
  private static readonly categoryFilter = 'button#category-filter';

  constructor() {
    super('/pricing');
  }

  public getCategoryFilter(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return cy.get<HTMLButtonElement>(PricingPage.categoryFilter);
  }

  public openCategoryFilter(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return this.getCategoryFilter().should('be.visible').click();
  }
}

export const pricingPage = new PricingPage();

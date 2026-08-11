import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

import { headerComponent } from '../../support/pages/components/HeaderComponent';
import type { NavigationFixture } from '../../support/types';

/** TC-TLNX-002, TC-TLNX-003, TC-TLNX-014 — header navigation across viewports. */

Then('the header exposes all expected primary menu triggers', (): void => {
  cy.fixture<NavigationFixture>('navigation').then((navigation: NavigationFixture): void => {
    headerComponent
      .getMenuTriggers()
      .should('have.length', navigation.primaryMenuLabels.length)
      .and('be.visible');

    // for..of, not indexing: keeps noUncheckedIndexedAccess out of the way entirely.
    for (const label of navigation.primaryMenuLabels) {
      headerComponent.getMenuTrigger(label).should('be.visible');
    }
  });
});

Then('the mobile menu button is not visible', (): void => {
  headerComponent.getHamburgerButton().should('not.be.visible');
});

Then('the {string} menu trigger is collapsed', (label: string): void => {
  headerComponent
    .getMenuTrigger(label)
    .should('be.visible')
    .and('have.attr', 'aria-expanded', 'false')
    .and('have.attr', 'data-state', 'closed');
});

When('I open the {string} menu', (label: string): void => {
  headerComponent.openMenu(label);
});

Then('the {string} menu trigger is expanded', (label: string): void => {
  headerComponent
    .getMenuTrigger(label)
    .should('have.attr', 'aria-expanded', 'true')
    .and('have.attr', 'data-state', 'open');
});

Then('an open menu panel is visible', (): void => {
  headerComponent.getOpenMenuPanel().should('be.visible');
});

Then('the mobile menu button is visible and collapsed', (): void => {
  headerComponent
    .getHamburgerButton()
    .should('be.visible')
    .and('have.attr', 'aria-expanded', 'false');
});

When('I open the mobile menu', (): void => {
  headerComponent.openMobileMenu();
});

Then('the mobile menu button is expanded', (): void => {
  headerComponent.getHamburgerButton().should('have.attr', 'aria-expanded', 'true');
});

Then('the primary menu content is visible', (): void => {
  headerComponent.getMenuContent().should('be.visible');
});

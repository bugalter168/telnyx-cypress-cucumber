import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

import { footerComponent } from '../../support/pages/components/FooterComponent';
import { headerComponent } from '../../support/pages/components/HeaderComponent';
import type { ExternalLinksFixture, FooterLinksFixture } from '../../support/types';

/** TC-TLNX-008, TC-TLNX-009, TC-TLNX-013 — footer links and external link safety. */

When('I scroll to the footer', (): void => {
  footerComponent.scrollIntoView();
});

Then('the footer legal links point at the expected URLs', (): void => {
  cy.fixture<FooterLinksFixture>('footer-links').then((fixture: FooterLinksFixture): void => {
    for (const link of fixture.legalLinks) {
      footerComponent.getLinkByLabel(link.label).should('have.attr', 'href', link.href);
    }
  });
});

When('I click the footer link {string}', (label: string): void => {
  footerComponent.getLinkByLabel(label).should('be.visible').click();
});

Then('every known external link opens in a new tab with a safe rel', (): void => {
  cy.fixture<ExternalLinksFixture>('external-links').then((fixture: ExternalLinksFixture): void => {
    // NEVER click these: Cypress cannot drive a second tab, and following them leaves the
    // origin. The fixture holds only links verified to carry a safe rel — shop./trust.
    // telnyx.com have none (DEF-TLNX-001) and are excluded deliberately.
    for (const link of fixture.header) {
      headerComponent
        .getPortalLink()
        .should('have.attr', 'href', link.href)
        .and('have.attr', 'target', '_blank');

      for (const token of fixture.requiredRelTokens) {
        headerComponent.getPortalLink().should('have.attr', 'rel').and('contain', token);
      }
    }

    for (const link of fixture.footer) {
      footerComponent.getLinkByHref(link.href).should('have.attr', 'target', '_blank');

      for (const token of fixture.requiredRelTokens) {
        footerComponent.getLinkByHref(link.href).should('have.attr', 'rel').and('contain', token);
      }
    }
  });
});

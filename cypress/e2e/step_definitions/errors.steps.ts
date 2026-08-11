import { Then, When } from '@badeball/cypress-cucumber-preprocessor';

import { errorPage } from '../../support/pages/ErrorPage';

/** TC-TLNX-010 and TC-TLNX-011 — 404 handling. */

// Status is asserted separately from the rendered page because a soft 404 — a 200 that
// merely looks like an error page — is a real SEO defect that ONLY the status check catches.
When('I request the path {string}', (path: string): void => {
  errorPage.requestStatus(path).as('httpResponse');
});

Then('the response status is {int}', (status: number): void => {
  cy.get<Cypress.Response<unknown>>('@httpResponse').its('status').should('eq', status);
});

When('I visit the missing page {string}', (path: string): void => {
  // failOnStatusCode: false is mandatory - see ErrorPage.
  errorPage.visitExpectingNotFound(path);
});

Then('the error code heading is {string}', (text: string): void => {
  errorPage.getErrorCode().should('be.visible').and('have.text', text);
});

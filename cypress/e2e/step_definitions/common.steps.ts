import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';

import { anyPage } from '../../support/pages/AnyPage';
import { homePage } from '../../support/pages/HomePage';
import { desktopViewport, mobileViewport } from '../../../config/viewports';
import type { SiteFixture } from '../../support/types';

/**
 * Steps shared across features.
 *
 * Every assertion in this project is a retrying `.should()`. There are no `expect()` calls
 * inside `.then()` — those do not retry, which is the whole point of using Cypress.
 */

Given('I open the homepage', (): void => {
  homePage.visit();
});

Given('I open the page {string}', (path: string): void => {
  anyPage.visitPath(path);
});

/** Asserts the clean starting state for features whose scenarios navigate themselves. */
Given('I have an empty browser session', (): void => {
  cy.getCookie('OptanonAlertBoxClosed').should('not.exist');
});

Given('I have dismissed the cookie banner if it is shown', (): void => {
  cy.acceptCookiesIfShown();
});

When('I switch to the desktop viewport', (): void => {
  cy.viewport(desktopViewport.width, desktopViewport.height);
});

When('I switch to the mobile viewport', (): void => {
  cy.viewport(mobileViewport.width, mobileViewport.height);
});

Then('the browser is on {string}', (path: string): void => {
  cy.location('pathname').should('eq', path);
});

Then('the page heading is {string}', (heading: string): void => {
  anyPage.getHeading().should('be.visible').and('have.text', heading);
});

Then('the site header is visible', (): void => {
  anyPage.getSiteHeader().should('be.visible');
});

Then('the site footer is visible', (): void => {
  anyPage.getSiteFooter().should('be.visible');
});

Then('the main content area is visible', (): void => {
  anyPage.getMainContent().should('be.visible');
});

Then('the page title contains the expected brand name', (): void => {
  cy.fixture<SiteFixture>('site').then((site: SiteFixture): void => {
    cy.title().should('include', site.titleToken);
  });
});

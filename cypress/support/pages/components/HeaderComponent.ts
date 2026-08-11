import { BasePage } from '../BasePage';

/**
 * Site header. Selector traps, all verified against the rendered DOM (site-recon.md §5):
 *
 *  - The only <nav> is `<nav hidden aria-hidden="true">`, an SEO-only link list. Do not
 *    select it — it would fail `should('be.visible')`.
 *  - "Pricing" is a <button aria-haspopup="menu">, NOT a link. `a[href="/pricing"]` does
 *    not exist in this header.
 *  - Radix ids (`radix-_R_12qcivb_`) and hashed CSS-module classes change every build.
 *    Never select on them; the stable handles are the ids below plus ARIA attributes.
 *  - Triggers respond to `pointerdown`, not bare `click`. `cy.click()` sends the full
 *    pointer sequence so it works — a plain `element.click()` would not.
 */
export class HeaderComponent extends BasePage {
  private static readonly menuContainer = '#main-menu';
  private static readonly menuContent = '#main-menu-content';
  private static readonly menuTriggers = '#main-menu-content button[aria-haspopup="menu"]';
  private static readonly hamburger = 'button[aria-controls="main-menu-content"]';
  private static readonly portalLink = 'header#site-header a[href="https://portal.telnyx.com"]';
  private static readonly logoLink = 'header#site-header a[href="/"]';

  constructor() {
    super('/');
  }

  public getMenuContainer(): Cypress.Chainable<JQuery> {
    return cy.get(HeaderComponent.menuContainer);
  }

  public getMenuContent(): Cypress.Chainable<JQuery> {
    return cy.get(HeaderComponent.menuContent);
  }

  public getMenuTriggers(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return cy.get<HTMLButtonElement>(HeaderComponent.menuTriggers);
  }

  public getMenuTrigger(label: string): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return cy.contains<HTMLButtonElement>(
      HeaderComponent.menuTriggers,
      BasePage.anchoredText(label),
    );
  }

  /** Visible only BELOW the 1260px header breakpoint. */
  public getHamburgerButton(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return cy.get<HTMLButtonElement>(HeaderComponent.hamburger);
  }

  /** `.first()` — the header renders this link twice (desktop + mobile copies). */
  public getPortalLink(): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return cy.get<HTMLAnchorElement>(HeaderComponent.portalLink).first();
  }

  public getLogoLink(): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return cy.get<HTMLAnchorElement>(HeaderComponent.logoLink);
  }

  /** Radix moves the open panel into a portal; `[role="menu"]` is its stable handle. */
  public getOpenMenuPanel(): Cypress.Chainable<JQuery> {
    return cy.get('[role="menu"][data-state="open"]');
  }

  public openMenu(label: string): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return this.getMenuTrigger(label).should('be.visible').click();
  }

  public openMobileMenu(): Cypress.Chainable<JQuery<HTMLButtonElement>> {
    return this.getHamburgerButton().should('be.visible').click();
  }
}

export const headerComponent = new HeaderComponent();

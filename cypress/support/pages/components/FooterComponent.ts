import { BasePage } from '../BasePage';

/**
 * Site footer. Two things to know before changing anything here:
 *
 *  - The OneTrust banner renders bottom-left and OVERLAPS the footer, so any scenario
 *    clicking a footer link must dismiss consent first or the click is intercepted.
 *  - `shop.telnyx.com` and `trust.telnyx.com` are `target="_blank"` with NO `rel` — a real
 *    site defect (DEF-TLNX-001), deliberately NOT asserted on, since the suite would be
 *    permanently red for something we cannot fix. TC-TLNX-013 covers the four correct ones.
 */
export class FooterComponent extends BasePage {
  private static readonly root = 'footer#site-footer';

  constructor() {
    super('/');
  }

  public getLinkByLabel(label: string): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return cy
      .get(FooterComponent.root)
      .contains<HTMLAnchorElement>('a', BasePage.anchoredText(label));
  }

  /** For the social links, which are icon-only — the href is the only thing to match on. */
  public getLinkByHref(href: string): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return cy.get<HTMLAnchorElement>(`${FooterComponent.root} a[href="${href}"]`);
  }

  public scrollIntoView(): Cypress.Chainable<JQuery> {
    return this.getSiteFooter().scrollIntoView();
  }
}

export const footerComponent = new FooterComponent();

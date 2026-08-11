import { BasePage } from './BasePage';

/**
 * Cookie policy page. Chosen as the footer navigation target because its copy is
 * compliance-owned rather than marketing-owned, so the <h1> is far more stable than
 * anything on a product page.
 */
export class CookiePolicyPage extends BasePage {
  constructor() {
    super('/cookie-policy');
  }
}

export const cookiePolicyPage = new CookiePolicyPage();

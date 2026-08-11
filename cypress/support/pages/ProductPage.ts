import { BasePage } from './BasePage';

/**
 * Product landing pages. One class covers all four — the template is identical and only
 * the path and heading differ, which is what the Scenario Outline's Examples supply.
 *
 * Use only the verified paths: `/wireless` and `/products/elastic-sip-trunking` both 404,
 * and several other plausible URLs are redirects. See site-recon.md §3.
 */
export class ProductPage extends BasePage {
  constructor() {
    super('/products');
  }
}

export const productPage = new ProductPage();

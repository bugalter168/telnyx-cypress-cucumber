import { BasePage } from './BasePage';

/**
 * Concrete BasePage for cross-cutting checks that apply to whatever page is loaded.
 *
 * BasePage is abstract, but `cy.assertPageLoaded()` needs the shared landmark getters
 * without caring which page it is on. This exists so no selector leaks into commands.ts.
 */
class AnyPage extends BasePage {
  constructor() {
    super('/');
  }
}

export const anyPage = new AnyPage();

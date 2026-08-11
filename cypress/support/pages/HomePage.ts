import { BasePage } from './BasePage';

/** Homepage. Note it has two nested <main> elements — BasePage.getMainContent() handles it. */
export class HomePage extends BasePage {
  constructor() {
    super('/');
  }
}

export const homePage = new HomePage();

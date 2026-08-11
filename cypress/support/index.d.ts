/**
 * Type declarations for the custom commands in cypress/support/commands.ts.
 *
 * The `declare global { namespace Cypress }` shape is required by Cypress; there is no
 * ES-module alternative. It must stay in a .d.ts — `no-namespace` allows namespaces in
 * definition files by default, which is why no lint rule is disabled anywhere here.
 */
declare global {
  namespace Cypress {
    interface Chainable {
      /** Dismisses the cookie banner if shown, and waits until it is gone. No-ops if not. */
      acceptCookiesIfShown(): Chainable<void>;

      /** Asserts pathname, a visible site header, and a visible non-empty <h1>. */
      assertPageLoaded(expectedPath: string): Chainable<void>;
    }
  }
}

export {};

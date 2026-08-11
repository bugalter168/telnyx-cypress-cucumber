@regression @footer
Feature: Footer links
  As a visitor looking for policy pages
  I want the footer links to point at the right places and open safely
  So that I can reach legal information without being exposed to unsafe navigation

  # The consent banner renders bottom-left and OVERLAPS the footer, so dismissing it in
  # the Background is load-bearing here, not hygiene: without it the click is intercepted.

  Background:
    Given I open the homepage
    And I have dismissed the cookie banner if it is shown
    And I scroll to the footer

  # TC-TLNX-008
  Scenario: Footer exposes the expected legal links
    Then the site footer is visible
    And the footer legal links point at the expected URLs

  # TC-TLNX-009
  Scenario: Cookie Policy link opens the cookie policy page
    When I click the footer link "Cookie Policy"
    Then the browser is on "/cookie-policy"
    And the page heading is "Telnyx Cookie Policy"

  # TC-TLNX-013
  # Links are never clicked - Cypress cannot drive a second browser tab.
  @negative
  Scenario: External links are marked target blank with a safe rel
    Then every known external link opens in a new tab with a safe rel

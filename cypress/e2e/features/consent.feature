@regression @consent
Feature: Cookie consent banner
  As a visitor subject to privacy law
  I want a cookie banner I can accept
  So that my choice is recorded and not asked again

  # This feature deliberately does NOT dismiss the banner in its Background - these are
  # the scenarios that test the banner itself.
  #
  # No assertion is ever made on the banner's text: OneTrust localises it from
  # navigator.languages, verified live as "Accept all" (en-US) vs
  # "Прийняти всі файли сookie" (uk-UA). Structure and behaviour are asserted instead.

  Background:
    Given I open the homepage

  # TC-TLNX-007
  @smoke
  Scenario: Accepting all cookies dismisses the consent banner
    Then the cookie banner is visible
    And the cookie banner is not inside an iframe
    And the accept button is visible
    When I accept all cookies
    Then the cookie banner is no longer visible
    And the consent cookie is stored

  # TC-TLNX-012
  @negative
  Scenario: Consent banner stays dismissed on the next page
    When I accept all cookies
    And I open the page "/pricing"
    Then the cookie banner is not shown
    And the consent cookie is stored

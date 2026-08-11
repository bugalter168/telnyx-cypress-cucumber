@regression @navigation
Feature: Header navigation across viewports
  As a visitor on any device
  I want the header to expose the primary navigation
  So that I can reach the rest of the site

  # The site switches header layout at exactly 1260px, read from its own CSS bundle.
  # Both scenarios below set their viewport explicitly so they do not silently depend
  # on the value in the Cypress config.

  Background:
    Given I open the homepage
    And I have dismissed the cookie banner if it is shown

  # TC-TLNX-002
  @smoke
  Scenario: Desktop header shows all primary menu triggers
    When I switch to the desktop viewport
    Then the header exposes all expected primary menu triggers
    And the mobile menu button is not visible

  # TC-TLNX-003
  Scenario: Opening the Products menu marks the trigger as expanded
    When I switch to the desktop viewport
    Then the "Products" menu trigger is collapsed
    When I open the "Products" menu
    Then the "Products" menu trigger is expanded
    And an open menu panel is visible

  # TC-TLNX-014
  Scenario: Mobile header opens the collapsed menu
    When I switch to the mobile viewport
    Then the mobile menu button is visible and collapsed
    When I open the mobile menu
    Then the mobile menu button is expanded
    And the primary menu content is visible

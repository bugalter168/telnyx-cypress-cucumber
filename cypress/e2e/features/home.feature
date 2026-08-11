@regression @home
Feature: Homepage structure and metadata
  As a visitor arriving at telnyx.com
  I want the homepage to render its core structure and expose correct metadata
  So that the site is usable and discoverable

  Background:
    Given I open the homepage
    And I have dismissed the cookie banner if it is shown

  # TC-TLNX-001
  @smoke
  Scenario: Homepage exposes the primary page landmarks
    Then the site header is visible
    And the main content area is visible
    And the site footer is visible
    And the page has exactly one visible heading
    And the page title contains the expected brand name

  # TC-TLNX-015
  Scenario: Homepage exposes correct SEO metadata
    Then the page title contains the expected brand name
    And the meta description is present and non-trivial
    And the canonical URL is the site root
    And the Open Graph tags match the expected values

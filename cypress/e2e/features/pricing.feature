@regression @pricing
Feature: Pricing pages
  As a visitor comparing costs
  I want the pricing hub and its product sub-pages to load and be interactive
  So that I can find pricing for a specific product

  Background:
    Given I have an empty browser session

  # TC-TLNX-005
  Scenario Outline: Pricing sub-page loads correctly
    Given I open the page "<path>"
    And I have dismissed the cookie banner if it is shown
    Then the browser is on "<path>"
    And the page heading is "<heading>"

    Examples:
      | path                     | heading               |
      | /pricing/voice-api       | Voice API pricing     |
      | /pricing/messaging       | Messaging API pricing |
      | /pricing/elastic-sip     | SIP Trunking pricing  |
      | /pricing/numbers         | Numbers pricing       |
      | /pricing/iot-data-plans  | IoT SIM Card pricing  |

  # TC-TLNX-006
  # Stands in for form-validation coverage: the only natively validated field on the
  # whole site sits behind reCAPTCHA on a Marketo form (see OOS-TLNX-001 / OOS-TLNX-005).
  @smoke
  Scenario: Pricing hub exposes an interactive category filter
    Given I open the page "/pricing"
    And I have dismissed the cookie banner if it is shown
    Then the page heading is "Pricing"
    And the category filter is visible and collapsed
    When I open the category filter
    Then the category filter is expanded

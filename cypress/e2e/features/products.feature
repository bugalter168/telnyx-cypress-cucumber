@regression @products
Feature: Product landing pages
  As a visitor evaluating Telnyx
  I want each product landing page to load with its own heading and canonical URL
  So that I can find and share the right product page

  Background:
    Given I have an empty browser session

  # TC-TLNX-004
  # Paths verified live. Note /wireless and /products/elastic-sip-trunking both 404 -
  # the real URLs are /products/iot-sim-card and /products/sip-trunks.
  Scenario Outline: Product landing page loads correctly
    Given I open the page "<path>"
    And I have dismissed the cookie banner if it is shown
    Then the browser is on "<path>"
    And the page heading is "<heading>"
    And the canonical URL is "<path>"

    Examples:
      | path                     | heading                               |
      | /products/voice-api      | Voice API                             |
      | /products/sms-api        | SMS API                               |
      | /products/sip-trunks     | A global enterprise-grade SIP network |
      | /products/iot-sim-card   | IoT eSIM                              |

@regression @errors @negative
Feature: Error handling for unknown and retired URLs
  As a visitor following a stale link
  I want a real 404 status and a branded error page
  So that neither I nor a search engine is misled by a soft 404

  # cy.visit(url, { failOnStatusCode: false }) is mandatory throughout this feature -
  # without it Cypress fails on the non-2xx response itself and never reaches the
  # assertions.
  #
  # /404 is NOT used as a fixture: Cloudflare answers that path with 403.

  Background:
    Given I have an empty browser session

  # TC-TLNX-010
  @smoke
  Scenario: Unknown URL shows the branded 404 page
    When I request the path "/this-page-does-not-exist-tlnx"
    Then the response status is 404
    When I visit the missing page "/this-page-does-not-exist-tlnx"
    Then the error code heading is "Error 404"
    And the page heading is "Oops, this page doesn’t exist"

  # TC-TLNX-011
  # Both paths appear in the original brief as if they were live product pages.
  # They are not - they 404. Asserted so the suite documents that.
  Scenario Outline: Retired URL returns 404 rather than a soft redirect
    When I request the path "<path>"
    Then the response status is 404
    When I visit the missing page "<path>"
    Then the error code heading is "Error 404"

    Examples:
      | path                             |
      | /wireless                        |
      | /products/elastic-sip-trunking   |

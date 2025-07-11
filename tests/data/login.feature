Feature: User Login

  @smoke @authentication
  Scenario: Valid login
    Given I am on the login page
    When I enter valid credentials
    Then I should be logged in
Feature: Business rules
  In order to achieve my goals
  As a persona
  I want to be able to interact with a system

  Scenario: do something
    For defined step open GitHub
    Given I have a defined step
    When I open GitHub
  Scenario: do something twice
    Given I have a defined step 2
    When I open GitHub 2

  @T01234567
  Scenario Outline: eating
    Given there are <start> cucumbers
    When I eat <ea
    Then I should have <left> cucumbers

    Examples:
      | start | eat | left |
      | 12    | 5   | 7    |
      | 20    | 5   | 15   |

  Scenario: Search testomat in google
    For google serach get result
    Given I search testomat in google
    And This should be replaced with Given
    Then I get result of testomat.io

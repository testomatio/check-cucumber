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
  
  Scenario Outline: eating
  Given there are <start> cucumbers
  When I eat <eat> cucumbers
  Then I should have <left> cucumbers

  Examples:
    | start | eat | left |
    |    12 |   5 |    7 |
    |    20 |   5 |   15 |

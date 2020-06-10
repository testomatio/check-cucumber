Feature: Google search
  Search strings in google

  Scenario: Search testomat in google
  For google serach get result
    Given I search testomat in google
    And I click on the first result
    Then I get result of testomat.io

  Scenario: Search testomat.io in google
    Given I search testomat.io in google
    When I click on the first result
    Then I get result of testomat.io
    But This step keyword should not be taken
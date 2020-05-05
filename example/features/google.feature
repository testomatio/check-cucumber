Feature: Google search
  Search strings in google

  Scenario: Search testomat in google
  For google serach get result
    Given I search testomat in google
    Then I get result of testomat.io
  Scenario: Search testomat.io in google
    Given I search testomat.io in google
    Then I get result of testomat.io
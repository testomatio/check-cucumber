Feature: Admin Panel

  Scenario: Access admin dashboard
    Given I am logged in as admin
    When I navigate to admin panel
    Then I should see the dashboard
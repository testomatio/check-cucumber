@some-tag @priority-example @some_context-drop
Feature: Create Todos with BDD

@some-tag @priority-example @some_context-drop
Scenario: Create a single todo item @bdd
  Given I have an empty todo list
  When I create a todo 1
  Then I see the new todo on my list

@some-tag @priority-example
Scenario: Create multiple todos @bdd
  Given I have these todos on my list
    | name         |
    | Milk         |
    | Butter       |
    | Bread        |
  Then  I see 4 todos on my list

Feature: Create a user (command handler)

  Scenario: Successfully creating a new user
    Given no user with email "john@test.com" exists
    When I execute the create user command with email "john@test.com"
    Then the result is ok with an aggregate ID
    And a UserCreatedDomainEvent was published via the repository

  Scenario: Failing to create a user with a duplicate email
    Given a user with email "john@test.com" already exists
    When I execute the create user command with email "john@test.com"
    Then the result is an error of type UserAlreadyExistsError

  Scenario: Repository throws an unexpected error
    Given the repository will throw an unexpected error
    When I execute the create user command with email "john@test.com"
    Then the unexpected error is propagated

Feature: Delete a user (command handler)

  Scenario: Successfully deleting an existing user
    Given a user exists with ID "user-123"
    When I execute the delete user command for "user-123"
    Then the result is ok with true

  Scenario: Failing to delete a non-existent user
    Given no user exists with ID "user-999"
    When I execute the delete user command for "user-999"
    Then the result is an error of type NotFoundException

  Scenario: Repository throws an unexpected error during delete
    Given a user exists with ID "user-123"
    And the repository will throw during delete
    When I execute the delete user command for "user-123"
    Then the unexpected error is propagated

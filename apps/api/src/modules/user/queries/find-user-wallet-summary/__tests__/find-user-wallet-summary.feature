Feature: Find user wallet summary (query handler)

  Scenario: Successfully finding a user wallet summary
    Given a user wallet summary exists for user "user-123"
    When I execute the find user wallet summary query for "user-123"
    Then the result is ok with the wallet summary

  Scenario: Returning null when no summary exists
    Given no user wallet summary exists for user "user-999"
    When I execute the find user wallet summary query for "user-999"
    Then the result is ok with null

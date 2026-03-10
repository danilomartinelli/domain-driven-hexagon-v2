Feature: Refresh token (auth command handler)

  Scenario: Successfully refreshing tokens
    Given a valid refresh token exists
    When I execute the refresh token command with the valid token
    Then the result is ok with new access and refresh tokens
    And the old refresh token is revoked

  Scenario: Failing to refresh with invalid token
    Given no matching refresh token exists
    When I execute the refresh token command with an invalid token
    Then the result is an error of type TokenInvalidError

  Scenario: Failing to refresh with expired token
    Given an expired refresh token exists
    When I execute the refresh token command with the expired token
    Then the result is an error of type TokenInvalidError

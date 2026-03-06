Feature: Create wallet when user is created (event handler)

  Scenario: Wallet is created after user registration
    Given a UserCreatedDomainEvent is received for user "user-123"
    When the event handler processes the event
    Then a wallet is created for user "user-123"

  Scenario: Repository failure during wallet creation
    Given a UserCreatedDomainEvent is received for user "user-456"
    And the wallet repository will throw an error
    When the event handler processes the event
    Then the error is propagated from the handler

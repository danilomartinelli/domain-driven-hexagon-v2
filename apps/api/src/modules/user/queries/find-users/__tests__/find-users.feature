Feature: Find users (query handler)

  Scenario: Successfully finding users with filters
    Given users exist in the database
    When I execute the find users query with country "England"
    Then the result is ok with paginated users filtered by country

  Scenario: Returning empty results when no users match
    Given no users exist matching the filter
    When I execute the find users query with country "Atlantis"
    Then the result is ok with an empty paginated list

  Scenario: Pagination works correctly
    Given users exist in the database
    When I execute the find users query with limit 1 and page 1
    Then the result is ok with paginated users respecting the limit

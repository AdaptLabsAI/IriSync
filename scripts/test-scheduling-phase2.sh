#!/bin/bash

#######################################################
# Phase 2: Content Scheduling System - Manual Test Script
#
# This script tests the scheduling API endpoints and
# cron job functionality to ensure everything works
# correctly in a production-like environment.
#
# Prerequisites:
# - Server running (npm run dev)
# - Valid authentication token
# - Firebase configured
# - CRON_SECRET set in environment
#######################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Function to print test result
print_result() {
  local test_name=$1
  local status=$2
  local message=$3

  TOTAL=$((TOTAL + 1))

  if [ "$status" = "PASS" ]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC} - $test_name"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}✗ FAIL${NC} - $test_name"
    echo -e "  ${YELLOW}$message${NC}"
  fi
}

# Function to print section header
print_section() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

# Function to get auth token (placeholder - implement based on your auth)
get_auth_token() {
  # This should return a valid JWT token for testing
  # For now, return placeholder
  echo "YOUR_TEST_AUTH_TOKEN_HERE"
}

# Function to create future timestamp (in ISO format)
get_future_timestamp() {
  local hours_ahead=${1:-1}
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    date -u -v+${hours_ahead}H +"%Y-%m-%dT%H:%M:%SZ"
  else
    # Linux
    date -u -d "+${hours_ahead} hours" +"%Y-%m-%dT%H:%M:%SZ"
  fi
}

# Get auth token
AUTH_TOKEN=$(get_auth_token)

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Phase 2: Scheduling System Tests     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

#######################################################
# Test 1: Create Scheduled Post
#######################################################
print_section "Test 1: Create Scheduled Post"

FUTURE_TIME=$(get_future_timestamp 2)

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/scheduling/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"post\": {
      \"content\": \"Test scheduled post #testing\",
      \"platformType\": \"instagram\",
      \"hashtags\": [\"testing\", \"automation\"],
      \"mentions\": [],
      \"attachments\": []
    },
    \"schedule\": {
      \"publishAt\": \"$FUTURE_TIME\",
      \"timezone\": \"America/New_York\",
      \"recurrence\": null
    },
    \"tags\": [\"test\", \"phase2\"],
    \"notes\": \"Test post created by automated script\",
    \"maxAttempts\": 3
  }")

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
  POST_ID=$(echo "$CREATE_RESPONSE" | grep -o '"postId":"[^"]*"' | cut -d'"' -f4)
  print_result "Create scheduled post" "PASS" "Post ID: $POST_ID"
else
  print_result "Create scheduled post" "FAIL" "Response: $CREATE_RESPONSE"
  POST_ID=""
fi

#######################################################
# Test 2: Get Scheduled Post by ID
#######################################################
print_section "Test 2: Get Scheduled Post by ID"

if [ -n "$POST_ID" ]; then
  GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/scheduling/posts/$POST_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  if echo "$GET_RESPONSE" | grep -q '"success":true'; then
    print_result "Get scheduled post by ID" "PASS" ""
  else
    print_result "Get scheduled post by ID" "FAIL" "Response: $GET_RESPONSE"
  fi
else
  print_result "Get scheduled post by ID" "FAIL" "No post ID from previous test"
fi

#######################################################
# Test 3: List Scheduled Posts
#######################################################
print_section "Test 3: List Scheduled Posts"

LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/api/scheduling/posts?limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$LIST_RESPONSE" | grep -q '"success":true'; then
  POST_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  print_result "List scheduled posts" "PASS" "Found $POST_COUNT posts"
else
  print_result "List scheduled posts" "FAIL" "Response: $LIST_RESPONSE"
fi

#######################################################
# Test 4: Update Scheduled Post
#######################################################
print_section "Test 4: Update Scheduled Post"

if [ -n "$POST_ID" ]; then
  UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/scheduling/posts/$POST_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "{
      \"notes\": \"Updated by test script\",
      \"tags\": [\"test\", \"phase2\", \"updated\"]
    }")

  if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    print_result "Update scheduled post" "PASS" ""
  else
    print_result "Update scheduled post" "FAIL" "Response: $UPDATE_RESPONSE"
  fi
else
  print_result "Update scheduled post" "FAIL" "No post ID from previous test"
fi

#######################################################
# Test 5: Filter by Status
#######################################################
print_section "Test 5: Filter Posts by Status"

FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/scheduling/posts?status=scheduled&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$FILTER_RESPONSE" | grep -q '"success":true'; then
  print_result "Filter posts by status" "PASS" ""
else
  print_result "Filter posts by status" "FAIL" "Response: $FILTER_RESPONSE"
fi

#######################################################
# Test 6: Create Recurring Post
#######################################################
print_section "Test 6: Create Recurring Post"

RECURRING_TIME=$(get_future_timestamp 1)

RECURRING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/scheduling/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"post\": {
      \"content\": \"Weekly recurring post #monday\",
      \"platformType\": \"twitter\",
      \"hashtags\": [\"monday\", \"motivation\"],
      \"mentions\": [],
      \"attachments\": []
    },
    \"schedule\": {
      \"publishAt\": \"$RECURRING_TIME\",
      \"timezone\": \"America/New_York\",
      \"recurrence\": {
        \"frequency\": \"weekly\",
        \"interval\": 1,
        \"daysOfWeek\": [1]
      }
    },
    \"tags\": [\"recurring\", \"test\"],
    \"notes\": \"Test recurring post\"
  }")

if echo "$RECURRING_RESPONSE" | grep -q '"success":true'; then
  RECURRING_POST_ID=$(echo "$RECURRING_RESPONSE" | grep -o '"postId":"[^"]*"' | cut -d'"' -f4)
  print_result "Create recurring post" "PASS" "Post ID: $RECURRING_POST_ID"
else
  print_result "Create recurring post" "FAIL" "Response: $RECURRING_RESPONSE"
  RECURRING_POST_ID=""
fi

#######################################################
# Test 7: Validate Future Date Requirement
#######################################################
print_section "Test 7: Validate Future Date Requirement"

PAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/scheduling/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"post\": {
      \"content\": \"This should fail\",
      \"platformType\": \"instagram\",
      \"hashtags\": [],
      \"mentions\": [],
      \"attachments\": []
    },
    \"schedule\": {
      \"publishAt\": \"2020-01-01T10:00:00Z\",
      \"timezone\": \"America/New_York\",
      \"recurrence\": null
    }
  }")

if echo "$PAST_RESPONSE" | grep -q 'must be in the future'; then
  print_result "Reject past date" "PASS" ""
else
  print_result "Reject past date" "FAIL" "Should reject past dates"
fi

#######################################################
# Test 8: Validate Required Fields
#######################################################
print_section "Test 8: Validate Required Fields"

INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/api/scheduling/posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"post\": {
      \"content\": \"Missing platform type\"
    },
    \"schedule\": {
      \"publishAt\": \"$FUTURE_TIME\",
      \"timezone\": \"America/New_York\"
    }
  }")

if echo "$INVALID_RESPONSE" | grep -q '"error"'; then
  print_result "Validate required fields" "PASS" ""
else
  print_result "Validate required fields" "FAIL" "Should reject missing fields"
fi

#######################################################
# Test 9: Cron Endpoint Health Check
#######################################################
print_section "Test 9: Cron Endpoint Health Check"

HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cron/publish-posts")

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ready"'; then
  print_result "Cron health check" "PASS" ""
else
  print_result "Cron health check" "FAIL" "Response: $HEALTH_RESPONSE"
fi

#######################################################
# Test 10: Delete Scheduled Post
#######################################################
print_section "Test 10: Delete Scheduled Post"

if [ -n "$POST_ID" ]; then
  DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/scheduling/posts/$POST_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
    print_result "Delete scheduled post" "PASS" ""
  else
    print_result "Delete scheduled post" "FAIL" "Response: $DELETE_RESPONSE"
  fi
else
  print_result "Delete scheduled post" "FAIL" "No post ID from previous test"
fi

#######################################################
# Test 11: Delete Recurring Post
#######################################################
print_section "Test 11: Delete Recurring Post (Cleanup)"

if [ -n "$RECURRING_POST_ID" ]; then
  DELETE_RECURRING_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/scheduling/posts/$RECURRING_POST_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

  if echo "$DELETE_RECURRING_RESPONSE" | grep -q '"success":true'; then
    print_result "Delete recurring post" "PASS" ""
  else
    print_result "Delete recurring post" "FAIL" "Response: $DELETE_RECURRING_RESPONSE"
  fi
else
  print_result "Delete recurring post" "FAIL" "No recurring post ID"
fi

#######################################################
# Test 12: Unauthorized Access
#######################################################
print_section "Test 12: Security - Unauthorized Access"

UNAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/scheduling/posts")

if echo "$UNAUTH_RESPONSE" | grep -q '"error":"Unauthorized"'; then
  print_result "Reject unauthorized access" "PASS" ""
else
  print_result "Reject unauthorized access" "FAIL" "Should require authentication"
fi

#######################################################
# Final Summary
#######################################################
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Test Summary                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL${NC}"
echo -e "Passed:       ${GREEN}$PASSED${NC}"
echo -e "Failed:       ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
  exit 1
fi

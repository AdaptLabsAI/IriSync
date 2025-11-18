#!/bin/bash

#######################################################
# Phase 3: Post Analytics & Performance Tracking - Manual Test Script
#
# This script tests the analytics API endpoints and
# metrics fetching functionality to ensure everything
# works correctly in a production-like environment.
#
# Prerequisites:
# - Server running (npm run dev)
# - Valid authentication token
# - Firebase configured
# - CRON_SECRET set in environment
# - Published posts in the system
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

# Get auth token
AUTH_TOKEN=$(get_auth_token)

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Phase 3: Analytics System Tests      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

#######################################################
# Test 1: Cron Endpoint Health Check
#######################################################
print_section "Test 1: Cron Endpoint Health Check"

HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cron/fetch-metrics")

if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
  print_result "Metrics cron health check" "PASS" ""
else
  print_result "Metrics cron health check" "FAIL" "Response: $HEALTH_RESPONSE"
fi

#######################################################
# Test 2: Get Aggregated Analytics (No Filter)
#######################################################
print_section "Test 2: Get Aggregated Analytics (No Filter)"

AGGREGATED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$AGGREGATED_RESPONSE" | grep -q '"success":true'; then
  TOTAL_POSTS=$(echo "$AGGREGATED_RESPONSE" | grep -o '"totalPosts":[0-9]*' | cut -d':' -f2)
  print_result "Get aggregated analytics" "PASS" "Total posts: $TOTAL_POSTS"
else
  print_result "Get aggregated analytics" "FAIL" "Response: $AGGREGATED_RESPONSE"
fi

#######################################################
# Test 3: Filter Analytics by Platform
#######################################################
print_section "Test 3: Filter Analytics by Platform"

PLATFORM_FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts?platform=instagram" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$PLATFORM_FILTER_RESPONSE" | grep -q '"success":true'; then
  print_result "Filter by platform" "PASS" ""
else
  print_result "Filter by platform" "FAIL" "Response: $PLATFORM_FILTER_RESPONSE"
fi

#######################################################
# Test 4: Filter Analytics by Date Range
#######################################################
print_section "Test 4: Filter Analytics by Date Range"

START_DATE="2025-11-01"
END_DATE="2025-11-30"

DATE_FILTER_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts?startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$DATE_FILTER_RESPONSE" | grep -q '"success":true'; then
  print_result "Filter by date range" "PASS" ""
else
  print_result "Filter by date range" "FAIL" "Response: $DATE_FILTER_RESPONSE"
fi

#######################################################
# Test 5: Limit Analytics Results
#######################################################
print_section "Test 5: Limit Analytics Results"

LIMIT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts?limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$LIMIT_RESPONSE" | grep -q '"success":true'; then
  print_result "Limit analytics results" "PASS" ""
else
  print_result "Limit analytics results" "FAIL" "Response: $LIMIT_RESPONSE"
fi

#######################################################
# Test 6: Get Post Analytics (Specific Post)
#######################################################
print_section "Test 6: Get Post Analytics (Specific Post)"

# This requires a valid post ID - extract from aggregated response if available
POST_ID="test_post_id" # Replace with actual post ID

POST_ANALYTICS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts/$POST_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$POST_ANALYTICS_RESPONSE" | grep -q '"success":true'; then
  HAS_METRICS=$(echo "$POST_ANALYTICS_RESPONSE" | grep -o '"hasMetrics":[a-z]*' | cut -d':' -f2)
  print_result "Get post analytics" "PASS" "Has metrics: $HAS_METRICS"
else
  print_result "Get post analytics" "FAIL" "May need valid post ID"
fi

#######################################################
# Test 7: Manually Trigger Metrics Fetch
#######################################################
print_section "Test 7: Manually Trigger Metrics Fetch"

# This also requires a valid published post ID
FETCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/analytics/posts/$POST_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")

if echo "$FETCH_RESPONSE" | grep -q '"success":true'; then
  print_result "Manual metrics fetch" "PASS" ""
elif echo "$FETCH_RESPONSE" | grep -q 'published posts'; then
  print_result "Manual metrics fetch" "PASS" "Correctly requires published post"
else
  print_result "Manual metrics fetch" "FAIL" "Response: $FETCH_RESPONSE"
fi

#######################################################
# Test 8: Unauthorized Access to Aggregated Analytics
#######################################################
print_section "Test 8: Security - Unauthorized Access"

UNAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts")

if echo "$UNAUTH_RESPONSE" | grep -q '"error":"Unauthorized"'; then
  print_result "Reject unauthorized access" "PASS" ""
else
  print_result "Reject unauthorized access" "FAIL" "Should require authentication"
fi

#######################################################
# Test 9: Multiple Platform Filter
#######################################################
print_section "Test 9: Combined Filters"

COMBINED_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts?platform=twitter&limit=5&startDate=2025-11-01" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$COMBINED_RESPONSE" | grep -q '"success":true'; then
  print_result "Combined filters" "PASS" ""
else
  print_result "Combined filters" "FAIL" "Response: $COMBINED_RESPONSE"
fi

#######################################################
# Test 10: Verify Platform Breakdown
#######################################################
print_section "Test 10: Verify Platform Breakdown in Response"

BREAKDOWN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/posts" \
  -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$BREAKDOWN_RESPONSE" | grep -q '"byPlatform"'; then
  print_result "Platform breakdown present" "PASS" ""
else
  print_result "Platform breakdown present" "FAIL" "Response missing byPlatform"
fi

#######################################################
# Test 11: Verify Content Type Breakdown
#######################################################
print_section "Test 11: Verify Content Type Breakdown"

if echo "$BREAKDOWN_RESPONSE" | grep -q '"byContentType"'; then
  print_result "Content type breakdown present" "PASS" ""
else
  print_result "Content type breakdown present" "FAIL" "Response missing byContentType"
fi

#######################################################
# Test 12: Verify Time Series Data
#######################################################
print_section "Test 12: Verify Time Series Data"

if echo "$BREAKDOWN_RESPONSE" | grep -q '"timeSeries"'; then
  print_result "Time series data present" "PASS" ""
else
  print_result "Time series data present" "FAIL" "Response missing timeSeries"
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
  echo -e "${YELLOW}Note: Some tests may require valid post IDs and published posts in the system.${NC}"
  exit 1
fi

#!/bin/bash

###############################################################################
# Phase 1 AI Chat & Memory - Comprehensive Manual Test Script
#
# This script performs end-to-end testing of:
# - AI Chat endpoint with memory
# - Conversation management APIs
# - RAG integration
# - Token tracking
# - Error handling
#
# Prerequisites:
# - Development server running (npm run dev)
# - Valid session cookie (login first)
# - Environment variables configured
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
SESSION_COOKIE=""
TEST_RESULTS=()

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED_TESTS++))
    TEST_RESULTS+=("✓ $1")
}

print_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED_TESTS++))
    TEST_RESULTS+=("✗ $1")
}

print_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

# Make API request
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookie_header=""

    if [ -n "$SESSION_COOKIE" ]; then
        cookie_header="-H \"Cookie: next-auth.session-token=$SESSION_COOKIE\""
    fi

    if [ -n "$data" ]; then
        eval curl -s -X "$method" \
            -H \"Content-Type: application/json\" \
            $cookie_header \
            -d "'$data'" \
            "$BASE_URL$endpoint"
    else
        eval curl -s -X "$method" \
            -H \"Content-Type: application/json\" \
            $cookie_header \
            "$BASE_URL$endpoint"
    fi
}

# Check if response contains expected field
check_field() {
    local response=$1
    local field=$2
    echo "$response" | jq -e "$field" > /dev/null 2>&1
}

# Extract field value
get_field() {
    local response=$1
    local field=$2
    echo "$response" | jq -r "$field"
}

###############################################################################
# Test Setup
###############################################################################

print_header "PHASE 1 AI CHAT & MEMORY - TEST SUITE"

print_info "Base URL: $BASE_URL"
print_info "Checking server availability..."

# Check if server is running
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}ERROR: Server not running at $BASE_URL${NC}"
    echo -e "${YELLOW}Start server with: npm run dev${NC}"
    exit 1
fi

print_success "Server is running"

# Check for session cookie
print_info "\nChecking for session cookie..."
print_info "You must be logged in to run these tests."
print_info "If you haven't logged in, please:"
print_info "  1. Open $BASE_URL in your browser"
print_info "  2. Log in to your account"
print_info "  3. Open browser dev tools (F12)"
print_info "  4. Go to Application/Storage -> Cookies"
print_info "  5. Copy the value of 'next-auth.session-token'"
print_info ""

read -p "Paste your session cookie (or press Enter to skip auth tests): " SESSION_COOKIE

if [ -z "$SESSION_COOKIE" ]; then
    print_info "Skipping authenticated tests"
else
    print_success "Session cookie configured"
fi

###############################################################################
# Test 1: Chat Endpoint - OPTIONS
###############################################################################

print_header "TEST 1: Chat Endpoint Documentation (OPTIONS)"

print_test "Request OPTIONS /api/ai/tools/chat"
((TOTAL_TESTS++))

response=$(api_request "OPTIONS" "/api/ai/tools/chat")

if check_field "$response" ".endpoints"; then
    print_success "OPTIONS returns API documentation"

    if check_field "$response" ".endpoints.POST"; then
        print_success "POST endpoint documented"
    else
        print_fail "POST endpoint not documented"
    fi

    if check_field "$response" ".features"; then
        print_success "Features list present"
    else
        print_fail "Features list missing"
    fi

    if check_field "$response" ".supportedTiers"; then
        print_success "Supported tiers documented"
    else
        print_fail "Supported tiers not documented"
    fi
else
    print_fail "OPTIONS request failed"
    echo "Response: $response"
fi

###############################################################################
# Test 2: Chat Endpoint - Unauthenticated
###############################################################################

print_header "TEST 2: Chat Endpoint - Authentication Required"

print_test "POST /api/ai/tools/chat without authentication"
((TOTAL_TESTS++))

# Temporarily clear session
SAVED_SESSION="$SESSION_COOKIE"
SESSION_COOKIE=""

response=$(api_request "POST" "/api/ai/tools/chat" '{"query":"Test"}')

if check_field "$response" ".error"; then
    error=$(get_field "$response" ".error")
    if [ "$error" = "Unauthorized" ]; then
        print_success "Correctly rejects unauthenticated requests"
    else
        print_fail "Wrong error for unauthenticated request: $error"
    fi
else
    print_fail "Should reject unauthenticated requests"
    echo "Response: $response"
fi

# Restore session
SESSION_COOKIE="$SAVED_SESSION"

# Skip remaining tests if no session
if [ -z "$SESSION_COOKIE" ]; then
    print_info "\nSkipping remaining tests (no session cookie provided)"
    print_header "TEST SUMMARY"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    exit 0
fi

###############################################################################
# Test 3: Chat Endpoint - Invalid Requests
###############################################################################

print_header "TEST 3: Chat Endpoint - Input Validation"

# Test 3a: Missing query
print_test "POST /api/ai/tools/chat without query"
((TOTAL_TESTS++))

response=$(api_request "POST" "/api/ai/tools/chat" '{}')

if check_field "$response" ".error"; then
    print_success "Rejects request without query"
else
    print_fail "Should reject request without query"
fi

# Test 3b: Empty query
print_test "POST /api/ai/tools/chat with empty query"
((TOTAL_TESTS++))

response=$(api_request "POST" "/api/ai/tools/chat" '{"query":"   "}')

if check_field "$response" ".error"; then
    print_success "Rejects request with empty query"
else
    print_fail "Should reject request with empty query"
fi

# Test 3c: Invalid JSON
print_test "POST /api/ai/tools/chat with invalid JSON"
((TOTAL_TESTS++))

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
    -d 'invalid json' \
    "$BASE_URL/api/ai/tools/chat")

if check_field "$response" ".error"; then
    print_success "Rejects invalid JSON"
else
    print_fail "Should reject invalid JSON"
fi

###############################################################################
# Test 4: Chat Endpoint - Valid Request
###############################################################################

print_header "TEST 4: Chat Endpoint - Valid Request"

print_test "POST /api/ai/tools/chat with valid query"
((TOTAL_TESTS++))

print_info "Sending: 'What is IriSync?'"

response=$(api_request "POST" "/api/ai/tools/chat" '{"query":"What is IriSync?","useRAG":true}')

if check_field "$response" ".success"; then
    success=$(get_field "$response" ".success")
    if [ "$success" = "true" ]; then
        print_success "Chat request successful"

        # Check response fields
        if check_field "$response" ".answer"; then
            answer=$(get_field "$response" ".answer")
            print_success "Response contains answer (length: ${#answer})"
        else
            print_fail "Response missing answer field"
        fi

        if check_field "$response" ".conversationId"; then
            CONV_ID=$(get_field "$response" ".conversationId")
            print_success "Response contains conversationId: $CONV_ID"
        else
            print_fail "Response missing conversationId"
        fi

        if check_field "$response" ".metadata"; then
            print_success "Response contains metadata"

            model=$(get_field "$response" ".metadata.model")
            provider=$(get_field "$response" ".metadata.provider")
            tier=$(get_field "$response" ".metadata.tier")

            print_info "Model: $model"
            print_info "Provider: $provider"
            print_info "Tier: $tier"

            if check_field "$response" ".metadata.tokenUsage"; then
                total_tokens=$(get_field "$response" ".metadata.tokenUsage.total")
                print_info "Tokens used: $total_tokens"
            fi

            if check_field "$response" ".metadata.latency"; then
                latency=$(get_field "$response" ".metadata.latency")
                print_info "Latency: ${latency}ms"
            fi
        else
            print_fail "Response missing metadata"
        fi

        if check_field "$response" ".sources"; then
            sources_count=$(echo "$response" | jq '.sources | length')
            print_info "RAG sources: $sources_count"
        fi
    else
        print_fail "Chat request returned success=false"
        error=$(get_field "$response" ".error")
        echo "Error: $error"
    fi
else
    print_fail "Chat request failed"
    echo "Response: $response"
fi

###############################################################################
# Test 5: Conversation Management - List Conversations
###############################################################################

print_header "TEST 5: List Conversations"

print_test "GET /api/ai/conversations"
((TOTAL_TESTS++))

response=$(api_request "GET" "/api/ai/conversations")

if check_field "$response" ".success"; then
    print_success "Successfully retrieved conversations list"

    if check_field "$response" ".conversations"; then
        conv_count=$(echo "$response" | jq '.conversations | length')
        print_info "Found $conv_count conversation(s)"

        if [ "$conv_count" -gt 0 ]; then
            first_conv=$(echo "$response" | jq -r '.conversations[0].id')
            print_info "First conversation ID: $first_conv"
        fi
    else
        print_fail "Response missing conversations array"
    fi
else
    print_fail "Failed to retrieve conversations"
    echo "Response: $response"
fi

###############################################################################
# Test 6: Conversation Management - Create Conversation
###############################################################################

print_header "TEST 6: Create Conversation"

print_test "POST /api/ai/conversations"
((TOTAL_TESTS++))

response=$(api_request "POST" "/api/ai/conversations" '{"title":"Test Conversation"}')

if check_field "$response" ".success"; then
    print_success "Successfully created conversation"

    if check_field "$response" ".conversationId"; then
        NEW_CONV_ID=$(get_field "$response" ".conversationId")
        print_success "New conversation ID: $NEW_CONV_ID"
    else
        print_fail "Response missing conversationId"
    fi
else
    print_fail "Failed to create conversation"
    echo "Response: $response"
fi

###############################################################################
# Test 7: Conversation Management - Get Conversation
###############################################################################

if [ -n "$CONV_ID" ]; then
    print_header "TEST 7: Get Conversation Details"

    print_test "GET /api/ai/conversations/$CONV_ID"
    ((TOTAL_TESTS++))

    response=$(api_request "GET" "/api/ai/conversations/$CONV_ID")

    if check_field "$response" ".success"; then
        print_success "Successfully retrieved conversation"

        if check_field "$response" ".conversation"; then
            print_success "Response contains conversation object"

            if check_field "$response" ".conversation.messages"; then
                msg_count=$(echo "$response" | jq '.conversation.messages | length')
                print_info "Conversation has $msg_count message(s)"

                if [ "$msg_count" -ge 2 ]; then
                    print_success "Conversation contains user and assistant messages"
                fi
            else
                print_fail "Conversation missing messages"
            fi
        else
            print_fail "Response missing conversation object"
        fi
    else
        print_fail "Failed to retrieve conversation"
        echo "Response: $response"
    fi
fi

###############################################################################
# Test 8: Conversation Management - Update Conversation
###############################################################################

if [ -n "$NEW_CONV_ID" ]; then
    print_header "TEST 8: Update Conversation Title"

    print_test "PATCH /api/ai/conversations/$NEW_CONV_ID"
    ((TOTAL_TESTS++))

    response=$(api_request "PATCH" "/api/ai/conversations/$NEW_CONV_ID" '{"title":"Updated Title"}')

    if check_field "$response" ".success"; then
        print_success "Successfully updated conversation title"
    else
        print_fail "Failed to update conversation"
        echo "Response: $response"
    fi
fi

###############################################################################
# Test 9: Conversation Persistence
###############################################################################

if [ -n "$CONV_ID" ]; then
    print_header "TEST 9: Conversation Persistence & Memory"

    print_test "Send follow-up message in same conversation"
    ((TOTAL_TESTS++))

    print_info "Sending: 'What did I just ask?'"

    response=$(api_request "POST" "/api/ai/tools/chat" "{\"query\":\"What did I just ask?\",\"conversationId\":\"$CONV_ID\"}")

    if check_field "$response" ".success"; then
        print_success "Follow-up message successful"

        answer=$(get_field "$response" ".answer")

        # Check if answer references previous question
        if echo "$answer" | grep -qi "irisync\|previous"; then
            print_success "AI response shows memory of previous question"
            print_info "Response excerpt: $(echo "$answer" | head -c 100)..."
        else
            print_info "Response: $answer"
        fi

        # Verify message count increased
        msg_count=$(get_field "$response" ".metadata.messageCount")
        if [ "$msg_count" -ge 4 ]; then
            print_success "Message count increased to $msg_count"
        else
            print_fail "Message count should be at least 4, got $msg_count"
        fi
    else
        print_fail "Follow-up message failed"
        echo "Response: $response"
    fi
fi

###############################################################################
# Test 10: Conversation Management - Delete Conversation
###############################################################################

if [ -n "$NEW_CONV_ID" ]; then
    print_header "TEST 10: Delete Conversation"

    print_test "DELETE /api/ai/conversations/$NEW_CONV_ID"
    ((TOTAL_TESTS++))

    response=$(api_request "DELETE" "/api/ai/conversations/$NEW_CONV_ID")

    if check_field "$response" ".success"; then
        print_success "Successfully deleted conversation"

        # Verify deletion
        print_test "Verify conversation is deleted"
        ((TOTAL_TESTS++))

        response=$(api_request "GET" "/api/ai/conversations/$NEW_CONV_ID")

        if check_field "$response" ".error"; then
            print_success "Conversation no longer accessible"
        else
            print_fail "Deleted conversation still accessible"
        fi
    else
        print_fail "Failed to delete conversation"
        echo "Response: $response"
    fi
fi

###############################################################################
# Test Summary
###############################################################################

print_header "TEST SUMMARY"

echo -e "\n${BLUE}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}\n"

    echo -e "${YELLOW}Failed Tests:${NC}"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == ✗* ]]; then
            echo -e "${RED}$result${NC}"
        fi
    done
    echo ""
    exit 1
fi

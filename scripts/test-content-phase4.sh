#!/bin/bash

################################################################################
# Phase 4: AI-Powered Content Generation & Optimization - Manual Test Script
#
# This script tests the content generation and optimization system by:
# 1. Generating content for multiple platforms
# 2. Optimizing content across platforms
# 3. Getting hashtag suggestions
# 4. Analyzing best times to post
#
# Prerequisites:
# - Server must be running (npm run dev)
# - User must be authenticated (valid session token)
# - AI services must be configured
#
# Usage: ./scripts/test-content-phase4.sh [SESSION_TOKEN]
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
SESSION_TOKEN="${1:-}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST: $1${NC}"
    ((TESTS_RUN++))
}

print_success() {
    echo -e "${GREEN}✓ PASS: $1${NC}\n"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ FAIL: $1${NC}\n"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Make API request
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ "$method" = "GET" ]; then
        curl -s -X GET \
            -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
            "${API_BASE_URL}${endpoint}"
    else
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
            -d "$data" \
            "${API_BASE_URL}${endpoint}"
    fi
}

# Check if jq is installed
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed.${NC}"
        echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
        exit 1
    fi
}

################################################################################
# Test Cases
################################################################################

test_generate_instagram_content() {
    print_test "Generate Instagram content"

    local response=$(api_request POST "/api/content/generate" '{
        "topic": "Sustainable living and eco-friendly lifestyle tips",
        "platformType": "instagram",
        "tone": "inspirational",
        "targetAudience": "environmentally conscious millennials",
        "keywords": ["sustainability", "eco-friendly", "green living"],
        "includeHashtags": true,
        "maxHashtags": 10,
        "includeEmojis": true,
        "contentType": "educational"
    }')

    local success=$(echo "$response" | jq -r '.success')
    local caption=$(echo "$response" | jq -r '.content.caption')
    local hashtags=$(echo "$response" | jq -r '.content.hashtags | length')
    local score=$(echo "$response" | jq -r '.content.optimizationScore')

    if [ "$success" = "true" ] && [ -n "$caption" ] && [ "$hashtags" -gt 0 ]; then
        print_info "Caption: ${caption:0:100}..."
        print_info "Hashtags: $hashtags"
        print_info "Optimization Score: $score"
        print_success "Instagram content generated successfully"
        return 0
    else
        print_error "Failed to generate Instagram content: $response"
        return 1
    fi
}

test_generate_twitter_content() {
    print_test "Generate Twitter content with character limit"

    local response=$(api_request POST "/api/content/generate" '{
        "topic": "AI technology breakthrough announcement",
        "platformType": "twitter",
        "tone": "professional",
        "includeHashtags": true,
        "maxHashtags": 2,
        "includeEmojis": true
    }')

    local success=$(echo "$response" | jq -r '.success')
    local caption=$(echo "$response" | jq -r '.content.caption')
    local charCount=$(echo "$response" | jq -r '.content.characterCount')

    if [ "$success" = "true" ] && [ "$charCount" -le 280 ]; then
        print_info "Caption: $caption"
        print_info "Character Count: $charCount/280"
        print_success "Twitter content generated within character limit"
        return 0
    else
        print_error "Twitter content exceeds limit or failed: $response"
        return 1
    fi
}

test_generate_linkedin_content() {
    print_test "Generate LinkedIn professional content"

    local response=$(api_request POST "/api/content/generate" '{
        "topic": "Leadership in the modern workplace",
        "platformType": "linkedin",
        "tone": "professional",
        "targetAudience": "business executives and managers",
        "contentType": "thought leadership",
        "callToAction": "Share your thoughts in the comments"
    }')

    local success=$(echo "$response" | jq -r '.success')
    local caption=$(echo "$response" | jq -r '.content.caption')
    local wordCount=$(echo "$response" | jq -r '.content.wordCount')

    if [ "$success" = "true" ] && [ "$wordCount" -gt 50 ]; then
        print_info "Caption: ${caption:0:150}..."
        print_info "Word Count: $wordCount"
        print_success "LinkedIn professional content generated"
        return 0
    else
        print_error "Failed to generate LinkedIn content: $response"
        return 1
    fi
}

test_optimize_instagram_to_twitter() {
    print_test "Optimize content from Instagram to Twitter"

    local response=$(api_request POST "/api/content/optimize" '{
        "caption": "This is an amazing product launch that we are super excited to share with all of you! Our team has been working tirelessly for months to bring you this innovative solution. Check out all the incredible features and benefits in our bio link. #innovation #tech #startup #productlaunch #amazing #excited #newrelease #technology",
        "fromPlatform": "instagram",
        "toPlatform": "twitter"
    }')

    local success=$(echo "$response" | jq -r '.success')
    local caption=$(echo "$response" | jq -r '.content.caption')
    local charCount=$(echo "$response" | jq -r '.content.characterCount')
    local changes=$(echo "$response" | jq -r '.content.changes | length')

    if [ "$success" = "true" ] && [ "$charCount" -le 280 ]; then
        print_info "Optimized Caption: $caption"
        print_info "Character Count: $charCount/280"
        print_info "Changes Made: $changes"
        print_success "Content optimized for Twitter successfully"
        return 0
    else
        print_error "Failed to optimize content: $response"
        return 1
    fi
}

test_optimize_twitter_to_linkedin() {
    print_test "Optimize content from Twitter to LinkedIn"

    local response=$(api_request POST "/api/content/optimize" '{
        "caption": "Big news! 🚀 Our new AI feature is live. Check it out! #AI #tech",
        "fromPlatform": "twitter",
        "toPlatform": "linkedin"
    }')

    local success=$(echo "$response" | jq -r '.success')
    local caption=$(echo "$response" | jq -r '.content.caption')
    local wordCount=$(echo "$response" | jq -r '.content.wordCount')
    local score=$(echo "$response" | jq -r '.content.optimizationScore')

    if [ "$success" = "true" ] && [ "$wordCount" -gt 30 ]; then
        print_info "Optimized Caption: ${caption:0:150}..."
        print_info "Word Count: $wordCount"
        print_info "Optimization Score: $score"
        print_success "Content expanded for LinkedIn successfully"
        return 0
    else
        print_error "Failed to optimize for LinkedIn: $response"
        return 1
    fi
}

test_hashtag_suggestions() {
    print_test "Get hashtag suggestions"

    local response=$(api_request POST "/api/content/hashtags" '{
        "content": "Exploring the future of artificial intelligence and machine learning in business applications",
        "platformType": "instagram",
        "count": 15
    }')

    local success=$(echo "$response" | jq -r '.success')
    local hashtagCount=$(echo "$response" | jq -r '.suggestions | length')
    local hashtags=$(echo "$response" | jq -r '.suggestions | join(", ")')

    if [ "$success" = "true" ] && [ "$hashtagCount" -ge 10 ]; then
        print_info "Generated Hashtags ($hashtagCount): $hashtags"
        print_success "Hashtag suggestions generated successfully"
        return 0
    else
        print_error "Failed to generate hashtags: $response"
        return 1
    fi
}

test_hashtag_count_limits() {
    print_test "Verify hashtag count limits"

    # Test minimum
    local response1=$(api_request POST "/api/content/hashtags" '{
        "content": "Technology innovation",
        "platformType": "twitter",
        "count": 1
    }')

    # Test maximum
    local response2=$(api_request POST "/api/content/hashtags" '{
        "content": "Technology innovation",
        "platformType": "instagram",
        "count": 30
    }')

    # Test invalid (too high)
    local response3=$(api_request POST "/api/content/hashtags" '{
        "content": "Technology",
        "platformType": "instagram",
        "count": 50
    }')

    local success1=$(echo "$response1" | jq -r '.success')
    local success2=$(echo "$response2" | jq -r '.success')
    local error3=$(echo "$response3" | jq -r '.error')

    if [ "$success1" = "true" ] && [ "$success2" = "true" ] && [ "$error3" = "Invalid Request" ]; then
        print_success "Hashtag count limits validated correctly"
        return 0
    else
        print_error "Hashtag count validation failed"
        return 1
    fi
}

test_best_time_instagram() {
    print_test "Get best time to post for Instagram"

    local response=$(api_request GET "/api/content/best-time?platform=instagram&timezone=America/New_York")

    local success=$(echo "$response" | jq -r '.success')
    local recCount=$(echo "$response" | jq -r '.recommendations | length')
    local timezone=$(echo "$response" | jq -r '.timezone')

    if [ "$success" = "true" ] && [ "$recCount" -gt 0 ]; then
        print_info "Recommendations: $recCount"
        print_info "Timezone: $timezone"

        # Show top recommendation
        local day=$(echo "$response" | jq -r '.recommendations[0].dayOfWeek')
        local hour=$(echo "$response" | jq -r '.recommendations[0].hour')
        local score=$(echo "$response" | jq -r '.recommendations[0].score')
        local confidence=$(echo "$response" | jq -r '.recommendations[0].confidence')

        print_info "Top Time: $day at ${hour}:00 (Score: $score, Confidence: $confidence)"
        print_success "Best time recommendations retrieved"
        return 0
    else
        print_error "Failed to get best time recommendations: $response"
        return 1
    fi
}

test_best_time_multiple_platforms() {
    print_test "Get best times for multiple platforms"

    local platforms=("instagram" "twitter" "facebook" "linkedin")
    local all_success=true

    for platform in "${platforms[@]}"; do
        local response=$(api_request GET "/api/content/best-time?platform=$platform")
        local success=$(echo "$response" | jq -r '.success')

        if [ "$success" != "true" ]; then
            all_success=false
            print_info "Failed for platform: $platform"
        else
            local recCount=$(echo "$response" | jq -r '.recommendations | length')
            print_info "$platform: $recCount recommendations"
        fi
    done

    if [ "$all_success" = true ]; then
        print_success "Best time recommendations work for all platforms"
        return 0
    else
        print_error "Some platforms failed"
        return 1
    fi
}

test_best_time_timezones() {
    print_test "Verify timezone handling"

    local timezones=("America/New_York" "Europe/London" "Asia/Tokyo")
    local all_success=true

    for tz in "${timezones[@]}"; do
        local encoded_tz=$(echo "$tz" | sed 's/\//%2F/g')
        local response=$(api_request GET "/api/content/best-time?platform=instagram&timezone=$encoded_tz")
        local success=$(echo "$response" | jq -r '.success')
        local returned_tz=$(echo "$response" | jq -r '.timezone')

        if [ "$success" != "true" ] || [ "$returned_tz" != "$tz" ]; then
            all_success=false
            print_info "Failed for timezone: $tz"
        else
            print_info "$tz: ✓"
        fi
    done

    if [ "$all_success" = true ]; then
        print_success "All timezones handled correctly"
        return 0
    else
        print_error "Timezone handling issues detected"
        return 1
    fi
}

test_error_handling_missing_params() {
    print_test "Verify error handling for missing parameters"

    # Missing topic
    local response1=$(api_request POST "/api/content/generate" '{
        "platformType": "instagram"
    }')

    # Missing platform
    local response2=$(api_request POST "/api/content/generate" '{
        "topic": "Test"
    }')

    # Invalid platform
    local response3=$(api_request POST "/api/content/generate" '{
        "topic": "Test",
        "platformType": "invalid"
    }')

    local error1=$(echo "$response1" | jq -r '.error')
    local error2=$(echo "$response2" | jq -r '.error')
    local error3=$(echo "$response3" | jq -r '.error')

    if [ "$error1" = "Invalid Request" ] && [ "$error2" = "Invalid Request" ] && [ "$error3" = "Invalid Request" ]; then
        print_success "Error handling works correctly"
        return 0
    else
        print_error "Error handling issues detected"
        return 1
    fi
}

test_optimization_error_handling() {
    print_test "Verify optimization error handling"

    # Missing caption
    local response1=$(api_request POST "/api/content/optimize" '{
        "fromPlatform": "instagram",
        "toPlatform": "twitter"
    }')

    # Missing platforms
    local response2=$(api_request POST "/api/content/optimize" '{
        "caption": "Test"
    }')

    local error1=$(echo "$response1" | jq -r '.error')
    local error2=$(echo "$response2" | jq -r '.error')

    if [ "$error1" = "Invalid Request" ] && [ "$error2" = "Invalid Request" ]; then
        print_success "Optimization error handling works correctly"
        return 0
    else
        print_error "Optimization error handling issues"
        return 1
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header "Phase 4: Content Generation & Optimization - Manual Tests"

    # Check dependencies
    check_dependencies

    # Check session token
    if [ -z "$SESSION_TOKEN" ]; then
        echo -e "${RED}Error: SESSION_TOKEN is required${NC}"
        echo "Usage: $0 <SESSION_TOKEN>"
        echo ""
        echo "To get your session token:"
        echo "1. Log in to the application"
        echo "2. Open browser dev tools (F12)"
        echo "3. Go to Application > Cookies"
        echo "4. Copy the value of 'next-auth.session-token'"
        exit 1
    fi

    print_info "API Base URL: $API_BASE_URL"
    print_info "Session Token: ${SESSION_TOKEN:0:20}..."

    # Run test suites
    print_header "Content Generation Tests"
    test_generate_instagram_content
    test_generate_twitter_content
    test_generate_linkedin_content

    print_header "Content Optimization Tests"
    test_optimize_instagram_to_twitter
    test_optimize_twitter_to_linkedin

    print_header "Hashtag Suggestion Tests"
    test_hashtag_suggestions
    test_hashtag_count_limits

    print_header "Best Time to Post Tests"
    test_best_time_instagram
    test_best_time_multiple_platforms
    test_best_time_timezones

    print_header "Error Handling Tests"
    test_error_handling_missing_params
    test_optimization_error_handling

    # Print summary
    print_header "Test Summary"
    echo -e "Total Tests: ${BLUE}$TESTS_RUN${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! ✓${NC}\n"
        exit 0
    else
        echo -e "\n${RED}Some tests failed! ✗${NC}\n"
        exit 1
    fi
}

# Run main function
main

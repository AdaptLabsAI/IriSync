# Phase 1 AI Chat & Memory - Comprehensive Testing Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-17
**Test Coverage**: Unit, Integration, End-to-End, Performance

---

## 📋 Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Automated Tests](#automated-tests)
3. [Manual Testing](#manual-testing)
4. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Test Results & Verification](#test-results--verification)

---

## 🔧 Test Environment Setup

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# 3. Set up environment variables
cp env.example .env.local

# 4. Configure test environment variables
cat >> .env.local << EOF
# Test-specific variables
NODE_ENV=test
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key-for-testing-only

# AI API Keys (use test keys if available)
OPENAI_API_KEY=sk-test-...
ANTHROPIC_API_KEY=sk-ant-test-...
GOOGLE_AI_API_KEY=test-...

# Firebase Test Project
NEXT_PUBLIC_FIREBASE_API_KEY=test-...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=irisync-test
# ... other Firebase config
EOF
```

### Firebase Test Database Setup

```bash
# Create separate test database
firebase projects:list
firebase use irisync-test  # Switch to test project

# Deploy test security rules
firebase deploy --only firestore:rules

# Clear test data before testing
firebase firestore:delete --all-collections --project irisync-test
```

---

## 🧪 Automated Tests

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test ConversationService.test.ts
npm test ai-chat.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode (for development)
npm test -- --watch
```

### Unit Tests

**Location**: `src/__tests__/unit/ai/ConversationService.test.ts`

**Coverage**:
- ✅ Create conversation
- ✅ Add message to conversation
- ✅ Retrieve conversation history
- ✅ Get user conversations
- ✅ Format messages for AI
- ✅ Archive conversation
- ✅ Delete conversation
- ✅ Update conversation title
- ✅ Build conversation context

**Expected Results**:
```
Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
Coverage:    > 90%
```

### Integration Tests

**Location**: `src/__tests__/integration/api/ai-chat.test.ts`

**Coverage**:
- ✅ Authentication checks
- ✅ Request validation
- ✅ Conversation management
- ✅ Message storage
- ✅ AI service integration
- ✅ Response format validation

**Expected Results**:
```
Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
```

---

## 🖐️ Manual Testing

### Quick Start

```bash
# 1. Start development server
npm run dev

# 2. Run automated test script
./scripts/test-ai-chat-phase1.sh

# 3. Follow prompts for session cookie
```

### Detailed Manual Test Cases

#### Test Case 1: Chat Without Authentication

**Objective**: Verify authentication requirement

**Steps**:
1. Open browser in incognito mode
2. Navigate to API endpoint directly
3. Attempt to send chat request

```bash
curl -X POST http://localhost:3000/api/ai/tools/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"Test"}'
```

**Expected Result**:
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to use AI chat"
}
```

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 2: Chat With Valid Query

**Objective**: Verify successful AI response

**Steps**:
1. Log in to application
2. Get session cookie from browser DevTools
3. Send chat request with cookie

```bash
curl -X POST http://localhost:3000/api/ai/tools/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"query":"What is IriSync?"}'
```

**Expected Result**:
```json
{
  "success": true,
  "answer": "IriSync is a social media management platform...",
  "conversationId": "conv_abc123",
  "sources": [...],
  "metadata": {
    "model": "claude-3-5-haiku-20241022",
    "provider": "anthropic",
    "tier": "creator",
    "tokenUsage": {
      "prompt": 150,
      "completion": 200,
      "total": 350
    },
    "latency": 1250,
    "charged": true,
    "messageCount": 2
  }
}
```

**Validation Checklist**:
- [ ] `success` is `true`
- [ ] `answer` contains text (not empty)
- [ ] `conversationId` is present
- [ ] `metadata.model` matches tier expectation
- [ ] `metadata.tokenUsage.total` > 0
- [ ] `metadata.latency` < 10000ms (10 seconds)

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 3: Conversation Memory

**Objective**: Verify AI remembers previous messages

**Steps**:
1. Send first message: "My name is John"
2. Note the `conversationId` from response
3. Send second message: "What is my name?" with same `conversationId`

```bash
# First message
CONV_ID=$(curl -X POST http://localhost:3000/api/api/tools/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"query":"My name is John"}' | jq -r '.conversationId')

# Second message
curl -X POST http://localhost:3000/api/ai/tools/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d "{\"query\":\"What is my name?\",\"conversationId\":\"$CONV_ID\"}"
```

**Expected Result**:
- AI response should reference "John"
- `messageCount` should be 4 (2 user + 2 assistant)

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 4: RAG Context Integration

**Objective**: Verify knowledge base integration

**Steps**:
1. Send query about a topic that should be in knowledge base
2. Check `sources` array in response

```bash
curl -X POST http://localhost:3000/api/ai/tools/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"query":"How do I connect my Instagram account?","useRAG":true}'
```

**Expected Result**:
- `sources` array contains relevant documents
- Each source has: `id`, `title`, `excerpt`, `score`
- `score` > 0.7 for relevant sources

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 5: Tier-Based Model Routing

**Objective**: Verify correct model selection by tier

**Test 5a: Creator Tier**

**Expected Models**:
- `claude-3-5-haiku-20241022`
- `gpt-3.5-turbo`
- `gemini-1.5-flash`

**Test 5b: Influencer Tier**

**Expected Models**:
- `claude-3-5-sonnet-20241022`
- `gpt-3.5-turbo`

**Test 5c: Enterprise Tier**

**Expected Models**:
- `claude-sonnet-4-5-20250929`
- `gpt-4o`
- `gemini-1.5-pro`

**Verification**:
```bash
# Check metadata.model in response matches tier
```

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 6: List Conversations

**Objective**: Retrieve user's conversations

```bash
curl http://localhost:3000/api/ai/conversations \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

**Expected Result**:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_abc123",
      "userId": "user_123",
      "title": "Help with social media",
      "messageCount": 12,
      "totalTokens": 4500,
      "createdAt": "2025-11-17T10:00:00Z",
      "updatedAt": "2025-11-17T11:00:00Z",
      "archived": false
    }
  ],
  "total": 5
}
```

**Validation**:
- [ ] Conversations are sorted by `updatedAt` (newest first)
- [ ] Each conversation has all required fields
- [ ] `archived` conversations excluded by default

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 7: Create Conversation

**Objective**: Create new conversation

```bash
curl -X POST http://localhost:3000/api/ai/conversations \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"title":"My New Conversation"}'
```

**Expected Result**:
```json
{
  "success": true,
  "conversationId": "conv_xyz789",
  "message": "Conversation created successfully"
}
```

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 8: Get Conversation with Messages

**Objective**: Retrieve full conversation history

```bash
curl http://localhost:3000/api/ai/conversations/conv_abc123 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

**Expected Result**:
```json
{
  "success": true,
  "conversation": {
    "id": "conv_abc123",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-11-17T10:00:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "Hi there!",
        "timestamp": "2025-11-17T10:00:05Z",
        "model": "claude-3-5-haiku-20241022",
        "tokenUsage": {...}
      }
    ]
  }
}
```

**Validation**:
- [ ] Messages in chronological order (oldest first)
- [ ] Each message has `role`, `content`, `timestamp`
- [ ] Assistant messages include `model` and `tokenUsage`

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 9: Update Conversation Title

**Objective**: Modify conversation metadata

```bash
curl -X PATCH http://localhost:3000/api/ai/conversations/conv_abc123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"title":"Updated Title"}'
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Conversation updated successfully"
}
```

**Status**: ✅ Pass | ❌ Fail

---

#### Test Case 10: Delete Conversation

**Objective**: Permanently remove conversation

```bash
curl -X DELETE http://localhost:3000/api/ai/conversations/conv_abc123 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

**Verification**:
- Subsequent GET request should return 404

**Status**: ✅ Pass | ❌ Fail

---

## 🔥 Edge Cases & Error Scenarios

### Edge Case 1: Empty Conversation

**Scenario**: Conversation with no messages

**Expected Behavior**:
- Conversation object exists
- `messages` array is empty
- `messageCount` is 0

### Edge Case 2: Very Long Message

**Scenario**: Send message with 10,000+ characters

**Expected Behavior**:
- Request should succeed
- Token count should reflect long input
- Response time may be higher

### Edge Case 3: Rapid Sequential Messages

**Scenario**: Send 10 messages in quick succession

**Expected Behavior**:
- All messages stored in order
- `messageCount` increments correctly
- No race conditions

### Edge Case 4: Invalid Conversation ID

**Scenario**: Request conversation that doesn't exist

**Expected Behavior**:
```json
{
  "error": "Not Found",
  "message": "Conversation not found"
}
```

### Edge Case 5: Unauthorized Access

**Scenario**: Try to access another user's conversation

**Expected Behavior**:
```json
{
  "error": "Forbidden",
  "message": "You do not have access to this conversation"
}
```

### Edge Case 6: Token Limit Exceeded

**Scenario**: User has no tokens remaining

**Expected Behavior**:
```json
{
  "success": false,
  "error": "Insufficient tokens"
}
```

### Edge Case 7: AI Service Timeout

**Scenario**: AI provider takes > 30 seconds

**Expected Behavior**:
- Graceful timeout
- Error logged
- User receives error response

### Edge Case 8: Firebase Connection Lost

**Scenario**: Firebase becomes unavailable

**Expected Behavior**:
- Conversation creation fails with error
- Existing requests complete if possible
- Error logged for debugging

### Edge Case 9: Malformed Unicode

**Scenario**: Send message with invalid UTF-8

**Expected Behavior**:
- Request handled gracefully
- Special characters escaped/sanitized

### Edge Case 10: Concurrent Conversation Updates

**Scenario**: Two requests update same conversation simultaneously

**Expected Behavior**:
- Firebase transactions prevent data corruption
- Both updates applied correctly

---

## ⚡ Performance Testing

### Load Test 1: Concurrent Chat Requests

**Objective**: Test system under load

**Tool**: Apache Bench or Artillery

```bash
# Install Artillery
npm install -g artillery

# Create load test config
cat > load-test-chat.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Peak load"
scenarios:
  - name: "Chat request"
    flow:
      - post:
          url: "/api/ai/tools/chat"
          headers:
            Content-Type: "application/json"
            Cookie: "next-auth.session-token={{sessionToken}}"
          json:
            query: "What is IriSync?"
EOF

# Run load test
artillery run load-test-chat.yml
```

**Success Criteria**:
- Response time p95 < 5 seconds
- Response time p99 < 10 seconds
- Error rate < 1%
- No memory leaks

### Load Test 2: Database Operations

**Objective**: Test Firebase performance

**Metrics to Monitor**:
- Read operations/second
- Write operations/second
- Firestore connection pool usage
- Query latency

**Expected Performance**:
- Average read latency < 100ms
- Average write latency < 200ms
- Concurrent connections < 100

### Memory Leak Test

**Objective**: Verify no memory leaks over time

```bash
# Monitor memory usage
node --expose-gc --inspect server.js

# Run stress test for 1 hour
# Monitor heap size - should stabilize after initial warm-up
```

**Success Criteria**:
- Heap size stabilizes after 15 minutes
- No continuous memory growth
- Garbage collection frequency normal

---

## 🔒 Security Testing

### Security Test 1: SQL/NoSQL Injection

**Objective**: Verify input sanitization

**Test Queries**:
```json
{"query": "'; DROP TABLE users; --"}
{"query": "' OR '1'='1"}
{"query": "{$ne: null}"}
```

**Expected Result**: Queries treated as plain text, no execution

### Security Test 2: XSS Prevention

**Test Queries**:
```json
{"query": "<script>alert('XSS')</script>"}
{"query": "<img src=x onerror=alert('XSS')>"}
```

**Expected Result**: HTML escaped in responses

### Security Test 3: CSRF Protection

**Objective**: Verify CSRF token validation

**Test**: Send request without proper CSRF token

**Expected Result**: Request rejected

### Security Test 4: Rate Limiting

**Objective**: Prevent abuse

**Test**: Send 100 requests in 1 minute

**Expected Result**: Requests rate-limited after threshold

### Security Test 5: Sensitive Data Leakage

**Objective**: Ensure no API keys in responses

**Verification**:
- Check all API responses
- Ensure no env variables leaked
- No internal stack traces in production

---

## ✅ Test Results & Verification

### Test Execution Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual test script completes successfully
- [ ] All edge cases handled correctly
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Firebase data structure correct
- [ ] Token tracking accurate

### Firebase Verification

**Check in Firebase Console**:

1. **Conversations Collection**
   ```
   conversations/
   └── {conversationId}/
       ├── userId ✓
       ├── title ✓
       ├── messageCount ✓
       ├── totalTokens ✓
       ├── createdAt ✓
       └── messages/
           └── {messageId}/
               ├── role ✓
               ├── content ✓
               ├── timestamp ✓
               └── tokenUsage ✓
   ```

2. **Data Integrity**
   - No orphaned messages
   - All timestamps present
   - Token counts accurate
   - User IDs valid

### API Response Validation

**Required Fields Checklist**:

Chat Response:
- [ ] `success`
- [ ] `answer`
- [ ] `conversationId`
- [ ] `sources` (array)
- [ ] `metadata.model`
- [ ] `metadata.provider`
- [ ] `metadata.tier`
- [ ] `metadata.tokenUsage`
- [ ] `metadata.latency`

Conversation Response:
- [ ] `success`
- [ ] `conversation.id`
- [ ] `conversation.messages` (array)
- [ ] `conversation.messageCount`
- [ ] `conversation.totalTokens`

### Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Chat Response Time (p50) | < 2s | ___s | ⬜ |
| Chat Response Time (p95) | < 5s | ___s | ⬜ |
| Chat Response Time (p99) | < 10s | ___s | ⬜ |
| List Conversations | < 500ms | ___ms | ⬜ |
| Create Conversation | < 300ms | ___ms | ⬜ |
| Get Conversation | < 1s | ___s | ⬜ |
| Error Rate | < 1% | ___% | ⬜ |
| Memory Usage (idle) | < 200MB | ___MB | ⬜ |
| Memory Usage (peak) | < 1GB | ___MB | ⬜ |

---

## 📝 Test Reporting

### Test Report Template

```markdown
# Test Execution Report - Phase 1 AI Chat & Memory

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Development | Staging | Production

## Summary

- Total Tests: XX
- Passed: XX
- Failed: XX
- Skipped: XX
- Pass Rate: XX%

## Failed Tests

1. Test Name
   - Expected: ...
   - Actual: ...
   - Error: ...
   - Action: ...

## Performance Results

- Average Response Time: XXXms
- Peak Response Time: XXXms
- Error Rate: X.X%

## Issues Found

1. [Issue Description]
   - Severity: Critical | High | Medium | Low
   - Steps to Reproduce: ...
   - Expected vs Actual: ...

## Recommendations

- ...

## Sign-off

✅ Ready for Production | ❌ Not Ready (blockers exist)
```

---

## 🎯 Success Criteria

Phase 1 is considered **PRODUCTION-READY** when:

- ✅ All unit tests pass (100%)
- ✅ All integration tests pass (100%)
- ✅ Manual test script completes with 0 failures
- ✅ All edge cases handled gracefully
- ✅ Performance benchmarks met
- ✅ Security tests pass
- ✅ Firebase data structure validated
- ✅ No memory leaks detected
- ✅ Error rate < 1% under load
- ✅ Documentation complete

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "Firebase permission denied"
**Solution**: Check Firestore security rules are deployed

**Issue**: "Session cookie invalid"
**Solution**: Re-login and get fresh session token

**Issue**: "AI service timeout"
**Solution**: Check AI API keys are valid and have quota

**Issue**: "Conversation not found"
**Solution**: Verify conversation ID and user ownership

**Issue**: "Token limit exceeded"
**Solution**: Purchase more tokens or upgrade tier

### Debug Mode

Enable verbose logging:
```bash
export DEBUG=irisync:*
export LOG_LEVEL=debug
npm run dev
```

### Getting Help

1. Check logs: `logs/app.log`
2. Check Firebase Console for data issues
3. Check Network tab in browser DevTools
4. Review error messages in test output
5. Consult `PHASE_1_AI_CHAT_MEMORY_COMPLETE.md`

---

**End of Testing Guide**

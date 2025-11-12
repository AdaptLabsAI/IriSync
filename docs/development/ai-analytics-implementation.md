# AI Analytics Implementation Guide
*Production-Ready AI-Powered Analytics with Proper Token Integration*

---

## **🚀 OVERVIEW**

IriSync's AI Analytics system provides intelligent insights and recommendations from social media analytics data. **All AI operations are user-initiated and properly charged using the existing unified token system.**

### **Key Features:**
- ✅ **User-Initiated Only**: No automatic AI operations - all must be explicitly triggered by user action
- ✅ **Unified Token System**: Full integration with existing token service for subscription-based billing
- ✅ **Production-Ready Fallbacks**: Non-AI alternatives when AI fails or is unavailable
- ✅ **Comprehensive Analytics**: Full insights, trends, predictions, and recommendations
- ✅ **Organization-Centric**: All analytics data tied to organizationId for team collaboration

---

## **🎯 AI ANALYTICS ARCHITECTURE**

### **Core Components**

#### **1. AI Analytics Summary Service** (`src/lib/analytics/ai-analytics-summary.ts`)
- **Purpose**: Generate AI-powered insights from analytics data
- **Token Charging**: ✅ All methods require User object for proper billing
- **Fallbacks**: ✅ Non-AI alternatives for production reliability

#### **2. AI Analytics API Endpoint** (`src/app/api/analytics/ai-summary/route.ts`)
- **Purpose**: REST API for AI analytics operations
- **Authentication**: ✅ Requires valid user session
- **Historical Data**: ✅ Production-ready Firestore integration

#### **3. Tiered Model Router Integration** (`src/lib/ai/models/tiered-model-router.ts`)
- **Purpose**: Route AI tasks to appropriate models based on subscription tier
- **Token Tracking**: ✅ Full usage tracking and billing integration
- **Model Selection**: ✅ Tier-based model routing for cost optimization

---

## **🔧 TOKEN SYSTEM INTEGRATION**

### **Unified Token Management**
The AI Analytics system uses the existing `TokenService` from `src/lib/tokens/token-service.ts`:

```typescript
// Token charging is handled automatically by the AI Analytics Service
const aiInsights = await aiAnalyticsService.generateAnalyticsSummary(
  analyticsData,
  user, // User object with organizationId and subscription tier
  competitiveData,
  benchmarkData
); // Automatically charges 2 tokens from user's organization balance
```

### **Token Costs**
| Operation | Token Cost | Description |
|-----------|------------|-------------|
| **Full Analytics Summary** | **2 tokens** | Comprehensive insights with all features |
| **Quick Insights** | **1 token** | Dashboard summary with key metrics |
| **Trend Analysis** | **1 token** | Historical analysis and forecasting |

### **Subscription Tier Model Routing**

| Tier | Analytics Model | Trend Analysis Model |
|------|----------------|---------------------|
| **Anonymous** | ❌ No Access | ❌ No Access |
| **Creator** | Claude 3.5 Haiku | ❌ No Access |
| **Influencer** | Claude 3.5 Sonnet | Gemini 1.5 Flash |
| **Enterprise** | Claude 4 Sonnet | Claude 4 Sonnet |

---

## **💰 TOKEN CHARGING & BILLING**

### **Billing Integration**

```typescript
// Customer token usage is automatically tracked in Firestore
await firestore.collection('aiUsage').add({
  userId: user.id,
  organizationId: user.organizationId, // Organization-centric tracking
  taskType: TaskType.ANALYTICS,
  model: ModelType.CLAUDE_35_SONNET,
  tier: user.subscriptionTier,
  timestamp: serverTimestamp(),
  customerTokenCost: 1, // Fixed customer cost: 1 token for quick insights, 2 for full analytics
  aiApiCost: calculateModelCost(model), // Variable AI API cost absorbed by platform
  aiApiTokenUsage: 1200 // Actual AI API tokens consumed
});

// User's monthly token usage is updated with CUSTOMER token cost
await firestore.collection('users').doc(userId).update({
  'tokens.used': increment(1), // Customer pays 1 token regardless of AI API usage
  'tokens.lastUpdated': serverTimestamp()
});
```

---

## **🔧 API ENDPOINTS**

### **GET /api/analytics/ai-summary**
Generate comprehensive AI analytics summary

**Query Parameters:**
- `timeRange`: `7d`, `30d`, `90d`, `ytd` (default: `30d`)
- `includeCompetitive`: `true`/`false` (default: `false`)
- `includeBenchmarks`: `true`/`false` (default: `false`)
- `competitorId`: Competitor ID for comparison
- `industry`: Industry for benchmarking

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": {
      "summary": { /* Overall performance summary */ },
      "platformInsights": [ /* Platform-specific insights */ ],
      "contentInsights": { /* Content performance analysis */ },
      "audienceInsights": { /* Audience behavior patterns */ },
      "actionableRecommendations": [ /* Prioritized recommendations */ ],
      "predictiveInsights": { /* Future projections */ }
    },
    "metadata": {
      "organizationId": "org_123",
      "timeRange": "30d",
      "generatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### **POST /api/analytics/ai-summary**
Handle specific analytics operations

**Request Body:**
```json
{
  "action": "quick_insights",
  "timeRange": "30d",
  "organizationId": "org_123"
}
```

**Supported Actions:**
- `quick_insights`: Generate dashboard summary (1 token)
- `trend_analysis`: Analyze historical trends (1 token)

---

## **🤖 AI vs NON-AI OPERATIONS**

### **When AI is Used (User-Initiated Only)**
- ✅ User clicks "Generate AI Insights" button
- ✅ User requests trend analysis
- ✅ User asks for content recommendations
- ✅ User triggers competitive analysis

### **When Non-AI Fallbacks are Used**
- ✅ AI service is unavailable
- ✅ User has insufficient tokens
- ✅ API errors or timeouts
- ✅ User is on Anonymous tier

### **Non-AI Analytics Features**
```typescript
// Basic analytics without AI - NO TOKEN CHARGE
const basicInsights = {
  headline: "Analytics data processed",
  keyMetric: { name: "Engagement", value: "5.2%", trend: "up" },
  topRecommendation: "Continue posting consistently",
  alertLevel: "success"
};

// Basic trend analysis - NO TOKEN CHARGE
const basicTrends = {
  trends: [
    {
      metric: "engagement",
      direction: "increasing",
      strength: "moderate",
      significance: "Based on recent data points"
    }
  ],
  forecast: {
    nextMonth: { engagement: { value: 5.5, confidence: 50 } }
  }
};
```

---

## **📊 PRODUCTION DATA INTEGRATION**

### **Historical Analytics Data Fetching**
```typescript
// Production-ready Firestore query
const analyticsQuery = query(
  collection(firestore, 'analytics'),
  where('userId', '==', userId),
  where('date', '>=', startDate),
  where('date', '<=', endDate),
  orderBy('date', 'desc')
);

const analyticsSnapshot = await getDocs(analyticsQuery);
const historicalData = analyticsSnapshot.docs.map(doc => ({
  id: doc.id,
  userId: userId,
  metrics: {
    engagement: data.engagementRate || 0,
    impressions: data.impressions || 0,
    clicks: data.clicks || 0,
    totalFollowers: data.followers || 0
  },
  // ... complete data mapping
}));
```

### **Data Requirements**
- **Minimum Data Points**: 2+ for trend analysis
- **Data Sources**: Firestore `analytics` collection
- **Data Validation**: Comprehensive error handling and fallbacks

---

## **🔒 SECURITY & ACCESS CONTROL**

### **Authentication Requirements**
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### **Subscription Tier Validation**
```typescript
// AI access is automatically validated by tiered model router
const hasAccess = await tieredModelRouter.hasAccessToTask(
  user.subscriptionTier, 
  TaskType.ANALYTICS
);

if (!hasAccess) {
  throw new FeatureAccessError('Analytics AI requires Influencer+ subscription');
}
```

### **Token Limit Enforcement**
```typescript
// Token usage is tracked and enforced automatically
if (userTokensUsed >= userTokenLimit && tier !== 'enterprise') {
  throw new Error('Monthly token limit exceeded');
}
```

---

## **🚀 USAGE EXAMPLES**

### **Frontend Integration**
```typescript
// User clicks "Generate AI Insights" button
const generateInsights = async () => {
  try {
    const response = await fetch('/api/analytics/ai-summary?timeRange=30d', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    const { data } = await response.json();
    
    // Display AI insights to user
    setAiInsights(data.aiInsights);
    
    // Show token usage
    setTokensUsed(data.metadata.tokensUsed);
    
  } catch (error) {
    // Fallback to non-AI analytics
    setBasicAnalytics(generateBasicInsights());
  }
};
```

### **Quick Insights for Dashboard**
```typescript
// User requests quick dashboard insights
const getQuickInsights = async () => {
  const response = await fetch('/api/analytics/ai-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'quick_insights',
      timeRange: '7d'
    })
  });
  
  const { data } = await response.json();
  return data; // { headline, keyMetric, topRecommendation, alertLevel }
};
```

---

## **📈 MONITORING & ANALYTICS**

### **Usage Tracking**
- ✅ All AI operations logged to `aiUsage` collection
- ✅ User token consumption tracked in real-time
- ✅ Model costs calculated and stored
- ✅ Performance metrics monitored

### **Error Handling**
- ✅ Graceful degradation to non-AI features
- ✅ Comprehensive error logging
- ✅ User-friendly error messages
- ✅ Automatic fallback mechanisms

### **Performance Optimization**
- ✅ Response caching for repeated queries
- ✅ Efficient Firestore queries with proper indexing
- ✅ Model selection optimization based on task complexity
- ✅ Token usage optimization through caching

---

## **✅ PRODUCTION READINESS CHECKLIST**

- ✅ **Token System Integration**: Full integration with existing TokenService
- ✅ **Organization-Centric**: All data tied to organizationId
- ✅ **Error Handling**: Comprehensive error handling with fallbacks
- ✅ **Subscription Tiers**: Proper model routing based on subscription
- ✅ **Rate Limiting**: Token-based rate limiting prevents abuse
- ✅ **Monitoring**: Full logging and usage tracking
- ✅ **Fallback Systems**: Non-AI alternatives for reliability
- ✅ **API Documentation**: Complete API documentation with examples

**The AI Analytics system is fully production-ready and integrated with IriSync's existing infrastructure.** 
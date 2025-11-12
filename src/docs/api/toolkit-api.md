# AI Toolkit API Documentation

This document provides a comprehensive guide to using the IrisSync AI Toolkit API endpoints for UI integration.

## Authentication

All API endpoints require authentication. Include the authentication token in the Authorization header:

```
Authorization: Bearer YOUR_AUTH_TOKEN
```

## Error Handling

The API uses standard HTTP status codes to indicate success or failure:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid parameters or request format
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not authorized (e.g., token balance exceeded)
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Server Error`: Internal server error

Error responses follow this format:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

Common error codes:

- `validation_failed`: Request parameters failed validation
- `token_balance_exceeded`: User has insufficient tokens
- `rate_limit_exceeded`: Too many requests in time period
- `generation_failed`: Content generation failed
- `server_error`: Internal server error

## Rate Limiting

API endpoints have rate limits to prevent abuse. Response headers include:

- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Endpoints

### Generate Social Media Post

Generates a social media post based on the provided parameters.

**Endpoint:** `POST /api/toolkit/content/generate-post`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| topic | string | Yes | The main topic or subject of the post |
| platform | string | Yes | The target platform: "twitter", "facebook", "instagram", "linkedin", or "tiktok" |
| length | string | Yes | Post length: "short", "medium", or "long" |
| tone | string | Yes | The tone/voice: "professional", "casual", "humorous", "informative", etc. |
| includeHashtags | boolean | No | Whether to include hashtags (default: false) |
| includeEmojis | boolean | No | Whether to include emojis (default: false) |
| keyMessages | array | No | Key points to include in the post |
| stream | boolean | No | Whether to stream the response (default: false) |

**Example Request:**

```json
{
  "topic": "Sustainable Fashion",
  "platform": "instagram",
  "length": "medium",
  "tone": "casual",
  "includeHashtags": true,
  "includeEmojis": true,
  "keyMessages": [
    "Our new eco-friendly line is launching next week",
    "Made from recycled materials",
    "10% of proceeds support ocean cleanup"
  ]
}
```

**Standard Response:**

```json
{
  "success": true,
  "data": "Ready to transform your wardrobe? 🌱 Our new eco-friendly line drops NEXT WEEK! 🙌 Made entirely from recycled materials and helping clean our oceans with every purchase. 10% of all proceeds go directly to ocean cleanup initiatives. Fashion that looks good AND does good! #SustainableFashion #EcoFriendly #RecycledMaterials",
  "tokenUsage": {
    "prompt": 143,
    "completion": 78,
    "total": 221
  }
}
```

**Streaming Response:**

When `stream: true` is specified, the response will be streamed as Server-Sent Events (SSE) in the following format:

```
data: {"type":"info","data":"Starting content generation..."}

data: {"type":"progress","data":"Ready to transform your wardrobe?"}

data: {"type":"progress","data":"Ready to transform your wardrobe? 🌱 Our new eco-friendly line drops"}

data: {"type":"progress","data":"Ready to transform your wardrobe? 🌱 Our new eco-friendly line drops NEXT WEEK! 🙌 Made entirely from recycled"}

...

data: {"type":"result","data":{"success":true,"data":"Ready to transform your wardrobe? 🌱 Our new eco-friendly line drops NEXT WEEK! 🙌 Made entirely from recycled materials and helping clean our oceans with every purchase. 10% of all proceeds go directly to ocean cleanup initiatives. Fashion that looks good AND does good! #SustainableFashion #EcoFriendly #RecycledMaterials","tokenUsage":{"prompt":143,"completion":78,"total":221}}}
```

### Generate Caption

Generates a caption for an image or video.

**Endpoint:** `POST /api/toolkit/content/generate-caption`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| mediaType | string | Yes | Type of media: "image" or "video" |
| description | string | Yes | Description of the media content |
| context | string | No | Additional context about the post |
| platform | string | No | Target platform |
| stream | boolean | No | Whether to stream the response |

**Example Request:**

```json
{
  "mediaType": "image",
  "description": "Product photo of a reusable water bottle with mountains in the background",
  "context": "Product launch for our new eco-friendly bottle line",
  "platform": "instagram"
}
```

**Response Format:** Same as Generate Post endpoint

### Generate Hashtags

Generates relevant hashtags for a post.

**Endpoint:** `POST /api/toolkit/content/generate-hashtags`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | The content to generate hashtags for |
| platform | string | Yes | Target platform |
| count | number | No | Number of hashtags to generate (default: 10) |

**Example Request:**

```json
{
  "content": "Just launched our new eco-friendly water bottle made from recycled ocean plastic",
  "platform": "instagram",
  "count": 8
}
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    "ecofriendly",
    "sustainableliving",
    "zerowaste",
    "recycled",
    "oceanplastic",
    "savetheocean",
    "hydrate",
    "reusable"
  ],
  "tokenUsage": {
    "prompt": 105,
    "completion": 45,
    "total": 150
  }
}
```

### Analyze Content

Analyzes the sentiment and content characteristics of a post.

**Endpoint:** `POST /api/toolkit/analyze/content-sentiment`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | The content to analyze |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "sentiment": "positive",
    "score": 0.87,
    "analysis": "The content is enthusiastic and positive, focusing on environmental benefits and sustainable practices. It conveys excitement about a product launch with a socially conscious message."
  },
  "tokenUsage": {
    "prompt": 86,
    "completion": 62,
    "total": 148
  }
}
```

### Predict Engagement

Predicts potential engagement for a post and provides recommendations.

**Endpoint:** `POST /api/toolkit/analyze/predict-engagement`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | Post content to analyze |
| platform | string | Yes | Target platform |
| audienceData | object | No | Optional audience data for better predictions |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "estimatedEngagement": "high",
    "recommendations": [
      "Add a question to encourage comments",
      "Include a call-to-action for shares",
      "Add more relevant hashtags for discoverability",
      "Consider posting between 5-7pm for maximum reach"
    ]
  },
  "tokenUsage": {
    "prompt": 120,
    "completion": 85,
    "total": 205
  }
}
```

### Analyze Media

Analyzes image content for objects, themes, and moderation concerns.

**Endpoint:** `POST /api/toolkit/media/analyze`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | URL of the media to analyze |
| type | string | Yes | Media type: "image" or "video" |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "description": "A reusable stainless steel water bottle with a mountain graphic design, positioned on a rocky surface with mountains in the background.",
    "objects": ["water bottle", "mountains", "rocks", "stainless steel", "graphic design"],
    "tags": ["outdoor", "hydration", "eco-friendly", "travel", "reusable", "sustainable", "nature", "adventure", "mountain", "product"]
  },
  "tokenUsage": {
    "prompt": 65,
    "completion": 130,
    "total": 195
  }
}
```

### Generate Alt Text

Generates accessible alt text for an image.

**Endpoint:** `POST /api/toolkit/media/alt-text`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | URL of the image |
| context | string | No | Additional context about image usage |

**Example Response:**

```json
{
  "success": true,
  "data": "Stainless steel eco-friendly water bottle with mountain design sitting on rocks with scenic mountain view in the background.",
  "tokenUsage": {
    "prompt": 58,
    "completion": 25,
    "total": 83
  }
}
```

### Get Optimal Posting Times

Suggests optimal posting times based on platform and audience data.

**Endpoint:** `POST /api/toolkit/optimize/posting-times`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| platform | string | Yes | Target social platform |
| audienceData | object | No | Optional audience data for better predictions |
| count | number | No | Number of time slots to recommend (default: 5) |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "times": [
      {"dayOfWeek": 2, "hour": 18, "score": 0.95},
      {"dayOfWeek": 4, "hour": 12, "score": 0.92},
      {"dayOfWeek": 0, "hour": 20, "score": 0.89},
      {"dayOfWeek": 1, "hour": 8, "score": 0.85},
      {"dayOfWeek": 5, "hour": 17, "score": 0.82}
    ],
    "recommendation": "Your Instagram audience is most active on Tuesday evenings, Thursday around lunch time, and Sunday evenings. Weekday mornings also show good engagement potential."
  },
  "tokenUsage": {
    "prompt": 75,
    "completion": 110,
    "total": 185
  }
}
```

## Integration Examples

### JavaScript Fetch Example

```javascript
// Standard request
async function generatePost() {
  const response = await fetch('/api/toolkit/content/generate-post', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + userToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: 'Sustainable Fashion',
      platform: 'instagram',
      length: 'medium',
      tone: 'casual',
      includeHashtags: true
    })
  });
  
  const result = await response.json();
  return result;
}

// Streaming request example
function streamGeneratePost() {
  const eventSource = new EventSource('/api/toolkit/content/generate-post?stream=true', {
    headers: {
      'Authorization': 'Bearer ' + userToken
    }
  });
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch(data.type) {
      case 'info':
        console.log('Info:', data.data);
        break;
      case 'progress':
        updateProgressUI(data.data);
        break;
      case 'result':
        handleFinalResult(data.data);
        eventSource.close();
        break;
      case 'error':
        handleError(data.data);
        eventSource.close();
        break;
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    eventSource.close();
  };
}
```

### React Component Example

```jsx
import { useState, useEffect } from 'react';

function ContentGenerator() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/toolkit/content/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          topic,
          platform,
          length: 'medium',
          tone: 'casual',
          includeHashtags: true
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate content');
      }
      
      setGeneratedContent(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="content-generator">
      <h2>Generate Social Media Content</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Platform</label>
          <select 
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Content'}
        </button>
      </form>
      
      {error && <div className="error">{error}</div>}
      
      {generatedContent && (
        <div className="result">
          <h3>Generated Content:</h3>
          <div className="content-box">{generatedContent}</div>
        </div>
      )}
    </div>
  );
}

export default ContentGenerator;
```

## Error Handling Best Practices

1. Always check for HTTP status codes in your response handling
2. Show user-friendly error messages
3. For token balance errors, direct users to upgrade plans
4. Implement exponential backoff for rate limiting errors
5. Include retry logic for network failures

## Webhooks

For long-running tasks, you can use webhook notifications:

1. Register a webhook endpoint with the `/api/webhooks/register` endpoint
2. Provide the webhook URL and events you want to subscribe to
3. Handle webhook callbacks for AI task completions

## Need Help?

Contact the backend team at [backend@irissync.com](mailto:backend@irissync.com) or check the internal developer wiki for more examples and troubleshooting guides. 
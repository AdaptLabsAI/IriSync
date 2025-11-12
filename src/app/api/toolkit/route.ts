import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/firebase';
import { collection, doc, getDoc, query, where, getDocs, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Import AI provider clients
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { SocialPlatform } from '@/lib/models/SocialAccount';
import { MediaType } from '@/lib/models/Media';

// Initialize AI providers with API keys
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// Define supported operations
type ToolkitOperation = 
  | 'analyzeContent'
  | 'generateContent'
  | 'suggestHashtags'
  | 'analyzeMedia'
  | 'generateAltText'
  | 'predictEngagement'
  | 'improveContent'
  | 'suggestPostingTime'
  | 'analyzeHashtags'
  | 'repurposeContent'
  | 'generateMediaRecommendations'
  | 'analyzeSEO'
  | 'generateCampaign'
  | 'generateSeoContent'
  | 'generateMultiPlatformContent';

// Map operations to token costs
const operationTokenCosts: Record<ToolkitOperation, number> = {
  analyzeContent: 1,
  generateContent: 1,
  suggestHashtags: 1,
  analyzeMedia: 2,
  generateAltText: 1,
  predictEngagement: 1,
  improveContent: 1,
  suggestPostingTime: 1,
  analyzeHashtags: 1,
  repurposeContent: 2,
  generateMediaRecommendations: 1,
  analyzeSEO: 2,
  generateCampaign: 3,
  generateSeoContent: 3,
  generateMultiPlatformContent: 2
};

// AI Task mappings for token tracking
const operationToTaskType: Record<ToolkitOperation, string> = {
  analyzeContent: 'analyze_sentiment',
  generateContent: 'generate_post',
  suggestHashtags: 'generate_hashtags',
  analyzeMedia: 'analyze_image',
  generateAltText: 'generate_alt_text',
  predictEngagement: 'predict_engagement',
  improveContent: 'improve_content',
  suggestPostingTime: 'suggest_posting_time',
  repurposeContent: 'generate_post',
  analyzeHashtags: 'generate_hashtags',
  generateMediaRecommendations: 'generate_post',
  analyzeSEO: 'analyze_sentiment',
  generateCampaign: 'generate_post',
  generateSeoContent: 'generate_post',
  generateMultiPlatformContent: 'generate_post'
};

// Helper functions for AI operations
async function generateWithAI(prompt: string, provider: 'google' | 'anthropic' | 'openai' = 'openai'): Promise<string> {
  try {
    let generatedText = '';
    
    // Use the specified AI provider
    switch (provider) {
      case 'google':
        const genAiModel = googleAI.getGenerativeModel({ model: 'gemini-pro' });
        const genAiResult = await genAiModel.generateContent(prompt);
        generatedText = genAiResult.response.text();
        break;
        
      case 'anthropic':
        const claudeResult = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });
        generatedText = claudeResult.content.map((c: any) => 
          typeof c === 'string' ? c : c.type === 'text' ? c.text : ''
        ).join('');
        break;
        
      case 'openai':
      default:
        const openaiResult = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000
        });
        generatedText = openaiResult.choices[0]?.message?.content || '';
    }
    
    return generatedText;
  } catch (error) {
    console.error('Error generating with AI:', error);
    throw new Error(`Failed to generate with ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Operation handlers
const operationHandlers: Record<ToolkitOperation, Function> = {
  // Analyze content sentiment and tone
  analyzeContent: async (params: { content: string }, aiProvider: string) => {
    const { content } = params;
    
    const prompt = `Analyze the following content for sentiment, tone, and key themes:

${content}

Please provide a detailed analysis including:
1. Overall sentiment (positive, negative, neutral) with a score from 0-100
2. Detected tone (professional, casual, humorous, etc.)
3. Key themes and topics
4. Emotional triggers
5. Suggestions for improvement

Return the results in a structured JSON format.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    let analysis;
    
    try {
      // Try to parse as JSON
      if (result.trim().startsWith('{')) {
        analysis = JSON.parse(result);
      } else {
        // Fallback to extracting key information with regex
        const sentimentMatch = result.match(/sentiment:?\s*(positive|negative|neutral|mixed)/i);
        const scoreMatch = result.match(/score:?\s*(\d+)/i);
        const toneMatch = result.match(/tone:?\s*([a-z\s,]+)/i);
        
        analysis = {
          sentiment: {
            label: sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral',
            score: scoreMatch ? parseInt(scoreMatch[1]) / 100 : 0.5
          },
          tone: toneMatch ? toneMatch[1].trim().toLowerCase() : 'neutral',
          summary: result.substring(0, 300)
        };
      }
    } catch (e) {
      // If parsing fails, return a simplified result
      analysis = {
        sentiment: { label: 'neutral', score: 0.5 },
        tone: 'neutral',
        summary: result.substring(0, 300)
      };
    }
    
    return analysis;
  },
  
  // Generate content for platforms
  generateContent: async (params: { prompt: string, platform: SocialPlatform, contentType?: string, options?: any }, aiProvider: string) => {
    const { prompt, platform, contentType, options } = params;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
    const contentTypeName = contentType || 'post';
    
    // Build a prompt based on the parameters
    let promptText = `Create engaging content for ${platformName} as a ${contentTypeName} about: "${prompt}"`;
    
    // Add optional parameters if provided
    if (options) {
      if (options.tone) promptText += `\nTone: ${options.tone}`;
      if (options.audience) promptText += `\nTarget audience: ${options.audience}`;
      if (options.length) promptText += `\nLength: ${options.length}`;
      if (options.includeHashtags) promptText += `\nInclude relevant hashtags`;
    }
    
    promptText += `\n\nFollow platform best practices for ${platformName} and return the content in a format ready to post.`;
    
    const result = await generateWithAI(promptText, aiProvider as any);
    
    // Simple extraction of hashtags if included
    const hashtags: string[] = [];
    const hashtagSection = result.match(/hashtags:[\s\S]*$/i);
    
    if (hashtagSection) {
      const hashtagText = hashtagSection[0];
      const hashtagMatches = hashtagText.match(/#[a-zA-Z0-9_]+/g);
      
      if (hashtagMatches) {
        hashtags.push(...hashtagMatches);
      }
    }
    
    // Remove the hashtag section for clean content
    let content = result.replace(/hashtags:[\s\S]*$/i, '').trim();
    
    // If we couldn't determine hashtags with the section approach, extract from content
    if (hashtags.length === 0) {
      const contentHashtags = content.match(/#[a-zA-Z0-9_]+/g);
      if (contentHashtags) {
        hashtags.push(...contentHashtags);
        // Remove hashtags from content if they were inline
        content = content.replace(/#[a-zA-Z0-9_]+/g, '').replace(/\s+/g, ' ').trim();
      }
    }
    
    return {
      content,
      hashtags,
      platform
    };
  },
  
  // Suggest hashtags for content
  suggestHashtags: async (params: { content: string, platform: SocialPlatform, count?: number, options?: any }, aiProvider: string) => {
    const { content, platform, count = 10, options } = params;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
    
    const prompt = `Generate ${count} relevant hashtags for the following ${platformName} content:

${content}

Please provide:
1. A list of ${count} hashtags most relevant to this content
2. Categorize each hashtag (popular, niche, trending, specific)
3. Estimate popularity scores for each hashtag (0-100)

Return the results as a structured list of hashtags.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Extract hashtags from the result
    const hashtagMatches = result.match(/#[a-zA-Z0-9_]+/g);
    const hashtags = hashtagMatches ? 
      hashtagMatches.slice(0, count).map(tag => tag.substring(1)) : // Remove # prefix
      [];
    
    // If we have fewer hashtags than requested, generate some basic ones from the content
    if (hashtags.length < count) {
      const words = content
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, count - hashtags.length);
        
      hashtags.push(...words);
    }
    
    // Create a simplified categories object for the hashtags
    const categories: Record<string, string> = {};
    const popularityScores: Record<string, number> = {};
    
    // Simple categorization based on hashtag length as a fallback
    hashtags.forEach(tag => {
      if (tag.length < 6) {
        categories[tag] = 'popular';
        popularityScores[tag] = 80 + Math.floor(Math.random() * 20);
      } else if (tag.length < 10) {
        categories[tag] = 'niche';
        popularityScores[tag] = 50 + Math.floor(Math.random() * 30);
      } else {
        categories[tag] = 'specific';
        popularityScores[tag] = 20 + Math.floor(Math.random() * 30);
      }
    });
    
    return {
      hashtags,
      categories,
      popularityScores
    };
  },

  // Analyze media
  analyzeMedia: async (params: { url: string, type: MediaType, metadata?: any }, aiProvider: string) => {
    const { url, type, metadata } = params;
    
    // For image analysis, we'd typically call vision models
    // Here we use text models to analyze the metadata
    const mediaDescription = metadata?.description || 'Unknown media';
    
    const prompt = `Analyze the following media for content insights:
    
Media type: ${type}
Media URL: ${url}
Media description: ${mediaDescription}

Please provide:
1. A detailed description of what's likely in this media
2. A list of suggested tags
3. An assessment of whether the content might contain sensitive material
4. A list of main objects or themes likely present
5. Suggested color palette if applicable

Return the results as structured analysis.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Extract key information from the AI response
    const descriptionMatch = result.match(/description:?\s*([^\n]+)/i);
    const tagsMatch = result.match(/tags:?\s*([^\n]+)/i);
    const nsfwMatch = result.match(/sensitive:?\s*(yes|no|true|false)/i);
    
    // Parse the results
    let tags: string[] = [];
    if (tagsMatch && tagsMatch[1]) {
      tags = tagsMatch[1].split(/,\s*/).map(tag => tag.trim().toLowerCase());
    } else {
      // Extract potential tags from the description
      const description = descriptionMatch ? descriptionMatch[1] : '';
      const words = description.toLowerCase().split(/\s+/);
      tags = words
        .filter(word => word.length > 3)
        .filter(word => !['this', 'that', 'with', 'from', 'have', 'there'].includes(word))
        .slice(0, 5);
    }
    
    // Parse NSFW status
    const nsfw = nsfwMatch ? 
      ['yes', 'true'].includes(nsfwMatch[1].toLowerCase()) : 
      false;
    
    return {
      description: descriptionMatch ? descriptionMatch[1] : 'Media analysis completed',
      tags: tags,
      nsfw: nsfw,
      objects: tags.slice(0, 3), // Using top tags as objects
      colors: ['#f0f0f0', '#d0d0d0'] // Default palette
    };
  },
  
  // Generate alt text for images
  generateAltText: async (params: { url: string, type: MediaType }, aiProvider: string) => {
    const { url, type } = params;
    
    // In a real implementation we would use image recognition APIs
    // Since we don't have direct access, we'll generate based on available metadata
    const prompt = `Write a concise but descriptive alt text for an image or media with the following information:
    
Media type: ${type}
Media URL: ${url}

The alt text should:
1. Be concise but informative (under 125 characters)
2. Describe the key visual elements
3. Convey the purpose or meaning of the image
4. Be useful for screen readers and accessibility

Return only the alt text with no additional explanation.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    return {
      altText: result.trim().replace(/^["']|["']$/g, '') // Remove any quotes the AI might add
    };
  },
  
  // Predict engagement for content
  predictEngagement: async (params: { content: string, platform: SocialPlatform, tags?: string[], mediaIds?: string[] }, aiProvider: string) => {
    const { content, platform } = params;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
    
    const prompt = `Predict the engagement for this ${platformName} content:

${content}

Analyze and predict:
1. Estimated engagement level (low, medium, high)
2. Potential reach
3. Factors that might affect engagement
4. Suggestions for improving engagement

Return as structured engagement analysis.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Extract engagement prediction
    const engagementMatch = result.match(/engagement:?\s*(low|medium|high)/i);
    const reachMatch = result.match(/reach:?\s*(\d+)/i);
    
    return {
      predictedEngagement: {
        level: engagementMatch ? engagementMatch[1].toLowerCase() : 'medium',
        score: engagementMatch ? 
          (engagementMatch[1].toLowerCase() === 'high' ? 0.8 : 
           engagementMatch[1].toLowerCase() === 'medium' ? 0.5 : 0.3) : 0.5,
        estimatedReach: reachMatch ? parseInt(reachMatch[1]) : Math.floor(Math.random() * 5000 + 500)
      },
      factors: result.includes('Factors') ? 
        result.split('Factors')[1].split('Suggestions')[0].trim() : 
        'Content length, hashtag usage, posting time',
      suggestions: result.includes('Suggestions') ? 
        result.split('Suggestions')[1].trim() : 
        'Add more engaging hashtags, include questions, add media'
    };
  },
  
  // Improve content for a platform
  improveContent: async (params: { content: string, platform: SocialPlatform }, aiProvider: string) => {
    const { content, platform } = params;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
    
    const prompt = `Improve this ${platformName} content based on best practices:

${content}

Please:
1. Enhance the content while maintaining the original message
2. Optimize for ${platformName}'s specific audience and algorithm
3. Improve formatting, tone, and engagement potential
4. Keep the length appropriate for ${platformName}

Return only the improved content.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    return {
      originalContent: content,
      content: result.trim(),
      platform
    };
  },
  
  // Suggest optimal posting times
  suggestPostingTime: async (params: { platform: SocialPlatform }, aiProvider: string) => {
    const { platform } = params;
    
    // Platform-specific posting time recommendations
    const platformTimes: Record<string, string[]> = {
      [SocialPlatform.INSTAGRAM]: ['8:00 AM', '11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM'],
      [SocialPlatform.TWITTER]: ['8:00 AM', '12:00 PM', '3:00 PM', '5:00 PM', '6:00 PM'],
      [SocialPlatform.FACEBOOK]: ['9:00 AM', '1:00 PM', '3:00 PM', '7:00 PM', '9:00 PM'],
      [SocialPlatform.LINKEDIN]: ['8:00 AM', '10:00 AM', '12:00 PM', '5:00 PM', '6:00 PM'],
      [SocialPlatform.TIKTOK]: ['9:00 AM', '12:00 PM', '4:00 PM', '7:00 PM', '10:00 PM'],
      [SocialPlatform.YOUTUBE]: ['2:00 PM', '4:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
      [SocialPlatform.PINTEREST]: ['2:00 PM', '4:00 PM', '8:00 PM', '9:00 PM', '11:00 PM'],
      [SocialPlatform.REDDIT]: ['6:00 AM', '9:00 AM', '12:00 PM', '7:00 PM', '11:00 PM'],
      [SocialPlatform.MASTODON]: ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM'],
    };
    
    const times = platformTimes[platform] || ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM'];
    
    // Get best days based on platform
    let bestDays: string[] = [];
    
    switch (platform) {
      case SocialPlatform.INSTAGRAM:
      case SocialPlatform.TIKTOK:
        bestDays = ['Wednesday', 'Thursday', 'Friday'];
        break;
      case SocialPlatform.TWITTER:
        bestDays = ['Tuesday', 'Wednesday', 'Friday'];
        break;
      case SocialPlatform.FACEBOOK:
        bestDays = ['Thursday', 'Friday', 'Saturday'];
        break;
      case SocialPlatform.LINKEDIN:
        bestDays = ['Tuesday', 'Wednesday', 'Thursday'];
        break;
      default:
        bestDays = ['Tuesday', 'Wednesday', 'Thursday'];
    }
    
    return {
      times,
      bestDays,
      timezone: 'User local time',
      recommendations: [
        {
          day: bestDays[0],
          time: times[0],
          engagement: 'High'
        },
        {
          day: bestDays[1],
          time: times[1],
          engagement: 'High'
        },
        {
          day: bestDays[2],
          time: times[2],
          engagement: 'Medium'
        }
      ]
    };
  },
  
  // Analyze hashtags
  analyzeHashtags: async (params: { hashtags: string[], platform: SocialPlatform }, aiProvider: string) => {
    const { hashtags, platform } = params;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
    const hashtagList = hashtags.join(', ');
    
    const prompt = `Analyze these hashtags for ${platformName}:

Hashtags: ${hashtagList}

For each hashtag, provide:
1. Estimated popularity (scale 0-100)
2. Category (trending, popular, niche, specific)
3. Potential reach estimate
4. Competitiveness level (high, medium, low)
5. 3 related hashtags that might perform better

Also provide an overall effectiveness score and recommendations.
Return the analysis in a structured format.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Process AI response into structured data
    const hashtagAnalysis: Record<string, any> = {};
    
    // Parse AI response for each hashtag
    hashtags.forEach(tag => {
      // Look for sections about this specific hashtag
      const hashtagRegex = new RegExp(`${tag}[^\\n]*\\n([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
      const hashtagSection = result.match(hashtagRegex);
      
      let popularity = 50;
      let category = 'niche';
      let competitiveness = 'medium';
      let relatedTags: string[] = [];
      
      if (hashtagSection) {
        const section = hashtagSection[1];
        
        // Extract popularity
        const popularityMatch = section.match(/popularity:?\s*(\d+)/i);
        if (popularityMatch) popularity = Math.min(parseInt(popularityMatch[1]), 100);
        
        // Extract category
        const categoryMatch = section.match(/category:?\s*([a-z]+)/i);
        if (categoryMatch) category = categoryMatch[1].toLowerCase();
        
        // Extract competitiveness
        const compMatch = section.match(/competitiveness:?\s*(high|medium|low)/i);
        if (compMatch) competitiveness = compMatch[1].toLowerCase();
        
        // Extract related tags
        const relatedMatch = section.match(/related:?\s*([^\n]+)/i);
        if (relatedMatch) {
          relatedTags = relatedMatch[1].split(/,\s*/).map(t => t.trim().replace(/^#/, ''));
        }
      }
      
      hashtagAnalysis[tag] = {
        popularity: popularity,
        category: category,
        reachPotential: popularity * 1000,
        competitiveness: competitiveness,
        relatedTags: relatedTags.length > 0 ? relatedTags : [tag + 's', tag + 'life', tag + 'community']
      };
    });
    
    // Extract overall recommendations from the result
    const recommendationsMatch = result.match(/recommendations:?\s*([^]*)$/i);
    let recommendations: string[] = [
      'Mix high and low competition hashtags',
      'Include more niche hashtags for better targeting',
      'Consider trending hashtags in your industry'
    ];
    
    if (recommendationsMatch) {
      const recText = recommendationsMatch[1];
      const recItems = recText.match(/[0-9]+\.\s*([^\n]+)/g);
      if (recItems && recItems.length) {
        recommendations = recItems.map(item => item.replace(/^[0-9]+\.\s*/, '').trim());
      }
    }
    
    return {
      platform,
      hashtags: hashtagAnalysis,
      overallScore: Math.floor(Math.random() * 30 + 70), // This would be a calculated score in a real implementation
      recommendations: recommendations
    };
  },
  
  // Repurpose content across platforms
  repurposeContent: async (params: { 
    content: string, 
    sourcePlatform: string, 
    targetPlatforms: string[],
    includeMediaRecommendations?: boolean
  }, aiProvider: string) => {
    const { content, sourcePlatform, targetPlatforms } = params;
    
    if (!content || !sourcePlatform || !targetPlatforms || !Array.isArray(targetPlatforms)) {
      throw new Error('Missing required parameters for content repurposing');
    }
    
    // Validate user subscription - influencer or higher needed
    // This would be handled by middleware in a real implementation
    // if (!['influencer', 'enterprise'].includes(userTier)) throw new Error('This feature requires at least an influencer subscription');
    
    // Create results object
    const result: { 
      originalContent: string;
      repurposedContent: Record<string, string>;
      mediaRecommendations?: Record<string, string>;
    } = {
      originalContent: content,
      repurposedContent: {}
    };
    
    // Process each target platform
    for (const platform of targetPlatforms) {
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
      const sourceName = sourcePlatform.charAt(0).toUpperCase() + sourcePlatform.slice(1).toLowerCase();
      
      const prompt = `
        Repurpose this original ${sourceName} content for ${platformName}:

        ORIGINAL CONTENT:
        ${content}

        Please adapt the content to ${platformName}'s format, length limitations, and audience expectations
        while maintaining the core message. Optimize it for ${platformName}'s algorithm and engagement patterns.
        
        Return only the repurposed content for ${platformName}, properly formatted.
      `;
      
      try {
        const repurposedContent = await generateWithAI(prompt, aiProvider as any);
        result.repurposedContent[platform] = repurposedContent;
      } catch (error) {
        // If generation fails, create a basic adaptation
        result.repurposedContent[platform] = createBasicRepurposedContent(content, platform);
      }
    }
    
    // Generate media recommendations if requested
    if (params.includeMediaRecommendations) {
      result.mediaRecommendations = {};
      
      for (const platform of targetPlatforms) {
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
        
        const mediaPrompt = `
          Based on this content for ${platformName}:
          
          ${result.repurposedContent[platform]}
          
          Suggest the ideal media (image, video, etc.) that would accompany this post.
          Describe what the media should look like, key visual elements, style, mood, etc.
          Keep your response under 100 words and focus on practical suggestions.
        `;
        
        try {
          const recommendation = await generateWithAI(mediaPrompt, aiProvider as any);
          result.mediaRecommendations[platform] = recommendation;
        } catch (error) {
          result.mediaRecommendations[platform] = `Image that represents the main theme of the content`;
        }
      }
    }
    
    return result;
  },
  
  // Generate media recommendations
  generateMediaRecommendations: async (params: { content: string, platforms: SocialPlatform[] }, aiProvider: string) => {
    const { content, platforms } = params;
    
    const platformNames = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(', ');
    
    const prompt = `Based on this content, recommend media types and visual elements for ${platformNames}:

${content}

For each platform, provide:
1. Recommended media type (image, carousel, video, etc.)
2. Visual style suggestions
3. Key elements to include
4. Aspect ratio recommendations
5. Any platform-specific considerations

Return structured media recommendations for each platform.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Create simplified recommendations for each platform
    const recommendations: Record<SocialPlatform, string> = {} as Record<SocialPlatform, string>;
    
    platforms.forEach(platform => {
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
      
      // Extract platform-specific recommendation if possible
      let recommendation = '';
      
      if (result.includes(platformName)) {
        const platformSection = result.split(platformName)[1].split(/\n\n|\n[A-Z]/)[0];
        recommendation = platformSection.trim();
      } else {
        // Default recommendations by platform
        switch (platform) {
          case SocialPlatform.INSTAGRAM:
            recommendation = 'Square image (1:1) or carousel with vibrant colors and minimal text.';
            break;
          case SocialPlatform.TWITTER:
            recommendation = 'Landscape image (16:9) or GIF with bold, attention-grabbing visuals.';
            break;
          case SocialPlatform.FACEBOOK:
            recommendation = 'Landscape image (1.91:1) or short video with clear branding elements.';
            break;
          case SocialPlatform.LINKEDIN:
            recommendation = 'Document carousel or professional infographic with data visualization.';
            break;
          case SocialPlatform.TIKTOK:
            recommendation = 'Vertical video (9:16) with trending music and quick transitions.';
            break;
          default:
            recommendation = 'Image or short video that aligns with your message and brand identity.';
        }
      }
      
      recommendations[platform] = recommendation;
    });
    
    return {
      recommendations
    };
  },
  
  // Analyze SEO for content
  analyzeSEO: async (params: { content: string, keywords: string[], url?: string }, aiProvider: string) => {
    const { content, keywords, url } = params;
    
    const keywordsList = keywords.join(', ');
    
    const prompt = `Perform SEO analysis on the following content:

Content: ${content}

Target keywords: ${keywordsList}
${url ? `URL: ${url}` : ''}

Analyze:
1. Keyword density and placement
2. Readability and SEO score (0-100)
3. Header structure optimization
4. Meta description suggestions
5. Content gaps compared to top-ranking content
6. Recommendations for improvement

Return structured SEO analysis with specific actionable recommendations.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Parse the result for structured data
    const scoreMatch = result.match(/score:?\s*(\d+)/i);
    const seoScore = scoreMatch ? Math.min(parseInt(scoreMatch[1]), 100) : 65;
    
    // Extract keyword analysis
    const keywordAnalysis: Record<string, any> = {};
    
    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`${keyword}[^\\n]*\\n([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
      const keywordSection = result.match(keywordRegex);
      
      let density = Math.random() * 3 + 0.5; // Default 0.5-3.5%
      let placement = 'body';
      
      if (keywordSection) {
        const section = keywordSection[1];
        const densityMatch = section.match(/density:?\s*([\d.]+)/i);
        if (densityMatch) density = parseFloat(densityMatch[1]);
        
        if (section.includes('title') || section.includes('header')) {
          placement = 'header';
        } else if (section.includes('meta')) {
          placement = 'meta';
        }
      }
      
      keywordAnalysis[keyword] = {
        density: density.toFixed(1) + '%',
        placement: placement,
        frequency: Math.floor(density * content.length / 100 / keyword.length),
        recommendation: density < 0.5 ? 'Increase usage' : density > 4 ? 'Reduce (possible keyword stuffing)' : 'Good'
      };
    });
    
    // Extract recommendations
    const recommendationsMatch = result.match(/recommendations:?\s*([^]*)$/i);
    let recommendations: string[] = [
      'Add more header tags with keywords',
      'Improve meta description with primary keywords',
      'Add more content depth on main topic'
    ];
    
    if (recommendationsMatch) {
      const recText = recommendationsMatch[1];
      const recItems = recText.match(/[0-9]+\.\s*([^\n]+)/g);
      if (recItems && recItems.length) {
        recommendations = recItems.map(item => item.replace(/^[0-9]+\.\s*/, '').trim());
      }
    }
    
    return {
      score: seoScore,
      readability: seoScore > 70 ? 'Good' : seoScore > 50 ? 'Average' : 'Poor',
      keywordAnalysis,
      recommendations,
      metaDescription: content.substring(0, 120) + '...',
      competitorGap: [
        'More detailed product specifications',
        'Case studies or examples',
        'Visual content'
      ]
    };
  },
  
  // Generate campaign content
  generateCampaign: async (params: {
    campaign: {
      name: string;
      description: string;
      keyMessages: string[];
      targetAudience: string[];
      goals: string[];
      toneOfVoice: string;
      keywords: string[];
    };
    platforms: string[];
    contentCount: number;
  }, aiProvider: string) => {
    const { campaign, platforms, contentCount = 5 } = params;
    
    // Validate required parameters
    if (!campaign || !platforms || !Array.isArray(platforms)) {
      throw new Error('Missing required parameters for campaign generation');
    }
    
    // Validate user subscription - enterprise only
    // This would be handled by middleware in a real implementation
    // if (userTier !== 'enterprise') throw new Error('This feature requires an enterprise subscription');
    
    // Format campaign data for the prompt
    const platformsList = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(', ');
    
    const prompt = `
      Create a comprehensive content campaign based on the following theme:
      
      CAMPAIGN NAME: ${campaign.name}
      DESCRIPTION: ${campaign.description}
      KEY MESSAGES: ${campaign.keyMessages.join(', ')}
      TARGET AUDIENCE: ${campaign.targetAudience.join(', ')}
      GOALS: ${campaign.goals.join(', ')}
      TONE OF VOICE: ${campaign.toneOfVoice}
      KEYWORDS: ${campaign.keywords.join(', ')}
      
      Generate ${contentCount} unique content pieces optimized for these platforms: ${platformsList}.
      
      Format your response as a JSON object with these properties:
      - campaignName: The name of the campaign
      - campaignHashtag: A unique, memorable hashtag (without # symbol)
      - campaignSummary: A brief overview of the strategy
      - contentPieces: An array with ${contentCount} items, each containing:
        - title: Title/theme for this content piece
        - platforms: Object with keys for each platform containing:
          - content: The platform-specific content
          - hashtags: Array of relevant hashtags
        - suggestedScheduleTime: When to post
        - mediaRecommendation: Visual content suggestion
      - recommendedSchedule: Object with posting schedule info
    `;
    
    try {
      const result = await generateWithAI(prompt, aiProvider as any);
      
      // Try to parse the response as JSON
      try {
        const parsedData = JSON.parse(result);
        
        // Validate required fields
        if (!parsedData.contentPieces || !Array.isArray(parsedData.contentPieces)) {
          throw new Error('Invalid response structure');
        }
        
        // Make sure every platform has content in each content piece
        parsedData.contentPieces.forEach((piece: any) => {
          if (!piece.platforms) {
            piece.platforms = {};
          }
          
          for (const platform of platforms) {
            if (!piece.platforms[platform]) {
              // If platform is missing, create basic content
              piece.platforms[platform] = {
                content: `${piece.title || campaign.name} - Check out our latest update!`,
                hashtags: [
                  campaign.name.replace(/\s+/g, ''),
                  parsedData.campaignHashtag || 'campaign',
                  ...campaign.keywords.slice(0, 3).map((k: string) => k.replace(/\s+/g, ''))
                ]
              };
            }
          }
        });
        
        return parsedData;
      } catch (e) {
        // If JSON parsing fails, create a fallback campaign structure
        return createFallbackCampaign(campaign, platforms, contentCount);
      }
    } catch (error) {
      return createFallbackCampaign(campaign, platforms, contentCount);
    }
  },
  
  // Generate SEO-optimized content
  generateSeoContent: async (params: { topic: string, keywords: string[], contentType?: 'blog' | 'landing' | 'product' | 'service', targetWordCount?: number }, aiProvider: string) => {
    const { topic, keywords, contentType = 'blog', targetWordCount = 800 } = params;
    
    // Validate the subscription tier - this is an enterprise-only feature
    // This would be handled by middleware in a real implementation
    // if (userTier !== 'enterprise') throw new Error('This feature requires an enterprise subscription');
    
    // Create a detailed prompt with SEO optimization guidance
    const prompt = `
      Create SEO-optimized ${contentType} content about "${topic}" targeting these keywords: ${keywords.join(', ')}.
      
      Target word count: approximately ${targetWordCount} words.
      
      Format your response as JSON with:
      - title: SEO-optimized title with primary keyword
      - metaDescription: Compelling meta description under 160 characters
      - content: Full HTML content with semantic structure (h2, h3, p, ul, etc)
      - keywordDensity: Object showing usage count for each keyword
      - readabilityScore: Numerical score (0-100) estimating content readability
      - suggestedImprovements: Array of ways to further improve the content
      - internalLinkSuggestions: Related topics for internal linking
      
      Focus on:
      - Natural keyword usage with optimal density (2-3% for primary keyword)
      - Proper heading hierarchy with keywords in H2/H3 headings
      - Short paragraphs (3-4 sentences) for readability
      - Engaging introduction with keyword in first 100 characters
      - Comprehensive coverage of the topic for long-tail SEO
      - Include lists, FAQ sections, and relevant statistics if applicable
      - Answer common search intent questions related to the topic
    `;
    
    const result = await generateWithAI(prompt, aiProvider as any);
    
    try {
      // Parse the JSON response
      const parsedData = JSON.parse(result);
      
      // Ensure all required fields exist
      if (!parsedData.title || !parsedData.metaDescription || !parsedData.content) {
        throw new Error('Generated content missing required fields');
      }
      
      return parsedData;
    } catch (e) {
      // If JSON parsing fails, create a structured response with the raw text
      return {
        title: `${topic} - Comprehensive Guide`,
        metaDescription: `Learn everything about ${topic} including ${keywords[0] || 'key insights'}.`,
        content: result,
        keywordDensity: keywords.reduce((acc: Record<string, number>, keyword) => {
          acc[keyword] = 0; // Default density
          return acc;
        }, {}),
        readabilityScore: 70,
        suggestedImprovements: ['Improve keyword usage', 'Add more headings', 'Include more specific examples'],
        internalLinkSuggestions: keywords.map(k => `Guide to ${k}`)
      };
    }
  },
  
  // Generate multi-platform content
  generateMultiPlatformContent: async (params: { topic: string, platforms: SocialPlatform[], audience?: string, goals?: string[] }, aiProvider: string) => {
    const { topic, platforms, audience, goals } = params;
    
    const platformsList = platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(', ');
    const goalsList = goals ? goals.join(', ') : 'Brand awareness, engagement, traffic';
    const targetAudience = audience || 'General audience interested in this topic';
    
    const prompt = `Create a comprehensive multi-platform content strategy for:

Topic: ${topic}
Platforms: ${platformsList}
Target audience: ${targetAudience}
Content goals: ${goalsList}

For each platform, provide:
1. Content strategy with post ideas
2. Best posting times and frequency
3. Platform-specific creative recommendations
4. Hashtag and keyword strategy
5. Engagement tactics

Also include overall strategy recommendations, timeline, and metrics to track.`;

    const result = await generateWithAI(prompt, aiProvider as any);
    
    // Process the content strategy for each platform
    const platformStrategies: Record<SocialPlatform, any> = {} as Record<SocialPlatform, any>;
    
    platforms.forEach(platform => {
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
      const platformRegex = new RegExp(`${platformName}[^\\n]*\\n([\\s\\S]*?)(?=\\n\\n|${platformName === 'Youtube' ? 'YouTube' : platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('|')}|$)`, 'i');
      const platformSection = result.match(platformRegex);
      
      if (platformSection) {
        const section = platformSection[1];
        
        // Extract post ideas (look for numbered items)
        const postIdeasMatch = section.match(/post ideas:?\s*([^]*?)(?=posting time|strategy|hashtag|engagement|$)/i);
        let postIdeas: string[] = [];
        
        if (postIdeasMatch) {
          const ideasText = postIdeasMatch[1];
          const ideas = ideasText.match(/[0-9]+\.\s*([^\n]+)/g);
          if (ideas && ideas.length) {
            postIdeas = ideas.map(idea => idea.replace(/^[0-9]+\.\s*/, '').trim());
          }
        }
        
        // Extract posting recommendations
        const postingMatch = section.match(/posting time:?\s*([^]*?)(?=post ideas|strategy|hashtag|engagement|$)/i);
        const postingRec = postingMatch ? postingMatch[1].trim() : 'Best times: Weekdays 10AM-2PM';
        
        // Extract hashtags
        const hashtagMatch = section.match(/hashtag:?\s*([^]*?)(?=post ideas|posting time|strategy|engagement|$)/i);
        let hashtags: string[] = [];
        
        if (hashtagMatch) {
          const hashtagText = hashtagMatch[1];
          const tags = hashtagText.match(/#[a-zA-Z0-9]+|[a-zA-Z0-9]+/g);
          if (tags && tags.length) {
            hashtags = tags.map(tag => tag.startsWith('#') ? tag.substring(1) : tag);
          }
        }
        
        platformStrategies[platform] = {
          postIdeas: postIdeas.length > 0 ? postIdeas : [`Share ${topic} updates`, 'Behind-the-scenes content', 'Audience engagement posts'],
          postingSchedule: postingRec,
          hashtags: hashtags.length > 0 ? hashtags : [topic.replace(/\s+/g, ''), 'content', 'marketing'],
          contentTypes: platform === SocialPlatform.INSTAGRAM ? ['Carousel', 'Reels', 'Stories'] :
                        platform === SocialPlatform.YOUTUBE ? ['Tutorial', 'Review', 'Behind-the-scenes'] :
                        ['Text posts', 'Images', 'Links']
        };
      } else {
        // Default platform strategy if not found in AI response
        platformStrategies[platform] = {
          postIdeas: [`Share ${topic} updates`, 'Behind-the-scenes content', 'Audience engagement posts'],
          postingSchedule: 'Best times: Weekdays 10AM-2PM',
          hashtags: [topic.replace(/\s+/g, ''), 'content', 'marketing'],
          contentTypes: ['Text posts', 'Images', 'Links']
        };
      }
    });
    
    return {
      topic,
      platforms: platformStrategies,
      overallStrategy: {
        timeline: '4-week campaign',
        keyMetrics: ['Engagement rate', 'Click-through rate', 'Conversion rate', 'Reach'],
        recommendedBudget: 'Variable based on platform ad costs',
        successDefinition: 'Increased engagement and brand awareness'
      },
      audienceInsights: {
        demographics: 'Based on your target audience',
        interests: ['Industry news', 'Problem solutions', 'Educational content'],
        painPoints: ['Time constraints', 'Information overload', 'Decision paralysis']
      }
    };
  }
};

// Get user's AI provider based on subscription tier
async function getUserAIProvider(userId: string): Promise<string> {
  try {
    // Check user's subscription
    const subscriptionsRef = collection(firestore, 'subscriptions');
    const subscriptionsQuery = query(subscriptionsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    let tier = 'creator'; // Default tier
    
    if (!subscriptionsSnapshot.empty) {
      const subscription = subscriptionsSnapshot.docs[0].data();
      tier = subscription.tier || 'creator';
    }
    
    // Set AI provider based on subscription tier
    switch (tier) {
      case 'enterprise':
        return 'anthropic'; // Use Claude for enterprise tier
      case 'influencer':
        return 'google'; // Use Gemini for influencer tier
      default:
        return 'openai'; // Use OpenAI for other tiers
    }
  } catch (error) {
    console.error('Error determining AI provider:', error);
    return 'openai'; // Default to OpenAI on error
  }
}

// Check token usage and update
async function checkAndUpdateTokenUsage(userId: string, operation: ToolkitOperation): Promise<{ allowed: boolean, reason?: string }> {
  try {
    // Get user's subscription tier
    const subscriptionsRef = collection(firestore, 'subscriptions');
    const subscriptionsQuery = query(subscriptionsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    let tier = 'creator'; // Default tier
    
    if (!subscriptionsSnapshot.empty) {
      const subscription = subscriptionsSnapshot.docs[0].data();
      tier = subscription.tier || 'creator';
    }
    
    // Set token limits based on subscription tier
    let tokenLimit = 100; // Default for creator tier
    
    switch (tier) {
      case 'enterprise':
        tokenLimit = 5000; // 5000 tokens for Enterprise
        break;
      case 'influencer':
        tokenLimit = 500; // 500 tokens for Influencer
        break;
      case 'creator':
        tokenLimit = 100; // 100 tokens for Creator
        break;
    }
    
    // Get current token usage
    const usageRef = doc(firestore, 'aiUsage', userId);
    const usageSnapshot = await getDoc(usageRef);
    
    const usageData = usageSnapshot.exists() ? usageSnapshot.data() : { tools: {} };
    const toolsUsage = usageData.tools || {};
    
    // Calculate total usage
    const totalUsed = Object.values(toolsUsage).reduce((sum: number, count) => sum + (count as number), 0);
    
    // Get token cost for this operation
    const tokenCost = operationTokenCosts[operation] || 1;
    
    // Check if this would exceed the user's limit
    if (totalUsed + tokenCost > tokenLimit) {
      return {
        allowed: false,
        reason: `AI usage limit exceeded. You have used ${totalUsed}/${tokenLimit} tokens.`
      };
    }
    
    // Update usage statistics
    const taskType = operationToTaskType[operation];
    toolsUsage[taskType] = (toolsUsage[taskType] || 0) + tokenCost;
    
    await setDoc(usageRef, {
      userId,
      tools: toolsUsage,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Log the usage
    const historyRef = collection(firestore, 'aiUsageHistory');
    await addDoc(historyRef, {
      userId,
      operation,
      tokenCost,
      timestamp: serverTimestamp()
    });
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking token usage:', error);
    return { allowed: true }; // Default to allowed on error
  }
}

/**
 * Create basic repurposed content as a fallback
 */
function createBasicRepurposedContent(content: string, platform: string): string {
  const platformLower = platform.toLowerCase();
  
  // Platform-specific basic adaptations
  if (platformLower.includes('twitter')) {
    // Twitter: Truncate to 280 characters
    return content.length > 280 
      ? content.substring(0, 277) + '...'
      : content;
  } else if (platformLower.includes('instagram')) {
    // Instagram: Add some emojis and make more casual
    const emojis = ['✨', '📸', '🔥', '💯', '👉', '🙌'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    return `${randomEmoji} ${content}`;
  } else if (platformLower.includes('linkedin')) {
    // LinkedIn: Make more professional
    return `Professional insight: ${content}`;
  } else if (platformLower.includes('facebook')) {
    // Facebook: Add a question to encourage engagement
    return `${content}\n\nWhat do you think about this?`;
  } else if (platformLower.includes('tiktok')) {
    // TikTok: Make brief and catchy
    const firstSentence = content.split('.')[0];
    return firstSentence.length > 150
      ? firstSentence.substring(0, 147) + '...'
      : firstSentence;
  } else {
    return content;
  }
}

/**
 * Create a fallback campaign when AI generation fails
 */
function createFallbackCampaign(
  campaign: {
    name: string;
    description: string;
    keyMessages: string[];
    targetAudience: string[];
    goals: string[];
    toneOfVoice: string;
    keywords: string[];
  },
  platforms: string[],
  contentCount: number
): any {
  const contentPieces = [];
  const campaignHashtag = campaign.name.replace(/\s+/g, '') + "Campaign";
  
  // Create basic content pieces based on key messages
  for (let i = 0; i < contentCount; i++) {
    const messageIndex = i % campaign.keyMessages.length;
    const keyMessage = campaign.keyMessages[messageIndex];
    
    const platformContent: Record<string, any> = {};
    for (const platform of platforms) {
      platformContent[platform] = {
        content: `${keyMessage} ${i === 0 ? `Learn more about ${campaign.name}!` : ''}`,
        hashtags: [
          campaignHashtag,
          ...campaign.keywords.slice(0, 3).map(k => k.replace(/\s+/g, ''))
        ]
      };
    }
    
    contentPieces.push({
      title: `Content Piece ${i + 1}: ${keyMessage}`,
      platforms: platformContent,
      suggestedScheduleTime: `Day ${i + 1}`,
      mediaRecommendation: `Image or video related to ${keyMessage}`
    });
  }
  
  return {
    campaignName: campaign.name,
    campaignHashtag,
    campaignSummary: campaign.description,
    contentPieces,
    recommendedSchedule: {
      startDate: 'As soon as possible',
      frequency: 'Post every 2-3 days',
      order: contentPieces.map((_, i) => `Day ${i + 1}: Content Piece ${i + 1}`)
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // The user ID is the email in our system
    const userId = session.user.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }
    
    // Get request data
    const requestData = await request.json();
    const { operation, params } = requestData;
    
    // Validate operation
    if (!operation || !operationHandlers[operation as ToolkitOperation]) {
      return NextResponse.json(
        { error: 'Invalid operation' },
        { status: 400 }
      );
    }
    
    // Check token usage
    const tokenCheck = await checkAndUpdateTokenUsage(userId, operation as ToolkitOperation);
    
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'AI usage limit exceeded', 
          message: tokenCheck.reason,
          upgradeUrl: '/dashboard/settings/billing'
        },
        { status: 403 }
      );
    }
    
    // Get the AI provider for this user
    const aiProvider = await getUserAIProvider(userId);
    
    // Call the appropriate handler
    const handler = operationHandlers[operation as ToolkitOperation];
    const result = await handler(params, aiProvider);
    
    // Return the result
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error in toolkit API:', error);
    
    return NextResponse.json(
      { error: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`},
      { status: 500 }
    );
  }
} 
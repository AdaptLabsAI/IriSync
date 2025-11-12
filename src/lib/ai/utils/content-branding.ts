/**
 * Content Branding Utilities
 * Handles adding #IriSync branding to AI-generated content
 */

export interface BrandedContent {
  content: string;
  hashtags: string[];
  brandingAdded: boolean;
}

export interface ContentAnalysis {
  hasIriSyncHashtag: boolean;
  hashtagCount: number;
  containsHashtags: boolean;
}

/**
 * Analyzes content for existing IriSync branding and hashtag presence
 */
export function analyzeContent(content: string, hashtags?: string[]): ContentAnalysis {
  // Check content text for #IriSync
  const contentHasIriSync = /#IriSync\b/i.test(content);
  
  // Check hashtags array for IriSync
  const hashtagsHaveIriSync = hashtags?.some(tag => 
    tag.toLowerCase() === 'irisync' || 
    tag.toLowerCase() === '#irisync'
  ) || false;
  
  // Get hashtag count from both content and hashtags array
  const contentHashtags = content.match(/#\w+/g) || [];
  const totalHashtags = new Set([
    ...contentHashtags.map(tag => tag.toLowerCase()),
    ...(hashtags || []).map(tag => tag.toLowerCase().replace('#', ''))
  ]);
  
  return {
    hasIriSyncHashtag: contentHasIriSync || hashtagsHaveIriSync,
    hashtagCount: totalHashtags.size,
    containsHashtags: contentHashtags.length > 0 || (hashtags?.length || 0) > 0
  };
}

/**
 * Adds #IriSync branding to AI-generated content
 * Ensures no duplication and maintains content quality
 */
export function addIriSyncBranding(
  content: string, 
  hashtags?: string[], 
  options?: {
    forceAdd?: boolean;
    maxHashtags?: number;
    platform?: string;
  }
): BrandedContent {
  const analysis = analyzeContent(content, hashtags);
  
  // If IriSync is already present and we're not forcing, return as-is
  if (analysis.hasIriSyncHashtag && !options?.forceAdd) {
    return {
      content,
      hashtags: hashtags || [],
      brandingAdded: false
    };
  }
  
  // Clean hashtags array and ensure proper format
  const cleanHashtags = (hashtags || [])
    .map(tag => tag.replace(/^#+/, '')) // Remove # prefix
    .filter(tag => tag.trim().length > 0);
  
  // Add IriSync if not present
  let updatedHashtags = [...cleanHashtags];
  
  if (!analysis.hasIriSyncHashtag) {
    // Check if we're at the hashtag limit
    const maxHashtags = options?.maxHashtags || 30;
    
    if (updatedHashtags.length < maxHashtags) {
      // Add IriSync at the end
      updatedHashtags.push('IriSync');
    } else {
      // Replace the last hashtag with IriSync to stay within limits
      updatedHashtags[updatedHashtags.length - 1] = 'IriSync';
    }
  }
  
  // Remove #IriSync from content if it exists (we'll manage it via hashtags)
  const cleanedContent = content.replace(/#IriSync\b/gi, '').trim();
  
  return {
    content: cleanedContent,
    hashtags: updatedHashtags,
    brandingAdded: !analysis.hasIriSyncHashtag
  };
}

/**
 * Formats hashtags for platform-specific requirements
 */
export function formatHashtagsForPlatform(
  hashtags: string[], 
  platform?: string
): string[] {
  switch (platform?.toLowerCase()) {
    case 'twitter':
    case 'x':
      // Twitter allows hashtags, ensure proper formatting
      return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      
    case 'linkedin':
      // LinkedIn prefers hashtags without # in certain contexts
      return hashtags.map(tag => tag.replace(/^#+/, ''));
      
    case 'instagram':
      // Instagram allows many hashtags
      return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      
    case 'facebook':
      // Facebook allows hashtags but they're less common
      return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      
    default:
      // Default format with # prefix
      return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
  }
}

/**
 * Combines content and hashtags into a final post format
 */
export function combineContentAndHashtags(
  content: string, 
  hashtags: string[], 
  options?: {
    platform?: string;
    separateHashtags?: boolean;
    maxLength?: number;
  }
): { finalContent: string; overflow: boolean } {
  const formattedHashtags = formatHashtagsForPlatform(hashtags, options?.platform);
  
  if (options?.separateHashtags) {
    // Return content and hashtags separately
    return {
      finalContent: content,
      overflow: false
    };
  }
  
  // Combine content with hashtags
  const hashtagString = formattedHashtags.join(' ');
  const combinedContent = content + (hashtagString ? `\n\n${hashtagString}` : '');
  
  // Check for length limits
  const maxLength = options?.maxLength || 5000;
  const overflow = combinedContent.length > maxLength;
  
  if (overflow && options?.maxLength) {
    // Try to fit by reducing hashtags
    const availableSpace = maxLength - content.length - 4; // Account for "\n\n"
    let truncatedHashtags = '';
    
    for (const hashtag of formattedHashtags) {
      const testString = truncatedHashtags + (truncatedHashtags ? ' ' : '') + hashtag;
      if (testString.length <= availableSpace) {
        truncatedHashtags = testString;
      } else {
        break;
      }
    }
    
    return {
      finalContent: content + (truncatedHashtags ? `\n\n${truncatedHashtags}` : ''),
      overflow: true
    };
  }
  
  return {
    finalContent: combinedContent,
    overflow
  };
}

/**
 * Processes AI-generated content to add IriSync branding
 * Main function to be used by AI services
 */
export function processAIGeneratedContent(
  content: string,
  hashtags?: string[],
  options?: {
    platform?: string;
    contentType?: 'post' | 'hashtags' | 'caption';
    maxHashtags?: number;
    maxLength?: number;
  }
): BrandedContent {
  // Add IriSync branding
  const brandedContent = addIriSyncBranding(content, hashtags, {
    maxHashtags: options?.maxHashtags,
    platform: options?.platform
  });
  
  // Log branding activity for analytics
  if (brandedContent.brandingAdded) {
    console.log('🏷️ IriSync branding added to AI-generated content', {
      platform: options?.platform,
      contentType: options?.contentType,
      hashtagCount: brandedContent.hashtags.length
    });
  }
  
  return brandedContent;
} 
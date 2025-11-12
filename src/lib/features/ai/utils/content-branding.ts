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

  // Clean hashtags array and ensure proper format
  const cleanHashtags = (hashtags || [])
    .map(tag => tag.replace(/^#+/, '')) // Remove # prefix
    .filter(tag => tag.trim().length > 0);

  const dedupedHashtags: string[] = [];
  const seenHashtags = new Set<string>();

  for (const tag of cleanHashtags) {
    const normalized = tag.toLowerCase();
    if (seenHashtags.has(normalized)) {
      continue;
    }
    seenHashtags.add(normalized);
    dedupedHashtags.push(tag);
  }

  const maxHashtags = options?.maxHashtags ?? 30;
  let updatedHashtags = dedupedHashtags.slice(0, maxHashtags);

  const hasIriSyncInHashtags = updatedHashtags.some(
    tag => tag.toLowerCase() === 'irisync'
  );

  let brandingAdded = false;

  if (!hasIriSyncInHashtags || options?.forceAdd) {
    const needsAddition = options?.forceAdd || !hasIriSyncInHashtags;

    if (needsAddition) {
      brandingAdded = !hasIriSyncInHashtags;

      if (updatedHashtags.length < maxHashtags) {
        updatedHashtags.push('IriSync');
      } else {
        updatedHashtags[updatedHashtags.length - 1] = 'IriSync';
      }
    }
  }

  // Ensure a single IriSync hashtag when forceAdd is not specified but
  // IriSync already exists.
  if (!options?.forceAdd && hasIriSyncInHashtags) {
    updatedHashtags = updatedHashtags.filter((tag, index, arr) => {
      if (tag.toLowerCase() !== 'irisync') {
        return true;
      }

      return (
        arr.findIndex(existing => existing.toLowerCase() === 'irisync') === index
      );
    });
  }

  const finalHasIriSync = updatedHashtags.some(
    tag => tag.toLowerCase() === 'irisync'
  );

  brandingAdded = brandingAdded || (!analysis.hasIriSyncHashtag && finalHasIriSync);

  // Remove #IriSync from content if it exists (we'll manage it via hashtags)
  const cleanedContent = content
    .replace(/\s*#IriSync\b\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    content: cleanedContent,
    hashtags: updatedHashtags,
    brandingAdded
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
  const contentHashtags = Array.from(
    new Set(
      (content.match(/#(\w+)/g) || []).map(tag => tag.replace(/^#+/, ''))
    )
  );

  const combinedHashtags = [
    ...(hashtags || []),
    ...contentHashtags
  ];

  // Add IriSync branding
  const brandedContent = addIriSyncBranding(content, combinedHashtags, {
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
import { PlatformPost } from '../models/content';
import { PlatformType } from '../PlatformProvider';

/**
 * Format hashtags for a specific platform
 */
export function formatHashtags(hashtags: string[], platformType: PlatformType): string {
  // Remove # if included by user
  const cleanedHashtags = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
  
  // Format differently based on platform
  switch (platformType) {
    case PlatformType.LINKEDIN:
      // LinkedIn only allows hashtags inline with content
      return cleanedHashtags.join(' ');
      
    case PlatformType.TWITTER:
      // Twitter likes hashtags at the end, keep it concise
      return cleanedHashtags.slice(0, 5).join(' ');
      
    case PlatformType.INSTAGRAM:
      // Instagram allows many hashtags, some users prefer in a comment
      return cleanedHashtags.join(' ');
      
    case PlatformType.FACEBOOK:
      // Facebook supports hashtags but they're less common
      return cleanedHashtags.slice(0, 3).join(' ');
      
    default:
      return cleanedHashtags.join(' ');
  }
}

/**
 * Format mentions for a specific platform
 */
export function formatMentions(mentions: string[], platformType: PlatformType): string {
  // Clean up mentions
  const cleanedMentions = mentions.map(mention => {
    // Remove @ if included by user
    const username = mention.startsWith('@') ? mention.substring(1) : mention;
    
    // Format based on platform
    switch (platformType) {
      case PlatformType.TWITTER:
      case PlatformType.INSTAGRAM:
      case PlatformType.THREADS:
        return `@${username}`;
        
      case PlatformType.FACEBOOK:
        return `@${username}`;
        
      case PlatformType.LINKEDIN:
        // LinkedIn has a different mention format in API
        return `@[${username}]`;
        
      default:
        return `@${username}`;
    }
  });
  
  return cleanedMentions.join(' ');
}

/**
 * Enforce character limits for platform
 */
export function enforceCharacterLimit(text: string, platformType: PlatformType): string {
  // Define limits for each platform
  const limits: Record<PlatformType, number> = {
    [PlatformType.TWITTER]: 280,
    [PlatformType.LINKEDIN]: 3000,
    [PlatformType.FACEBOOK]: 63206,
    [PlatformType.INSTAGRAM]: 2200,
    [PlatformType.THREADS]: 500,
    [PlatformType.YOUTUBE]: 5000,
    [PlatformType.REDDIT]: 40000,
    [PlatformType.TIKTOK]: 2200,
    [PlatformType.MASTODON]: 500
  };
  
  const limit = limits[platformType] || 2000;
  
  // Truncate if needed
  if (text.length <= limit) {
    return text;
  }
  
  // For longer content, try to find a sensible cutoff point
  const truncated = text.substring(0, limit - 3);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  
  // Find the last sentence end
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  // If we found a sensible breakpoint in the last 20% of the text
  if (lastSentenceEnd > limit * 0.8) {
    return text.substring(0, lastSentenceEnd + 1) + '...';
  }
  
  // Otherwise just truncate
  return truncated + '...';
}

/**
 * Format links for various platforms
 */
export function formatLinks(links: string[], platformType: PlatformType): string {
  // Some platforms have special link handling
  switch (platformType) {
    case PlatformType.TWITTER:
      // Twitter automatically shortens links
      return links.join(' ');
      
    case PlatformType.LINKEDIN:
      // LinkedIn sometimes needs the full URL
      return links.map(link => {
        if (!link.startsWith('http')) {
          return `https://${link}`;
        }
        return link;
      }).join(' ');
      
    default:
      return links.join(' ');
  }
}

/**
 * Format a post for a specific platform
 */
export function formatPostForPlatform(post: PlatformPost): PlatformPost {
  const { platformType, content, hashtags, mentions, links } = post;
  
  // Create a copy of the post to modify
  const formattedPost: PlatformPost = { ...post };
  
  // Format specific content components
  const formattedHashtags = hashtags && hashtags.length > 0 ? formatHashtags(hashtags, platformType) : '';
  const formattedMentions = mentions && mentions.length > 0 ? formatMentions(mentions, platformType) : '';
  const formattedLinks = links && links.length > 0 ? formatLinks(links, platformType) : '';
  
  // Combine content based on platform conventions
  let formattedContent = content;
  
  switch (platformType) {
    case PlatformType.TWITTER:
      // Typically links and hashtags at the end
      formattedContent = `${content}\n\n${formattedLinks} ${formattedHashtags}`.trim();
      break;
      
    case PlatformType.INSTAGRAM:
      // Instagram often has hashtags in a block at the end
      formattedContent = `${content}\n\n${formattedHashtags}`.trim();
      break;
      
    case PlatformType.LINKEDIN:
      // LinkedIn has hashtags integrated into the text
      formattedContent = `${content}\n\n${formattedHashtags}`.trim();
      break;
      
    case PlatformType.FACEBOOK:
      // Facebook with minimal hashtags
      formattedContent = `${content}\n\n${formattedLinks}`.trim();
      if (hashtags && hashtags.length > 0) {
        formattedContent += `\n${formattedHashtags}`;
      }
      break;
      
    default:
      // Default approach
      formattedContent = [content, formattedLinks, formattedHashtags].filter(Boolean).join('\n\n');
  }
  
  // Apply character limits
  formattedPost.content = enforceCharacterLimit(formattedContent, platformType);
  
  return formattedPost;
}

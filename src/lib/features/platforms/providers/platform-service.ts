import { logger } from '../../logging/logger';
import { firestore } from '../../core/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Service for platform-specific functionality and data
 */
export class PlatformService {
  /**
   * Get engagement data for a platform and content type
   * @param platform Platform name
   * @param contentType Content type 
   * @returns Engagement data
   */
  async getEngagementData(platform: string, contentType: string): Promise<any> {
    try {
      logger.debug('Getting engagement data', { platform, contentType });
      
      // Try to get from the database first
      const engagementRef = collection(firestore, 'platformEngagementData');
      const q = query(
        engagementRef, 
        where('platform', '==', platform),
        where('contentType', '==', contentType)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Use data from database
        const data = querySnapshot.docs[0].data();
        logger.debug('Found engagement data in database', { 
          platform, 
          contentType, 
          dataId: querySnapshot.docs[0].id 
        });
        return data;
      }
      
      // Fall back to default data patterns if not in database
      return this.getDefaultEngagementData(platform, contentType);
    } catch (error) {
      logger.error('Error getting engagement data', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        contentType
      });
      
      // Fall back to defaults on error
      return this.getDefaultEngagementData(platform, contentType);
    }
  }
  
  /**
   * Get platform settings
   * @param platform Platform name
   * @returns Platform settings
   */
  async getPlatformSettings(platform: string): Promise<any> {
    try {
      const platformRef = doc(firestore, 'platformSettings', platform);
      const docSnap = await getDoc(platformRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      // Return default settings if not found
      return this.getDefaultPlatformSettings(platform);
    } catch (error) {
      logger.error('Error getting platform settings', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      
      // Fall back to defaults on error
      return this.getDefaultPlatformSettings(platform);
    }
  }
  
  /**
   * Get best posting times for a platform
   * @param platform Platform name
   * @returns Best posting times
   */
  async getBestPostingTimes(platform: string): Promise<Record<string, string[]>> {
    try {
      const settings = await this.getPlatformSettings(platform);
      
      if (settings.bestPostingTimes) {
        return settings.bestPostingTimes;
      }
      
      return this.getDefaultBestPostingTimes(platform);
    } catch (error) {
      logger.error('Error getting best posting times', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      
      return this.getDefaultBestPostingTimes(platform);
    }
  }
  
  /**
   * Get platform-specific posting guidelines
   * @param platform Platform name
   * @returns Posting guidelines
   */
  async getPlatformGuidelines(platform: string): Promise<any> {
    try {
      const settings = await this.getPlatformSettings(platform);
      
      if (settings.guidelines) {
        return settings.guidelines;
      }
      
      return this.getDefaultPlatformGuidelines(platform);
    } catch (error) {
      logger.error('Error getting platform guidelines', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      
      return this.getDefaultPlatformGuidelines(platform);
    }
  }
  
  /**
   * Get default engagement data for a platform and content type
   * @param platform Platform name
   * @param contentType Content type
   * @returns Default engagement data
   */
  private getDefaultEngagementData(platform: string, contentType: string): any {
    // Create default engagement data based on platform
    const baseData: Record<string, any> = {
      dayOfWeek: {
        'Monday': 0.7,
        'Tuesday': 0.8,
        'Wednesday': 0.85,
        'Thursday': 0.9,
        'Friday': 0.8,
        'Saturday': 0.65,
        'Sunday': 0.6
      },
      hourOfDay: {
        '07:00': 0.6,
        '08:00': 0.7,
        '09:00': 0.75,
        '10:00': 0.8,
        '11:00': 0.85,
        '12:00': 0.9,
        '13:00': 0.85,
        '14:00': 0.8,
        '15:00': 0.75,
        '16:00': 0.8,
        '17:00': 0.85,
        '18:00': 0.9,
        '19:00': 0.95,
        '20:00': 0.9,
        '21:00': 0.85,
        '22:00': 0.7,
        '23:00': 0.5
      }
    };
    
    // Customize based on platform
    switch (platform.toLowerCase()) {
      case 'instagram':
        baseData.dayOfWeek.Wednesday = 0.9;
        baseData.dayOfWeek.Thursday = 0.95;
        baseData.hourOfDay = {
          ...baseData.hourOfDay,
          '11:00': 0.9,
          '12:00': 0.95,
          '19:00': 1.0,
          '20:00': 0.95
        };
        break;
        
      case 'linkedin':
        baseData.dayOfWeek.Tuesday = 0.95;
        baseData.dayOfWeek.Wednesday = 0.9;
        baseData.dayOfWeek.Thursday = 0.85;
        baseData.dayOfWeek.Saturday = 0.4;
        baseData.dayOfWeek.Sunday = 0.45;
        baseData.hourOfDay = {
          ...baseData.hourOfDay,
          '08:00': 0.8,
          '09:00': 0.9,
          '10:00': 0.95,
          '11:00': 0.9,
          '12:00': 0.85,
          '17:00': 0.9,
          '18:00': 0.8
        };
        break;
        
      case 'facebook':
        baseData.dayOfWeek.Wednesday = 0.9;
        baseData.dayOfWeek.Friday = 0.9;
        baseData.hourOfDay = {
          ...baseData.hourOfDay,
          '13:00': 0.9,
          '14:00': 0.85,
          '15:00': 0.8,
          '19:00': 1.0,
          '20:00': 0.95
        };
        break;
        
      case 'twitter':
      case 'x':
        baseData.dayOfWeek.Wednesday = 0.9;
        baseData.dayOfWeek.Friday = 0.9;
        baseData.hourOfDay = {
          ...baseData.hourOfDay,
          '08:00': 0.85,
          '09:00': 0.9,
          '12:00': 0.95,
          '15:00': 0.9,
          '17:00': 0.85,
          '18:00': 0.9
        };
        break;
        
      case 'tiktok':
        baseData.dayOfWeek.Wednesday = 0.8;
        baseData.dayOfWeek.Friday = 0.95;
        baseData.dayOfWeek.Saturday = 0.9;
        baseData.hourOfDay = {
          ...baseData.hourOfDay,
          '09:00': 0.7,
          '12:00': 0.8,
          '15:00': 0.9,
          '19:00': 1.0,
          '20:00': 0.95,
          '21:00': 0.9
        };
        break;
        
      default:
        // Use base data for other platforms
        break;
    }
    
    // Adjust based on content type if needed
    if (contentType === 'video') {
      // Videos often perform better in evening hours
      Object.keys(baseData.hourOfDay).forEach(hour => {
        const hourNum = parseInt(hour.split(':')[0], 10);
        if (hourNum >= 18 && hourNum <= 21) {
          baseData.hourOfDay[hour] *= 1.1; // 10% boost
          // Cap at 1.0
          if (baseData.hourOfDay[hour] > 1.0) {
            baseData.hourOfDay[hour] = 1.0;
          }
        }
      });
    }
    
    return baseData;
  }
  
  /**
   * Get default platform settings
   * @param platform Platform name
   * @returns Default platform settings
   */
  private getDefaultPlatformSettings(platform: string): any {
    const settings: Record<string, any> = {
      name: platform,
      postFrequency: {
        minimum: 3,
        optimal: 5,
        maximum: 7
      },
      characterLimits: {},
      mediaSupport: {},
      postTypes: []
    };
    
    // Customize based on platform
    switch (platform.toLowerCase()) {
      case 'instagram':
        settings.postFrequency = { minimum: 3, optimal: 5, maximum: 7 };
        settings.characterLimits = { caption: 2200, comment: 500 };
        settings.mediaSupport = { image: true, video: true, carousel: true };
        settings.postTypes = ['feed', 'story', 'reel', 'igtv'];
        break;
        
      case 'linkedin':
        settings.postFrequency = { minimum: 2, optimal: 4, maximum: 5 };
        settings.characterLimits = { post: 3000, comment: 1000 };
        settings.mediaSupport = { image: true, video: true, document: true };
        settings.postTypes = ['update', 'article', 'poll', 'document'];
        break;
        
      case 'facebook':
        settings.postFrequency = { minimum: 1, optimal: 3, maximum: 5 };
        settings.characterLimits = { post: 63206, comment: 8000 };
        settings.mediaSupport = { image: true, video: true, carousel: true, link: true };
        settings.postTypes = ['status', 'photo', 'video', 'link', 'event'];
        break;
        
      case 'twitter':
      case 'x':
        settings.postFrequency = { minimum: 1, optimal: 3, maximum: 5 };
        settings.characterLimits = { tweet: 280, reply: 280 };
        settings.mediaSupport = { image: true, video: true, gif: true, link: true };
        settings.postTypes = ['tweet', 'reply', 'quote', 'thread', 'poll'];
        break;
        
      case 'tiktok':
        settings.postFrequency = { minimum: 1, optimal: 2, maximum: 3 };
        settings.characterLimits = { caption: 2200, comment: 500 };
        settings.mediaSupport = { video: true };
        settings.postTypes = ['video', 'duet', 'stitch', 'reply'];
        break;
        
      // Add other platforms as needed
        
      default:
        // Use general settings for unknown platforms
        settings.postFrequency = { minimum: 2, optimal: 4, maximum: 7 };
        settings.characterLimits = { post: 1000, comment: 500 };
        settings.mediaSupport = { image: true, video: true, link: true };
        settings.postTypes = ['post', 'story', 'comment'];
        break;
    }
    
    return settings;
  }
  
  /**
   * Get default best posting times for a platform
   * @param platform Platform name
   * @returns Best posting times by day
   */
  private getDefaultBestPostingTimes(platform: string): Record<string, string[]> {
    // Default best posting times for each platform
    const times: Record<string, Record<string, string[]>> = {
      instagram: {
        Monday: ['11:00', '13:00', '19:00'],
        Tuesday: ['11:00', '13:00', '19:00'],
        Wednesday: ['11:00', '13:00', '19:00'],
        Thursday: ['11:00', '13:00', '19:00'],
        Friday: ['11:00', '13:00', '19:00'],
        Saturday: ['11:00', '19:00'],
        Sunday: ['11:00', '19:00']
      },
      linkedin: {
        Monday: ['09:00', '11:00', '17:00'],
        Tuesday: ['09:00', '11:00', '17:00'],
        Wednesday: ['09:00', '11:00', '17:00'],
        Thursday: ['09:00', '11:00', '17:00'],
        Friday: ['09:00', '11:00'],
        Saturday: [],
        Sunday: []
      },
      facebook: {
        Monday: ['10:00', '15:00', '19:00'],
        Tuesday: ['10:00', '15:00', '19:00'],
        Wednesday: ['10:00', '15:00', '19:00'],
        Thursday: ['10:00', '15:00', '19:00'],
        Friday: ['10:00', '15:00', '19:00'],
        Saturday: ['12:00', '19:00'],
        Sunday: ['12:00', '19:00']
      },
      twitter: {
        Monday: ['08:00', '12:00', '17:00'],
        Tuesday: ['08:00', '12:00', '17:00'],
        Wednesday: ['08:00', '12:00', '17:00'],
        Thursday: ['08:00', '12:00', '17:00'],
        Friday: ['08:00', '12:00', '15:00'],
        Saturday: ['09:00', '15:00'],
        Sunday: ['09:00', '15:00']
      },
      tiktok: {
        Monday: ['12:00', '19:00', '21:00'],
        Tuesday: ['12:00', '19:00', '21:00'],
        Wednesday: ['12:00', '19:00', '21:00'],
        Thursday: ['12:00', '19:00', '21:00'],
        Friday: ['12:00', '19:00', '21:00'],
        Saturday: ['11:00', '19:00', '21:00'],
        Sunday: ['11:00', '19:00', '21:00']
      }
    };
    
    const platformKey = platform.toLowerCase();
    
    // If the platform exists in our defaults, return those times
    if (times[platformKey]) {
      return times[platformKey];
    }
    
    // For X (Twitter)
    if (platformKey === 'x') {
      return times.twitter;
    }
    
    // Default times for any other platform
    return {
      Monday: ['09:00', '12:00', '15:00', '18:00'],
      Tuesday: ['09:00', '12:00', '15:00', '18:00'],
      Wednesday: ['09:00', '12:00', '15:00', '18:00'],
      Thursday: ['09:00', '12:00', '15:00', '18:00'],
      Friday: ['09:00', '12:00', '15:00', '18:00'],
      Saturday: ['12:00', '18:00'],
      Sunday: ['12:00', '18:00']
    };
  }
  
  /**
   * Get default platform posting guidelines
   * @param platform Platform name
   * @returns Platform guidelines
   */
  private getDefaultPlatformGuidelines(platform: string): any {
    const baseGuidelines = {
      recommended: {
        postFrequency: '3-5 times per week',
        contentTypes: ['text', 'image', 'link'],
        hashtagCount: '2-5 hashtags',
        characterLimit: '500 characters'
      },
      bestPractices: [
        'Be authentic and conversational',
        'Use high-quality visuals',
        'Keep content concise and focused',
        'Engage with audience comments',
        'Post consistently'
      ],
      avoid: [
        'Excessive self-promotion',
        'Too many hashtags',
        'Poor quality images or videos',
        'Inconsistent posting schedule',
        'Ignoring audience engagement'
      ]
    };
    
    // Customize guidelines based on platform
    switch (platform.toLowerCase()) {
      case 'instagram':
        return {
          recommended: {
            postFrequency: '3-7 times per week',
            contentTypes: ['image', 'carousel', 'video', 'reel'],
            hashtagCount: '5-15 hashtags',
            characterLimit: '2,200 characters'
          },
          bestPractices: [
            'Use high-quality visuals',
            'Create a consistent visual style',
            'Utilize Stories for daily content',
            'Engage with comments promptly',
            'Include a call to action',
            'Use a mix of content formats (feed, stories, reels)',
            'Post when your audience is most active'
          ],
          avoid: [
            'Low-quality images',
            'Too many promotional posts',
            'Inconsistent aesthetic',
            'Buying followers',
            'Using banned hashtags',
            'Posting without captions'
          ]
        };
        
      case 'linkedin':
        return {
          recommended: {
            postFrequency: '2-5 times per week',
            contentTypes: ['text', 'article', 'document', 'image', 'video'],
            hashtagCount: '3-5 relevant hashtags',
            characterLimit: '3,000 characters'
          },
          bestPractices: [
            'Share professional insights and expertise',
            'Use data and statistics to back claims',
            'Create thought leadership content',
            'Engage with industry discussions',
            'Post during business hours',
            'Use professional tone',
            'Include relevant hashtags'
          ],
          avoid: [
            'Personal content unrelated to professional life',
            'Controversial political topics',
            'Hard selling approach',
            'Too casual or unprofessional tone',
            'Posting outside business hours',
            'Excessive self-promotion'
          ]
        };
        
      case 'facebook':
        return {
          recommended: {
            postFrequency: '1-2 times per day',
            contentTypes: ['text', 'image', 'video', 'link', 'poll'],
            hashtagCount: '1-2 hashtags (sparingly)',
            characterLimit: '63,206 characters (much shorter recommended)'
          },
          bestPractices: [
            'Post when your audience is most active',
            'Include engaging visuals',
            'Ask questions to encourage engagement',
            'Create varied content types',
            'Respond to comments',
            'Keep videos short (2-3 minutes)',
            'Use Facebook Stories for time-sensitive content'
          ],
          avoid: [
            'Clickbait headlines',
            'Too many hashtags',
            'Posting too frequently',
            'Sharing unverified information',
            'Excessive promotional content',
            'Text-heavy images',
            'Ignoring comments and messages'
          ]
        };
        
      case 'twitter':
      case 'x':
        return {
          recommended: {
            postFrequency: '3-5 times per day',
            contentTypes: ['text', 'image', 'video', 'poll', 'link'],
            hashtagCount: '1-2 relevant hashtags',
            characterLimit: '280 characters'
          },
          bestPractices: [
            'Be concise and clear',
            'Join relevant conversations',
            'Use hashtags strategically',
            'Include engaging media when possible',
            'Create threads for longer content',
            'Retweet and quote relevant content',
            'Monitor trending topics in your industry'
          ],
          avoid: [
            'Overusing hashtags',
            'Posting too many promotional tweets',
            'Being overly controversial',
            'Using all 280 characters when unnecessary',
            'Automating all content without human touch',
            'Ignoring replies and mentions',
            'Using too many abbreviations'
          ]
        };
        
      case 'tiktok':
        return {
          recommended: {
            postFrequency: '1-3 times per day',
            contentTypes: ['video'],
            hashtagCount: '3-5 relevant hashtags',
            characterLimit: '2,200 characters for captions'
          },
          bestPractices: [
            'Follow trends and participate in challenges',
            'Use popular sounds and music',
            'Keep videos short and engaging (15-60 seconds)',
            'Hook viewers in the first 3 seconds',
            'Add text overlays for accessibility',
            'Be authentic and show personality',
            'Post consistently at peak times',
            'Use trending hashtags strategically'
          ],
          avoid: [
            'Poor lighting or sound quality',
            'Lengthy intros',
            'Obviously commercial content',
            'Ignoring trends and platform culture',
            'Inconsistent posting',
            'Reposting content from other platforms without adaptation',
            'Using copyrighted music inappropriately'
          ]
        };
        
      default:
        // Return base guidelines for unknown platforms
        return baseGuidelines;
    }
  }
} 
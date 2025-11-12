/**
 * Unit tests for IriSync content branding functionality
 */

import {
  analyzeContent,
  addIriSyncBranding,
  processAIGeneratedContent,
  formatHashtagsForPlatform,
  combineContentAndHashtags
} from '@/lib/ai/utils/content-branding';

describe('IriSync Content Branding', () => {
  describe('analyzeContent', () => {
    test('detects existing IriSync hashtag in content', () => {
      const content = 'This is a test post #marketing #IriSync #business';
      const result = analyzeContent(content);
      
      expect(result.hasIriSyncHashtag).toBe(true);
      expect(result.containsHashtags).toBe(true);
      expect(result.hashtagCount).toBeGreaterThan(0);
    });

    test('detects IriSync hashtag in hashtags array', () => {
      const content = 'This is a test post';
      const hashtags = ['marketing', 'IriSync', 'business'];
      const result = analyzeContent(content, hashtags);
      
      expect(result.hasIriSyncHashtag).toBe(true);
      expect(result.containsHashtags).toBe(true);
    });

    test('detects no IriSync when not present', () => {
      const content = 'This is a test post #marketing #business';
      const hashtags = ['social', 'media'];
      const result = analyzeContent(content, hashtags);
      
      expect(result.hasIriSyncHashtag).toBe(false);
      expect(result.containsHashtags).toBe(true);
    });
  });

  describe('addIriSyncBranding', () => {
    test('adds IriSync when not present', () => {
      const content = 'This is a test post';
      const hashtags = ['marketing', 'business'];
      const result = addIriSyncBranding(content, hashtags);
      
      expect(result.brandingAdded).toBe(true);
      expect(result.hashtags).toContain('IriSync');
      expect(result.hashtags).toHaveLength(3); // original 2 + IriSync
    });

    test('does not duplicate IriSync when already present', () => {
      const content = 'This is a test post';
      const hashtags = ['marketing', 'IriSync', 'business'];
      const result = addIriSyncBranding(content, hashtags);
      
      expect(result.brandingAdded).toBe(false);
      expect(result.hashtags.filter(tag => tag.toLowerCase() === 'irisync')).toHaveLength(1);
    });

    test('replaces last hashtag when at maximum limit', () => {
      const content = 'This is a test post';
      const hashtags = ['tag1', 'tag2', 'tag3'];
      const result = addIriSyncBranding(content, hashtags, { maxHashtags: 3 });
      
      expect(result.brandingAdded).toBe(true);
      expect(result.hashtags).toContain('IriSync');
      expect(result.hashtags).toHaveLength(3);
      expect(result.hashtags[2]).toBe('IriSync'); // Last tag replaced
    });

    test('removes #IriSync from content when present', () => {
      const content = 'This is a test post #IriSync and more content';
      const hashtags = ['marketing'];
      const result = addIriSyncBranding(content, hashtags);
      
      expect(result.content).not.toContain('#IriSync');
      expect(result.content).toBe('This is a test post and more content');
      expect(result.hashtags).toContain('IriSync');
    });
  });

  describe('formatHashtagsForPlatform', () => {
    test('formats hashtags for Twitter with # prefix', () => {
      const hashtags = ['marketing', 'IriSync', 'business'];
      const result = formatHashtagsForPlatform(hashtags, 'twitter');
      
      expect(result).toEqual(['#marketing', '#IriSync', '#business']);
    });

    test('formats hashtags for LinkedIn without # prefix', () => {
      const hashtags = ['#marketing', 'IriSync', '#business'];
      const result = formatHashtagsForPlatform(hashtags, 'linkedin');
      
      expect(result).toEqual(['marketing', 'IriSync', 'business']);
    });

    test('formats hashtags for Instagram with # prefix', () => {
      const hashtags = ['marketing', 'IriSync', 'business'];
      const result = formatHashtagsForPlatform(hashtags, 'instagram');
      
      expect(result).toEqual(['#marketing', '#IriSync', '#business']);
    });
  });

  describe('combineContentAndHashtags', () => {
    test('combines content with hashtags', () => {
      const content = 'This is a test post';
      const hashtags = ['marketing', 'IriSync', 'business'];
      const result = combineContentAndHashtags(content, hashtags);
      
      expect(result.finalContent).toContain('This is a test post');
      expect(result.finalContent).toContain('#marketing #IriSync #business');
      expect(result.overflow).toBe(false);
    });

    test('handles content overflow by truncating hashtags', () => {
      const content = 'This is a very long test post that might exceed the limit';
      const hashtags = ['marketing', 'IriSync', 'business', 'social', 'media'];
      const result = combineContentAndHashtags(content, hashtags, { 
        maxLength: content.length + 20 // Very tight limit
      });
      
      expect(result.overflow).toBe(true);
      expect(result.finalContent.length).toBeLessThanOrEqual(content.length + 20);
    });

    test('returns separate content when separateHashtags is true', () => {
      const content = 'This is a test post';
      const hashtags = ['marketing', 'IriSync', 'business'];
      const result = combineContentAndHashtags(content, hashtags, { 
        separateHashtags: true 
      });
      
      expect(result.finalContent).toBe(content);
      expect(result.overflow).toBe(false);
    });
  });

  describe('processAIGeneratedContent', () => {
    test('processes content and adds branding', () => {
      const content = 'This is AI generated content about marketing';
      const hashtags = ['marketing', 'business'];
      const result = processAIGeneratedContent(content, hashtags, {
        platform: 'twitter',
        contentType: 'post'
      });
      
      expect(result.brandingAdded).toBe(true);
      expect(result.hashtags).toContain('IriSync');
      expect(result.content).toBe(content);
    });

    test('handles hashtag-only content generation', () => {
      const content = 'Content for hashtag generation';
      const result = processAIGeneratedContent(content, [], {
        platform: 'instagram',
        contentType: 'hashtags',
        maxHashtags: 10
      });
      
      expect(result.brandingAdded).toBe(true);
      expect(result.hashtags).toContain('IriSync');
    });

    test('respects platform hashtag limits', () => {
      const content = 'Content with many hashtags';
      const hashtags = Array.from({ length: 35 }, (_, i) => `tag${i}`);
      const result = processAIGeneratedContent(content, hashtags, {
        platform: 'instagram', // 30 hashtag limit
        maxHashtags: 30
      });
      
      expect(result.hashtags).toHaveLength(30);
      expect(result.hashtags).toContain('IriSync');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty content', () => {
      const result = processAIGeneratedContent('', []);
      
      expect(result.brandingAdded).toBe(true);
      expect(result.hashtags).toContain('IriSync');
      expect(result.content).toBe('');
    });

    test('handles content with only hashtags', () => {
      const content = '#marketing #business #social';
      const result = processAIGeneratedContent(content, []);
      
      expect(result.brandingAdded).toBe(true);
      expect(result.hashtags).toContain('IriSync');
      expect(result.hashtags).toContain('marketing');
      expect(result.hashtags).toContain('business');
      expect(result.hashtags).toContain('social');
    });

    test('handles case-insensitive IriSync detection', () => {
      const content = 'Test content';
      const hashtags = ['marketing', 'irisync', 'business']; // lowercase
      const result = processAIGeneratedContent(content, hashtags);
      
      expect(result.brandingAdded).toBe(false); // Already present
      expect(result.hashtags.filter(tag => 
        tag.toLowerCase() === 'irisync'
      )).toHaveLength(1);
    });
  });
}); 
import { v4 as uuidv4 } from 'uuid';
import { PlatformType } from './PlatformProvider';

/**
 * Interface for story content
 */
export interface StoryContent {
  id: string;
  type: 'image' | 'video' | 'text' | 'poll' | 'question' | 'quiz' | 'countdown' | 'slider';
  duration: number; // seconds
  background: {
    type: 'color' | 'gradient' | 'image' | 'video';
    value: string | { colors: string[]; direction?: string };
    opacity?: number;
  };
  elements: StoryElement[];
  music?: {
    url: string;
    title: string;
    artist: string;
    startTime: number;
    duration: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Interface for story elements
 */
export interface StoryElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'sticker' | 'gif' | 'poll' | 'question' | 'quiz' | 'countdown' | 'slider' | 'mention' | 'hashtag' | 'location';
  position: {
    x: number; // percentage
    y: number; // percentage
    width: number; // percentage
    height: number; // percentage
    rotation?: number; // degrees
    scale?: number;
  };
  content: any; // Type-specific content
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    opacity?: number;
    shadow?: {
      color: string;
      blur: number;
      offsetX: number;
      offsetY: number;
    };
  };
  animation?: {
    type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'rotate' | 'pulse';
    duration: number;
    delay: number;
    easing: string;
  };
  interactive?: {
    clickable: boolean;
    action?: 'link' | 'swipe_up' | 'call_to_action' | 'poll' | 'question' | 'countdown' | 'location';
    url?: string;
    buttonText?: string;
  };
  visibility?: {
    startTime: number; // seconds
    endTime: number; // seconds
  };
}

/**
 * Interface for story template
 */
export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail: string;
  platforms: PlatformType[];
  content: Omit<StoryContent, 'id'>[];
  customizable: {
    colors: boolean;
    fonts: boolean;
    images: boolean;
    text: boolean;
    music: boolean;
  };
  premium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for story project
 */
export interface StoryProject {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  templateId?: string;
  content: StoryContent[];
  platforms: PlatformType[];
  status: 'draft' | 'ready' | 'published' | 'scheduled';
  scheduledTime?: Date;
  publishedAt?: Date;
  analytics?: {
    views: number;
    interactions: number;
    completionRate: number;
    shares: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for story export options
 */
export interface StoryExportOptions {
  format: 'mp4' | 'gif' | 'images';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: {
    width: number;
    height: number;
  };
  fps?: number; // for video
  compression?: number; // 0-100
  watermark?: {
    enabled: boolean;
    text?: string;
    image?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

/**
 * Interface for AI story generation options
 */
export interface AIStoryGenerationOptions {
  prompt: string;
  style: 'minimal' | 'bold' | 'elegant' | 'playful' | 'professional' | 'artistic';
  colorScheme: 'auto' | 'monochrome' | 'vibrant' | 'pastel' | 'dark' | 'light';
  includeText: boolean;
  includeImages: boolean;
  includeAnimations: boolean;
  duration: number; // total duration in seconds
  platform: PlatformType;
  brandGuidelines?: {
    colors: string[];
    fonts: string[];
    logoUrl?: string;
    tone: string;
  };
}

/**
 * Story Creator Service for creating engaging social media stories
 */
export class StoryCreatorService {
  private readonly STORY_DIMENSIONS = {
    [PlatformType.INSTAGRAM]: { width: 1080, height: 1920 },
    [PlatformType.FACEBOOK]: { width: 1080, height: 1920 },
    [PlatformType.TWITTER]: { width: 1080, height: 1920 },
    [PlatformType.LINKEDIN]: { width: 1080, height: 1920 },
    [PlatformType.TIKTOK]: { width: 1080, height: 1920 },
    [PlatformType.YOUTUBE]: { width: 1080, height: 1920 }
  };

  private readonly DEFAULT_STORY_DURATION = 15; // seconds
  private readonly MAX_STORY_DURATION = 60; // seconds

  /**
   * Create a new story project
   */
  async createStoryProject(
    organizationId: string,
    userId: string,
    name: string,
    templateId?: string
  ): Promise<StoryProject> {
    const projectId = uuidv4();
    const now = new Date();

    let content: StoryContent[] = [];

    // If template is provided, load template content
    if (templateId) {
      const template = await this.getTemplate(templateId);
      if (template) {
        content = template.content.map(templateContent => ({
          ...templateContent,
          id: uuidv4()
        }));
      }
    } else {
      // Create default empty story
      content = [this.createDefaultStoryContent()];
    }

    const project: StoryProject = {
      id: projectId,
      organizationId,
      userId,
      name,
      templateId,
      content,
      platforms: [PlatformType.INSTAGRAM], // Default platform
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    return project;
  }

  /**
   * Update story project
   */
  async updateStoryProject(
    projectId: string,
    updates: Partial<StoryProject>
  ): Promise<StoryProject> {
    // Implementation would update the project in database
    // For now, returning a mock updated project
    return {
      id: projectId,
      organizationId: '',
      userId: '',
      name: '',
      content: [],
      platforms: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...updates
    };
  }

  /**
   * Add content to story
   */
  async addStoryContent(
    projectId: string,
    content: Omit<StoryContent, 'id'>,
    position?: number
  ): Promise<StoryContent> {
    const storyContent: StoryContent = {
      ...content,
      id: uuidv4()
    };

    // Implementation would add content to project
    return storyContent;
  }

  /**
   * Update story content
   */
  async updateStoryContent(
    projectId: string,
    contentId: string,
    updates: Partial<StoryContent>
  ): Promise<StoryContent> {
    // Implementation would update specific content
    return {
      id: contentId,
      type: 'image',
      duration: 15,
      background: { type: 'color', value: '#ffffff' },
      elements: [],
      ...updates
    };
  }

  /**
   * Add element to story content
   */
  async addStoryElement(
    projectId: string,
    contentId: string,
    element: Omit<StoryElement, 'id'>
  ): Promise<StoryElement> {
    const storyElement: StoryElement = {
      ...element,
      id: uuidv4()
    };

    // Implementation would add element to content
    return storyElement;
  }

  /**
   * Update story element
   */
  async updateStoryElement(
    projectId: string,
    contentId: string,
    elementId: string,
    updates: Partial<StoryElement>
  ): Promise<StoryElement> {
    // Implementation would update specific element
    return {
      id: elementId,
      type: 'text',
      position: { x: 0, y: 0, width: 100, height: 100 },
      content: '',
      ...updates
    };
  }

  /**
   * Generate story using AI
   */
  async generateAIStory(
    organizationId: string,
    userId: string,
    options: AIStoryGenerationOptions
  ): Promise<StoryProject> {
    const projectId = uuidv4();
    const now = new Date();

    // AI-generated content based on prompt and options
    const content = await this.generateAIContent(options);

    const project: StoryProject = {
      id: projectId,
      organizationId,
      userId,
      name: `AI Story: ${options.prompt.substring(0, 30)}...`,
      content,
      platforms: [options.platform],
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    return project;
  }

  /**
   * Generate AI content for story
   */
  private async generateAIContent(options: AIStoryGenerationOptions): Promise<StoryContent[]> {
    const content: StoryContent[] = [];
    const slidesCount = Math.ceil(options.duration / this.DEFAULT_STORY_DURATION);

    for (let i = 0; i < slidesCount; i++) {
      const slideContent: StoryContent = {
        id: uuidv4(),
        type: 'image',
        duration: Math.min(this.DEFAULT_STORY_DURATION, options.duration - (i * this.DEFAULT_STORY_DURATION)),
        background: this.generateAIBackground(options),
        elements: await this.generateAIElements(options, i)
      };

      content.push(slideContent);
    }

    return content;
  }

  /**
   * Generate AI background
   */
  private generateAIBackground(options: AIStoryGenerationOptions): StoryContent['background'] {
    const colors = this.getColorSchemeColors(options.colorScheme, options.brandGuidelines?.colors);

    switch (options.style) {
      case 'minimal':
        return { type: 'color', value: colors[0] };
      case 'bold':
        return { 
          type: 'gradient', 
          value: { colors: [colors[0], colors[1]], direction: 'diagonal' }
        };
      case 'elegant':
        return { type: 'color', value: colors[0] };
      case 'playful':
        return { 
          type: 'gradient', 
          value: { colors: colors.slice(0, 3), direction: 'radial' }
        };
      default:
        return { type: 'color', value: colors[0] };
    }
  }

  /**
   * Generate AI elements
   */
  private async generateAIElements(
    options: AIStoryGenerationOptions,
    slideIndex: number
  ): Promise<StoryElement[]> {
    const elements: StoryElement[] = [];

    // Add text element if requested
    if (options.includeText) {
      const textElement: StoryElement = {
        id: uuidv4(),
        type: 'text',
        position: { x: 10, y: 40, width: 80, height: 20 },
        content: await this.generateAIText(options.prompt, slideIndex),
        style: this.getTextStyle(options),
        animation: options.includeAnimations ? this.getRandomAnimation() : undefined
      };
      elements.push(textElement);
    }

    // Add image element if requested
    if (options.includeImages) {
      const imageElement: StoryElement = {
        id: uuidv4(),
        type: 'image',
        position: { x: 20, y: 20, width: 60, height: 60 },
        content: { url: await this.generateAIImage(options.prompt) },
        animation: options.includeAnimations ? this.getRandomAnimation() : undefined
      };
      elements.push(imageElement);
    }

    // Add brand logo if provided
    if (options.brandGuidelines?.logoUrl) {
      const logoElement: StoryElement = {
        id: uuidv4(),
        type: 'image',
        position: { x: 80, y: 5, width: 15, height: 15 },
        content: { url: options.brandGuidelines.logoUrl },
        style: { opacity: 0.8 }
      };
      elements.push(logoElement);
    }

    return elements;
  }

  /**
   * Generate AI text content
   */
  private async generateAIText(prompt: string, slideIndex: number): Promise<string> {
    // This would integrate with an AI service like OpenAI
    // For now, returning placeholder text
    const textVariations = [
      `Discover ${prompt}`,
      `Experience ${prompt}`,
      `Explore ${prompt}`,
      `Learn about ${prompt}`,
      `Get inspired by ${prompt}`
    ];

    return textVariations[slideIndex % textVariations.length];
  }

  /**
   * Generate AI image
   */
  private async generateAIImage(prompt: string): Promise<string> {
    // This would integrate with an AI image generation service
    // For now, returning placeholder
    return `https://via.placeholder.com/800x800?text=${encodeURIComponent(prompt)}`;
  }

  /**
   * Get color scheme colors
   */
  private getColorSchemeColors(colorScheme: string, brandColors?: string[]): string[] {
    if (brandColors && brandColors.length > 0) {
      return brandColors;
    }

    const colorSchemes = {
      monochrome: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
      vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
      pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E1BAFF'],
      dark: ['#1A1A1A', '#2D2D2D', '#404040', '#595959', '#737373', '#8C8C8C'],
      light: ['#FFFFFF', '#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD']
    };

    return colorSchemes[colorScheme as keyof typeof colorSchemes] || colorSchemes.vibrant;
  }

  /**
   * Get text style based on options
   */
  private getTextStyle(options: AIStoryGenerationOptions): StoryElement['style'] {
    const fonts = options.brandGuidelines?.fonts || ['Arial', 'Helvetica', 'Roboto'];
    const colors = this.getColorSchemeColors(options.colorScheme, options.brandGuidelines?.colors);

    const styles = {
      minimal: {
        fontFamily: fonts[0],
        fontSize: 24,
        fontWeight: 'normal',
        color: colors[5] || '#000000'
      },
      bold: {
        fontFamily: fonts[0],
        fontSize: 32,
        fontWeight: 'bold',
        color: colors[0] || '#FFFFFF'
      },
      elegant: {
        fontFamily: fonts[0],
        fontSize: 28,
        fontWeight: '300',
        color: colors[4] || '#333333'
      },
      playful: {
        fontFamily: fonts[0],
        fontSize: 30,
        fontWeight: 'bold',
        color: colors[1] || '#FF6B6B'
      },
      professional: {
        fontFamily: fonts[0],
        fontSize: 26,
        fontWeight: '500',
        color: colors[3] || '#2C3E50'
      },
      artistic: {
        fontFamily: fonts[0],
        fontSize: 34,
        fontWeight: 'bold',
        color: colors[2] || '#8E44AD'
      }
    };

    return styles[options.style] || styles.minimal;
  }

  /**
   * Get random animation
   */
  private getRandomAnimation(): StoryElement['animation'] {
    const animations = [
      { type: 'fade' as const, duration: 0.5, delay: 0, easing: 'ease-in-out' },
      { type: 'slide' as const, duration: 0.8, delay: 0.2, easing: 'ease-out' },
      { type: 'zoom' as const, duration: 0.6, delay: 0.1, easing: 'ease-in-out' },
      { type: 'bounce' as const, duration: 1.0, delay: 0, easing: 'ease-out' },
      { type: 'pulse' as const, duration: 0.4, delay: 0.3, easing: 'ease-in-out' }
    ];

    return animations[Math.floor(Math.random() * animations.length)];
  }

  /**
   * Export story to various formats
   */
  async exportStory(
    project: StoryProject,
    options: StoryExportOptions
  ): Promise<{
    url: string;
    format: string;
    size: number;
    duration?: number;
  }> {
    // Implementation would render the story and export it
    // This is a complex process involving canvas rendering, video encoding, etc.
    
    const platform = project.platforms[0];
    const dimensions = this.STORY_DIMENSIONS[platform as keyof typeof this.STORY_DIMENSIONS] || { width: 1080, height: 1920 };
    
    // Mock export result
    return {
      url: `https://exports.irisync.com/stories/${project.id}.${options.format}`,
      format: options.format,
      size: 1024 * 1024 * 5, // 5MB mock size
      duration: options.format === 'mp4' ? project.content.reduce((sum, c) => sum + c.duration, 0) : undefined
    };
  }

  /**
   * Get available templates
   */
  async getTemplates(
    category?: string,
    platform?: PlatformType,
    premium?: boolean
  ): Promise<StoryTemplate[]> {
    // Mock templates - in production, these would come from a database
    const templates: StoryTemplate[] = [
      {
        id: 'template-1',
        name: 'Modern Minimal',
        description: 'Clean and minimal design perfect for professional content',
        category: 'Business',
        tags: ['minimal', 'professional', 'clean'],
        thumbnail: 'https://templates.irisync.com/thumbnails/modern-minimal.jpg',
        platforms: [PlatformType.INSTAGRAM, PlatformType.FACEBOOK],
        content: [this.createDefaultStoryContent()],
        customizable: {
          colors: true,
          fonts: true,
          images: true,
          text: true,
          music: false
        },
        premium: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'template-2',
        name: 'Bold & Vibrant',
        description: 'Eye-catching design with vibrant colors and animations',
        category: 'Creative',
        tags: ['bold', 'colorful', 'animated'],
        thumbnail: 'https://templates.irisync.com/thumbnails/bold-vibrant.jpg',
        platforms: [PlatformType.INSTAGRAM, PlatformType.TIKTOK],
        content: [this.createDefaultStoryContent()],
        customizable: {
          colors: true,
          fonts: true,
          images: true,
          text: true,
          music: true
        },
        premium: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Filter templates based on criteria
    return templates.filter(template => {
      if (category && template.category !== category) return false;
      if (platform && !template.platforms.includes(platform)) return false;
      if (premium !== undefined && template.premium !== premium) return false;
      return true;
    });
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<StoryTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Create interactive poll element
   */
  createPollElement(
    question: string,
    options: string[],
    position: StoryElement['position']
  ): StoryElement {
    return {
      id: uuidv4(),
      type: 'poll',
      position,
      content: {
        question,
        options,
        votes: options.map(() => 0)
      },
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#FFFFFF',
        borderRadius: 20,
        padding: 20
      },
      interactive: {
        clickable: true,
        action: 'poll'
      }
    };
  }

  /**
   * Create question sticker element
   */
  createQuestionElement(
    placeholder: string,
    position: StoryElement['position']
  ): StoryElement {
    return {
      id: uuidv4(),
      type: 'question',
      position,
      content: {
        placeholder,
        responses: []
      },
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        color: '#000000',
        borderRadius: 25,
        padding: 15
      },
      interactive: {
        clickable: true,
        action: 'question'
      }
    };
  }

  /**
   * Create countdown sticker element
   */
  createCountdownElement(
    title: string,
    endTime: Date,
    position: StoryElement['position']
  ): StoryElement {
    return {
      id: uuidv4(),
      type: 'countdown',
      position,
      content: {
        title,
        endTime: endTime.toISOString(),
        followers: 0
      },
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#FFFFFF',
        borderRadius: 15,
        padding: 20
      },
      interactive: {
        clickable: true,
        action: 'countdown'
      }
    };
  }

  /**
   * Create mention element
   */
  createMentionElement(
    username: string,
    position: StoryElement['position']
  ): StoryElement {
    return {
      id: uuidv4(),
      type: 'mention',
      position,
      content: {
        username,
        displayName: username
      },
      style: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold'
      }
    };
  }

  /**
   * Create hashtag element
   */
  createHashtagElement(
    hashtag: string,
    position: StoryElement['position']
  ): StoryElement {
    return {
      id: uuidv4(),
      type: 'hashtag',
      position,
      content: {
        hashtag: hashtag.startsWith('#') ? hashtag : `#${hashtag}`
      },
      style: {
        color: '#1DA1F2',
        fontSize: 16,
        fontWeight: 'bold'
      }
    };
  }

  /**
   * Create location element
   */
  createLocationElement(
    locationName: string,
    coordinates: { lat: number; lng: number },
    position: StoryElement['position']
  ): StoryElement {
    return {
      id: uuidv4(),
      type: 'location',
      position,
      content: {
        name: locationName,
        coordinates
      },
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#FFFFFF',
        borderRadius: 10,
        padding: 10
      },
      interactive: {
        clickable: true,
        action: 'location'
      }
    };
  }

  /**
   * Create default story content
   */
  private createDefaultStoryContent(): StoryContent {
    return {
      id: uuidv4(),
      type: 'image',
      duration: this.DEFAULT_STORY_DURATION,
      background: {
        type: 'gradient',
        value: { colors: ['#667eea', '#764ba2'], direction: 'diagonal' }
      },
      elements: [
        {
          id: uuidv4(),
          type: 'text',
          position: { x: 10, y: 40, width: 80, height: 20 },
          content: 'Your Story Here',
          style: {
            fontFamily: 'Arial',
            fontSize: 32,
            fontWeight: 'bold',
            color: '#FFFFFF'
          }
        }
      ]
    };
  }

  /**
   * Validate story content for platform
   */
  validateStoryForPlatform(
    content: StoryContent[],
    platform: PlatformType
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check duration limits
    const totalDuration = content.reduce((sum, c) => sum + c.duration, 0);
    if (totalDuration > this.MAX_STORY_DURATION) {
      errors.push(`Total duration (${totalDuration}s) exceeds platform limit (${this.MAX_STORY_DURATION}s)`);
    }

    // Platform-specific validations
    switch (platform) {
      case PlatformType.INSTAGRAM:
        // Instagram-specific validations
        content.forEach((slide, index) => {
          if (slide.duration > 15) {
            warnings.push(`Slide ${index + 1}: Duration over 15s may be split into multiple stories`);
          }
        });
        break;

      case PlatformType.FACEBOOK:
        // Facebook-specific validations
        break;

      case PlatformType.TIKTOK:
        // TikTok doesn't have traditional stories, but has similar short-form content
        if (totalDuration < 15) {
          warnings.push('TikTok content typically performs better with 15+ seconds duration');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create and export singleton instance
const storyCreatorService = new StoryCreatorService();
export default storyCreatorService; 
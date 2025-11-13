import { getFirestore } from '../../../core/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import { increment } from 'firebase/firestore';

/**
 * Post template category
 */
export enum PostTemplateCategory {
  ENGAGEMENT = 'engagement',
  PROMOTION = 'promotion',
  EDUCATIONAL = 'educational',
  ANNOUNCEMENT = 'announcement',
  STORYTELLING = 'storytelling',
  TRENDING = 'trending',
  CUSTOMER_SPOTLIGHT = 'customer_spotlight',
  QUESTION = 'question',
  POLL = 'poll',
  TESTIMONIAL = 'testimonial',
  BEHIND_THE_SCENES = 'behind_the_scenes',
  HOLIDAY = 'holiday',
  PRODUCT_LAUNCH = 'product_launch',
  INDUSTRY_NEWS = 'industry_news',
  CUSTOM = 'custom'
}

/**
 * Post template platform
 */
export enum PostTemplatePlatform {
  ALL = 'all',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads'
}

/**
 * Post template structure
 */
export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  category: PostTemplateCategory;
  platforms: PostTemplatePlatform[];
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
  organizationId?: string;
  userId?: string;
  isDefault: boolean;
  popularity: number;
}

/**
 * Create template parameters
 */
export interface CreateTemplateParams {
  name: string;
  description: string;
  category: PostTemplateCategory;
  platforms: PostTemplatePlatform[];
  content: string;
  variables?: string[];
  isDefault?: boolean;
  organizationId?: string;
  userId?: string;
}

/**
 * Update template parameters
 */
export interface UpdateTemplateParams {
  name?: string;
  description?: string;
  category?: PostTemplateCategory;
  platforms?: PostTemplatePlatform[];
  content?: string;
  variables?: string[];
  isDefault?: boolean;
}

/**
 * Post template service
 */
export class PostTemplateService {
  private templatesCollection = getFirestore().collection('postTemplates');

  /**
   * Create a new post template
   * @param params Template creation parameters
   * @returns The created template
   */
  async createTemplate(params: CreateTemplateParams): Promise<PostTemplate> {
    // Extract variables from the content using {{variable}} pattern
    const extractedVariables = this.extractVariables(params.content);
    const variables = params.variables || extractedVariables;
    
    const template: PostTemplate = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      category: params.category,
      platforms: params.platforms,
      content: params.content,
      variables,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId: params.organizationId,
      userId: params.userId,
      isDefault: params.isDefault || false,
      popularity: 0
    };

    await this.templatesCollection.doc(template.id).set(template);
    return template;
  }

  /**
   * Update an existing template
   * @param templateId The ID of the template to update
   * @param params The update parameters
   * @returns The updated template
   */
  async updateTemplate(templateId: string, params: UpdateTemplateParams): Promise<PostTemplate> {
    const templateDoc = await this.templatesCollection.doc(templateId).get();
    if (!templateDoc.exists) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const currentTemplate = templateDoc.data() as PostTemplate;
    
    // Extract variables if content was updated
    let variables = currentTemplate.variables;
    if (params.content) {
      const extractedVariables = this.extractVariables(params.content);
      variables = params.variables || extractedVariables;
    }

    const updatedTemplate: Partial<PostTemplate> = {
      ...params,
      variables,
      updatedAt: new Date()
    };

    await this.templatesCollection.doc(templateId).update(updatedTemplate);
    
    return {
      ...currentTemplate,
      ...updatedTemplate
    } as PostTemplate;
  }

  /**
   * Delete a template
   * @param templateId The ID of the template to delete
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.templatesCollection.doc(templateId).delete();
  }

  /**
   * Get a template by ID
   * @param templateId The ID of the template
   * @returns The requested template
   */
  async getTemplate(templateId: string): Promise<PostTemplate | null> {
    const templateDoc = await this.templatesCollection.doc(templateId).get();
    if (!templateDoc.exists) {
      return null;
    }
    return templateDoc.data() as PostTemplate;
  }

  /**
   * Search templates with various filters
   * @param options Search options
   * @returns List of matching templates
   */
  async searchTemplates({
    category,
    platform,
    organizationId,
    userId,
    includeDefaults = true,
    limit = 20,
    offset = 0,
    sortBy = 'popularity',
    sortDirection = 'desc'
  }: {
    category?: PostTemplateCategory;
    platform?: PostTemplatePlatform;
    organizationId?: string;
    userId?: string;
    includeDefaults?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'popularity' | 'createdAt' | 'updatedAt' | 'name';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    templates: PostTemplate[];
    total: number;
  }> {
    let query = this.templatesCollection as any;
    
    // Filter by category
    if (category) {
      query = query.where('category', '==', category);
    }
    
    // Filter by platforms (must include the specified platform or be for ALL platforms)
    if (platform) {
      query = query.where('platforms', 'array-contains-any', [platform, PostTemplatePlatform.ALL]);
    }
    
    // Filter by organization or include defaults
    if (organizationId) {
      if (includeDefaults) {
        query = query.where('organizationId', 'in', [organizationId, null]);
      } else {
        query = query.where('organizationId', '==', organizationId);
      }
    } else if (includeDefaults) {
      query = query.where('isDefault', '==', true);
    }
    
    // Filter by user
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    // Count total before applying limit and offset
    const countQuery = await query.count().get();
    const total = countQuery.data().count;
    
    // Apply sorting
    query = query.orderBy(sortBy, sortDirection);
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    // Execute the query
    const querySnapshot = await query.get();
    
    const templates: PostTemplate[] = [];
    querySnapshot.forEach((doc: any) => {
      templates.push(doc.data() as PostTemplate);
    });
    
    return { templates, total };
  }

  /**
   * Track template usage to update popularity
   * @param templateId The ID of the template used
   */
  async trackTemplateUsage(templateId: string): Promise<void> {
    await this.templatesCollection.doc(templateId).update({
      popularity: increment(1)
    });
  }

  /**
   * Generate content from a template by replacing variables
   * @param templateId The ID of the template to use
   * @param variables Key-value pairs for replacement
   * @returns The generated content
   */
  async generateFromTemplate(templateId: string, variables: Record<string, string>): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Track template usage
    await this.trackTemplateUsage(templateId);
    
    // Replace variables in content
    let content = template.content;
    
    for (const key in variables) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, variables[key]);
    }
    
    // Check for any remaining variables
    const remainingVariables = this.extractVariables(content);
    if (remainingVariables.length > 0) {
      throw new Error(`Missing required variables: ${remainingVariables.join(', ')}`);
    }
    
    return content;
  }

  /**
   * Extract variable names from content
   * @param content Template content string
   * @returns Array of variable names
   */
  private extractVariables(content: string): string[] {
    const variableRegex = /{{([^{}]+)}}/g;
    const matches = content.match(variableRegex) || [];
    return matches.map(match => match.slice(2, -2));
  }
  
  /**
   * Seed default templates
   */
  async seedDefaultTemplates(): Promise<void> {
    const defaultTemplates: CreateTemplateParams[] = [
      {
        name: 'Engagement Question',
        description: 'Ask your audience a question to boost engagement',
        category: PostTemplateCategory.QUESTION,
        platforms: [PostTemplatePlatform.ALL],
        content: '{{question}} 🤔\n\nShare your thoughts in the comments below!',
        variables: ['question'],
        isDefault: true
      },
      {
        name: 'Product Launch',
        description: 'Announce a new product or feature',
        category: PostTemplateCategory.PRODUCT_LAUNCH,
        platforms: [PostTemplatePlatform.ALL],
        content: '🚀 EXCITING NEWS! 🚀\n\nIntroducing {{productName}}: {{productDescription}}\n\nLearn more: {{link}}',
        variables: ['productName', 'productDescription', 'link'],
        isDefault: true
      },
      {
        name: 'Testimonial Share',
        description: 'Share a customer testimonial',
        category: PostTemplateCategory.TESTIMONIAL,
        platforms: [PostTemplatePlatform.ALL],
        content: '"{{testimonialText}}"\n\n- {{customerName}}, {{customerTitle}}\n\n#CustomerLove #Testimonial',
        variables: ['testimonialText', 'customerName', 'customerTitle'],
        isDefault: true
      },
      {
        name: 'Educational Tip',
        description: 'Share an educational tip with your audience',
        category: PostTemplateCategory.EDUCATIONAL,
        platforms: [PostTemplatePlatform.ALL],
        content: '💡 TIP: {{tipTitle}} 💡\n\n{{tipContent}}\n\nWant more tips like this? Follow us for more!',
        variables: ['tipTitle', 'tipContent'],
        isDefault: true
      },
      {
        name: 'Promotional Offer',
        description: 'Promote a special offer or discount',
        category: PostTemplateCategory.PROMOTION,
        platforms: [PostTemplatePlatform.ALL],
        content: '🔥 SPECIAL OFFER 🔥\n\n{{offerDescription}}\n\nUse code: {{promoCode}} to get {{discountAmount}} off!\n\nOffer ends: {{endDate}}\n\nShop now: {{link}}',
        variables: ['offerDescription', 'promoCode', 'discountAmount', 'endDate', 'link'],
        isDefault: true
      }
    ];

    for (const template of defaultTemplates) {
      // Check if template already exists by name
      const existingQuery = await this.templatesCollection
        .where('name', '==', template.name)
        .where('isDefault', '==', true)
        .limit(1)
        .get();
      
      if (existingQuery.empty) {
        await this.createTemplate(template);
      }
    }
  }
}

export default new PostTemplateService(); 
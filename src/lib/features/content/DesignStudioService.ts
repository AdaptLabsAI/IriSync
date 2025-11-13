import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { firestore, storage } from '../core/firebase';
import { tieredModelRouter, TaskType } from '../ai/models/tiered-model-router';
import { User } from '../core/models/User';
import { logger } from '../../core/logging/logger';

/**
 * Design Template
 */
export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'social-post' | 'story' | 'banner' | 'logo' | 'infographic' | 'presentation' | 'custom';
  platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest';
  
  // Dimensions
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  
  // Template data
  templateData: {
    elements: DesignElement[];
    backgroundColor: string;
    backgroundImage?: string;
    layers: number;
  };
  
  // Metadata
  tags: string[];
  isPublic: boolean;
  isPremium: boolean;
  usageCount: number;
  rating: number;
  
  organizationId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Design Element
 */
export interface DesignElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'icon' | 'line' | 'background';
  
  // Position and size
  position: {
    x: number;
    y: number;
    z: number; // layer
  };
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  
  // Style properties
  style: {
    opacity: number;
    borderRadius?: number;
    border?: {
      width: number;
      color: string;
      style: 'solid' | 'dashed' | 'dotted';
    };
    shadow?: {
      x: number;
      y: number;
      blur: number;
      color: string;
    };
  };
  
  // Element-specific properties
  properties: TextProperties | ImageProperties | ShapeProperties | IconProperties;
  
  // Animation (for future use)
  animation?: {
    type: 'fade' | 'slide' | 'zoom' | 'rotate';
    duration: number;
    delay: number;
  };
}

/**
 * Text Properties
 */
export interface TextProperties {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  textDecoration: 'none' | 'underline' | 'line-through';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

/**
 * Image Properties
 */
export interface ImageProperties {
  src: string;
  alt: string;
  fit: 'cover' | 'contain' | 'fill' | 'scale-down';
  filter?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    hue: number;
  };
}

/**
 * Shape Properties
 */
export interface ShapeProperties {
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'star';
  fill: string;
  stroke?: {
    color: string;
    width: number;
  };
  gradient?: {
    type: 'linear' | 'radial';
    colors: Array<{ color: string; stop: number }>;
    angle?: number;
  };
}

/**
 * Icon Properties
 */
export interface IconProperties {
  iconName: string;
  iconSet: string;
  color: string;
  strokeWidth?: number;
}

/**
 * Design Project
 */
export interface DesignProject {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  
  // Design data
  designData: {
    elements: DesignElement[];
    backgroundColor: string;
    backgroundImage?: string;
    dimensions: {
      width: number;
      height: number;
    };
  };
  
  // Export settings
  exportSettings: {
    format: 'png' | 'jpg' | 'svg' | 'pdf';
    quality: number;
    dpi: number;
    transparent: boolean;
  };
  
  // Collaboration
  collaborators: Array<{
    userId: string;
    role: 'owner' | 'editor' | 'viewer';
    addedAt: Date;
  }>;
  
  // Version history
  versions: Array<{
    id: string;
    name: string;
    designData: any;
    createdAt: Date;
    createdBy: string;
  }>;
  
  // AI assistance
  aiSuggestions: Array<{
    type: 'color' | 'layout' | 'typography' | 'content';
    suggestion: string;
    confidence: number;
    applied: boolean;
  }>;
  
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

/**
 * Design Asset
 */
export interface DesignAsset {
  id: string;
  name: string;
  type: 'image' | 'icon' | 'font' | 'template' | 'color-palette';
  category: string;
  tags: string[];
  
  // Asset data
  url: string;
  thumbnailUrl?: string;
  metadata: {
    size?: number;
    dimensions?: { width: number; height: number };
    format?: string;
    colors?: string[];
  };
  
  // Usage tracking
  usageCount: number;
  lastUsed?: Date;
  
  // Access control
  isPublic: boolean;
  isPremium: boolean;
  organizationId?: string;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI Design Suggestion
 */
export interface AIDesignSuggestion {
  type: 'color-scheme' | 'layout' | 'typography' | 'content' | 'style';
  title: string;
  description: string;
  confidence: number;
  
  // Suggestion data
  data: {
    colors?: string[];
    fonts?: string[];
    layout?: any;
    content?: string;
    style?: any;
  };
  
  // Preview
  previewUrl?: string;
  
  // Application
  canAutoApply: boolean;
  applicationSteps?: string[];
}

/**
 * Design Studio Service
 * Provides in-app design tools for creating visuals with AI assistance
 */
export class DesignStudioService {
  private static instance: DesignStudioService;
  
  private constructor() {}
  
  public static getInstance(): DesignStudioService {
    if (!DesignStudioService.instance) {
      DesignStudioService.instance = new DesignStudioService();
    }
    return DesignStudioService.instance;
  }
  
  /**
   * Create a new design project
   */
  async createProject(
    projectData: Omit<DesignProject, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'versions' | 'aiSuggestions'>,
    userId: string
  ): Promise<DesignProject> {
    try {
      const projectRef = doc(collection(firestore, 'designProjects'));
      
      const newProject: DesignProject = {
        ...projectData,
        id: projectRef.id,
        versions: [{
          id: 'v1',
          name: 'Initial version',
          designData: projectData.designData,
          createdAt: new Date(),
          createdBy: userId
        }],
        aiSuggestions: [],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date()
      };
      
      await setDoc(projectRef, {
        ...newProject,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp(),
        versions: newProject.versions.map(v => ({
          ...v,
          createdAt: serverTimestamp()
        }))
      });
      
      logger.info('Design project created', {
        projectId: newProject.id,
        organizationId: projectData.organizationId,
        userId
      });
      
      return newProject;
    } catch (error) {
      logger.error('Error creating design project', { error, userId });
      throw error;
    }
  }
  
  /**
   * Get design project
   */
  async getProject(projectId: string, userId: string): Promise<DesignProject | null> {
    try {
      const projectDoc = await getDoc(doc(firestore, 'designProjects', projectId));
      
      if (!projectDoc.exists()) {
        return null;
      }
      
      const data = projectDoc.data();
      const project = {
        ...data,
        id: projectDoc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastAccessedAt: data.lastAccessedAt?.toDate() || new Date(),
        versions: data.versions?.map((v: any) => ({
          ...v,
          createdAt: v.createdAt?.toDate() || new Date()
        })) || [],
        collaborators: data.collaborators?.map((c: any) => ({
          ...c,
          addedAt: c.addedAt?.toDate() || new Date()
        })) || []
      } as DesignProject;
      
      // Check access permissions
      const hasAccess = project.createdBy === userId || 
        project.collaborators.some(c => c.userId === userId);
      
      if (!hasAccess) {
        throw new Error('Access denied to design project');
      }
      
      // Update last accessed time
      await this.updateLastAccessed(projectId);
      
      return project;
    } catch (error) {
      logger.error('Error getting design project', { error, projectId, userId });
      throw error;
    }
  }
  
  /**
   * Update design project
   */
  async updateProject(
    projectId: string,
    updates: Partial<Pick<DesignProject, 'name' | 'description' | 'designData' | 'exportSettings'>>,
    userId: string
  ): Promise<void> {
    try {
      const projectRef = doc(firestore, 'designProjects', projectId);
      
      // Create new version if design data changed
      if (updates.designData) {
        const project = await this.getProject(projectId, userId);
        if (project) {
          const newVersion = {
            id: `v${project.versions.length + 1}`,
            name: `Version ${project.versions.length + 1}`,
            designData: updates.designData,
            createdAt: new Date(),
            createdBy: userId
          };
          
          updates = {
            ...updates,
            versions: [...project.versions, newVersion] as any
          };
        }
      }
      
      await updateDoc(projectRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp()
      });
      
      logger.info('Design project updated', {
        projectId,
        userId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Error updating design project', { error, projectId, userId });
      throw error;
    }
  }
  
  /**
   * Get design templates
   */
  async getTemplates(
    filters: {
      category?: DesignTemplate['category'];
      platform?: DesignTemplate['platform'];
      organizationId?: string;
      isPublic?: boolean;
      tags?: string[];
    } = {}
  ): Promise<DesignTemplate[]> {
    try {
      let q = query(collection(firestore, 'designTemplates'));
      
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      
      if (filters.platform) {
        q = query(q, where('platform', '==', filters.platform));
      }
      
      if (filters.organizationId) {
        q = query(q, where('organizationId', '==', filters.organizationId));
      }
      
      if (filters.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }
      
      q = query(q, orderBy('usageCount', 'desc'), limit(50));
      
      const snapshot = await getDocs(q);
      
      let templates = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as DesignTemplate;
      });
      
      // Filter by tags if specified
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(template => 
          filters.tags!.some(tag => template.tags.includes(tag))
        );
      }
      
      return templates;
    } catch (error) {
      logger.error('Error getting design templates', { error, filters });
      throw error;
    }
  }
  
  /**
   * Create design template from project
   */
  async createTemplate(
    projectId: string,
    templateData: Omit<DesignTemplate, 'id' | 'templateData' | 'usageCount' | 'rating' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<DesignTemplate> {
    try {
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const templateRef = doc(collection(firestore, 'designTemplates'));
      
      const newTemplate: DesignTemplate = {
        ...templateData,
        id: templateRef.id,
        templateData: {
          elements: project.designData.elements,
          backgroundColor: project.designData.backgroundColor,
          backgroundImage: project.designData.backgroundImage,
          layers: Math.max(...project.designData.elements.map(e => e.position.z)) + 1
        },
        usageCount: 0,
        rating: 0,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(templateRef, {
        ...newTemplate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      logger.info('Design template created', {
        templateId: newTemplate.id,
        projectId,
        userId
      });
      
      return newTemplate;
    } catch (error) {
      logger.error('Error creating design template', { error, projectId, userId });
      throw error;
    }
  }
  
  /**
   * Get AI design suggestions
   */
  async getAIDesignSuggestions(
    projectId: string,
    context: {
      content?: string;
      platform?: string;
      audience?: string;
      style?: string;
    },
    user?: User
  ): Promise<AIDesignSuggestion[]> {
    try {
      const project = await this.getProject(projectId, user?.id || '');
      if (!project) {
        throw new Error('Project not found');
      }
      
      const prompt = `
        Provide design suggestions for this visual content project:
        
        PROJECT CONTEXT:
        Content: ${context.content || 'General social media post'}
        Platform: ${context.platform || 'Instagram'}
        Target Audience: ${context.audience || 'General audience'}
        Style Preference: ${context.style || 'Modern and clean'}
        
        CURRENT DESIGN:
        Dimensions: ${project.designData.dimensions.width}x${project.designData.dimensions.height}
        Background: ${project.designData.backgroundColor}
        Elements: ${project.designData.elements.length} elements
        
        Please provide suggestions for:
        1. Color scheme improvements
        2. Typography enhancements
        3. Layout optimizations
        4. Content improvements
        5. Style adjustments
        
        Format as JSON array:
        [
          {
            "type": "color-scheme",
            "title": "Vibrant Color Palette",
            "description": "Use warmer colors to increase engagement",
            "confidence": 85,
            "data": {
              "colors": ["#FF6B6B", "#4ECDC4", "#45B7D1"]
            },
            "canAutoApply": true
          }
        ]
      `;
      
      const result = await tieredModelRouter.routeTask({
        type: TaskType.CONTENT_GENERATION,
        input: prompt,
        options: {
          temperature: 0.4,
          maxTokens: 800
        }
      }, user);
      
      const suggestions = JSON.parse(result.output);
      
      // Save suggestions to project
      await this.saveAISuggestions(projectId, suggestions);
      
      return suggestions;
    } catch (error) {
      logger.error('Error getting AI design suggestions', { error, projectId });
      
      // Return fallback suggestions
      return [
        {
          type: 'color-scheme',
          title: 'Improve Color Contrast',
          description: 'Enhance readability with better color contrast',
          confidence: 70,
          data: {
            colors: ['#2C3E50', '#3498DB', '#E74C3C']
          },
          canAutoApply: true
        },
        {
          type: 'typography',
          title: 'Font Hierarchy',
          description: 'Create better visual hierarchy with font sizes',
          confidence: 75,
          data: {
            fonts: ['Inter', 'Roboto', 'Open Sans']
          },
          canAutoApply: false,
          applicationSteps: [
            'Select main heading text',
            'Increase font size to 24px',
            'Make font weight bold'
          ]
        }
      ];
    }
  }
  
  /**
   * Apply AI suggestion to project
   */
  async applyAISuggestion(
    projectId: string,
    suggestionIndex: number,
    userId: string
  ): Promise<void> {
    try {
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const suggestion = project.aiSuggestions[suggestionIndex];
      if (!suggestion || !suggestion.canAutoApply) {
        throw new Error('Suggestion cannot be auto-applied');
      }
      
      let updatedDesignData = { ...project.designData };
      
      // Apply suggestion based on type
      switch (suggestion.type) {
        case 'color-scheme':
          if (suggestion.data.colors) {
            updatedDesignData.backgroundColor = suggestion.data.colors[0];
            // Update text colors for better contrast
            updatedDesignData.elements = updatedDesignData.elements.map(element => {
              if (element.type === 'text') {
                return {
                  ...element,
                  properties: {
                    ...element.properties,
                    color: suggestion.data.colors![1] || '#FFFFFF'
                  }
                };
              }
              return element;
            });
          }
          break;
          
        case 'typography':
          if (suggestion.data.fonts) {
            updatedDesignData.elements = updatedDesignData.elements.map(element => {
              if (element.type === 'text') {
                return {
                  ...element,
                  properties: {
                    ...element.properties,
                    fontFamily: suggestion.data.fonts![0]
                  }
                };
              }
              return element;
            });
          }
          break;
      }
      
      // Update project with applied suggestion
      await this.updateProject(projectId, { designData: updatedDesignData }, userId);
      
      // Mark suggestion as applied
      const updatedSuggestions = [...project.aiSuggestions];
      updatedSuggestions[suggestionIndex] = { ...suggestion, applied: true };
      
      await updateDoc(doc(firestore, 'designProjects', projectId), {
        aiSuggestions: updatedSuggestions,
        updatedAt: serverTimestamp()
      });
      
      logger.info('AI suggestion applied', {
        projectId,
        suggestionType: suggestion.type,
        userId
      });
    } catch (error) {
      logger.error('Error applying AI suggestion', { error, projectId, userId });
      throw error;
    }
  }
  
  /**
   * Export design project
   */
  async exportProject(
    projectId: string,
    format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png',
    userId: string
  ): Promise<string> {
    try {
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      // Generate export data (this would typically use a canvas library or service)
      const exportData = await this.generateExportData(project, format);
      
      // Upload to storage
      const fileName = `exports/${projectId}_${Date.now()}.${format}`;
      const storageRef = ref(storage, fileName);
      
      const uploadResult = await uploadBytes(storageRef, exportData);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      logger.info('Design project exported', {
        projectId,
        format,
        userId,
        downloadURL
      });
      
      return downloadURL;
    } catch (error) {
      logger.error('Error exporting design project', { error, projectId, userId });
      throw error;
    }
  }
  
  /**
   * Get design assets
   */
  async getAssets(
    filters: {
      type?: DesignAsset['type'];
      category?: string;
      organizationId?: string;
      isPublic?: boolean;
      tags?: string[];
    } = {}
  ): Promise<DesignAsset[]> {
    try {
      let q = query(collection(firestore, 'designAssets'));
      
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      
      if (filters.organizationId) {
        q = query(q, where('organizationId', '==', filters.organizationId));
      }
      
      if (filters.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }
      
      q = query(q, orderBy('usageCount', 'desc'), limit(100));
      
      const snapshot = await getDocs(q);
      
      let assets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastUsed: data.lastUsed?.toDate()
        } as DesignAsset;
      });
      
      // Filter by tags if specified
      if (filters.tags && filters.tags.length > 0) {
        assets = assets.filter(asset => 
          filters.tags!.some(tag => asset.tags.includes(tag))
        );
      }
      
      return assets;
    } catch (error) {
      logger.error('Error getting design assets', { error, filters });
      throw error;
    }
  }
  
  /**
   * Upload design asset
   */
  async uploadAsset(
    file: File,
    assetData: Omit<DesignAsset, 'id' | 'url' | 'thumbnailUrl' | 'usageCount' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<DesignAsset> {
    try {
      // Upload file to storage
      const fileName = `assets/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Create asset record
      const assetRef = doc(collection(firestore, 'designAssets'));
      
      const newAsset: DesignAsset = {
        ...assetData,
        id: assetRef.id,
        url: downloadURL,
        usageCount: 0,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(assetRef, {
        ...newAsset,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      logger.info('Design asset uploaded', {
        assetId: newAsset.id,
        type: assetData.type,
        userId
      });
      
      return newAsset;
    } catch (error) {
      logger.error('Error uploading design asset', { error, userId });
      throw error;
    }
  }
  
  /**
   * Generate export data (placeholder implementation)
   */
  private async generateExportData(project: DesignProject, format: string): Promise<Uint8Array> {
    // This is a placeholder implementation
    // In a real application, you would use a canvas library or service to render the design
    
    const canvas = document.createElement('canvas');
    canvas.width = project.designData.dimensions.width;
    canvas.height = project.designData.dimensions.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Set background
    ctx.fillStyle = project.designData.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render elements (simplified)
    for (const element of project.designData.elements) {
      if (element.type === 'text') {
        const textProps = element.properties as TextProperties;
        ctx.fillStyle = textProps.color;
        ctx.font = `${textProps.fontSize}px ${textProps.fontFamily}`;
        ctx.fillText(textProps.content, element.position.x, element.position.y);
      }
      // Add other element types as needed
    }
    
    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then(buffer => {
            resolve(new Uint8Array(buffer));
          });
        } else {
          reject(new Error('Failed to generate export data'));
        }
      }, `image/${format}`, 0.9);
    });
  }
  
  /**
   * Save AI suggestions to project
   */
  private async saveAISuggestions(projectId: string, suggestions: AIDesignSuggestion[]): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'designProjects', projectId), {
        aiSuggestions: suggestions,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      logger.warn('Failed to save AI suggestions', { error, projectId });
    }
  }
  
  /**
   * Update last accessed time
   */
  private async updateLastAccessed(projectId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'designProjects', projectId), {
        lastAccessedAt: serverTimestamp()
      });
    } catch (error) {
      logger.warn('Failed to update last accessed time', { error, projectId });
    }
  }
} 
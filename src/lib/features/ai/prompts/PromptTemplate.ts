/**
 * Class for handling prompt templates with variable substitution
 * Supports conditional sections, variable interpolation, and versioning
 */
export class PromptTemplate {
  private template: string;
  private version: string;
  private platformOptimizations: Map<string, Record<string, any>> = new Map();
  
  /**
   * Create a new prompt template
   * @param template The template string with variables in {{varName}} format
   *                 and conditionals in {{#if condition}}content{{/if}} format
   * @param version Optional version identifier for the template
   */
  constructor(template: string, version: string = '1.0.0') {
    this.template = template;
    this.version = version;
  }
  
  /**
   * Get the version of this template
   */
  getVersion(): string {
    return this.version;
  }
  
  /**
   * Add platform-specific optimization parameters
   * @param platform Platform identifier (e.g., 'twitter', 'instagram')
   * @param optimizations Optimization parameters for the platform
   */
  addPlatformOptimizations(platform: string, optimizations: Record<string, any>): void {
    this.platformOptimizations.set(platform.toLowerCase(), optimizations);
  }
  
  /**
   * Get platform-specific optimizations
   * @param platform Platform identifier
   * @returns Optimization parameters or undefined if none exist
   */
  getPlatformOptimizations(platform: string): Record<string, any> | undefined {
    return this.platformOptimizations.get(platform.toLowerCase());
  }
  
  /**
   * Render the template with the provided variables
   * @param variables Object containing variable values to substitute
   * @param platform Optional platform to apply specific optimizations
   * @returns Rendered template with variables replaced
   */
  render(variables: Record<string, any>, platform?: string): string {
    let result = this.template;
    
    // Apply platform-specific variable overrides if platform is specified
    if (platform) {
      const platformVars = this.getPlatformOptimizations(platform);
      if (platformVars) {
        variables = { ...variables, ...platformVars };
      }
    }
    
    // Process conditional sections first (basic implementation)
    result = this.processConditionals(result, variables);
    
    // Replace variables
    result = this.replaceVariables(result, variables);
    
    return result;
  }
  
  /**
   * Process conditional sections in the template
   * @param template The template string
   * @param variables Variables for condition evaluation
   * @returns Template with conditionals processed
   */
  private processConditionals(template: string, variables: Record<string, any>): string {
    // Match conditional patterns: {{#if condition}}content{{/if}}
    const conditionalPattern = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(conditionalPattern, (match, condition, content) => {
      const conditionValue = condition.trim();
      
      // Check if condition variable exists and is truthy
      if (variables[conditionValue]) {
        return content;
      }
      return '';
    });
  }
  
  /**
   * Replace variables in the template with their values
   * @param template The template string
   * @param variables Variables to substitute
   * @returns Template with variables replaced
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    // Match variable patterns: {{varName}}
    const variablePattern = /{{([^#/][^}]*?)}}/g;
    
    return template.replace(variablePattern, (match, varName) => {
      const name = varName.trim();
      
      // Handle array variables
      if (name.includes('.')) {
        return this.getNestedValue(name, variables);
      }
      
      // Return the variable value or empty string if undefined
      return variables[name] !== undefined ? String(variables[name]) : '';
    });
  }
  
  /**
   * Get a nested value from an object using dot notation
   * @param path Path to the value (e.g. "user.profile.name")
   * @param obj Object to extract value from
   * @returns The value at the specified path
   */
  private getNestedValue(path: string, obj: Record<string, any>): string {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === undefined || result === null) {
        return '';
      }
      result = result[key];
    }
    
    return result !== undefined ? String(result) : '';
  }
  
  /**
   * Creates a new version of this template
   * @param template New template content (optional, defaults to current template)
   * @param version New version identifier (must be different from current)
   * @returns New PromptTemplate instance with updated version
   */
  createNewVersion(template?: string, version?: string): PromptTemplate {
    const newVersion = version || this.incrementVersion();
    
    if (newVersion === this.version) {
      throw new Error('New version must be different from current version');
    }
    
    const newTemplate = new PromptTemplate(template || this.template, newVersion);
    
    // Copy platform optimizations to new template
    this.platformOptimizations.forEach((optimizations, platform) => {
      newTemplate.addPlatformOptimizations(platform, optimizations);
    });
    
    return newTemplate;
  }
  
  /**
   * Auto-increment the version number (semver-like)
   * @returns Incremented version string
   */
  private incrementVersion(): string {
    const parts = this.version.split('.');
    if (parts.length !== 3) {
      return `${this.version}.1`;
    }
    
    const patch = parseInt(parts[2], 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}

import React, { useState, useEffect } from 'react';
import { Button, ButtonVariant, ButtonSize } from '../../ui/button';
import { Clipboard, Search, Star, Plus, Clock, Loader2, Check, Lock, X, Edit, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '../../ui/command';
import { useSubscription } from '../../../hooks/useSubscription';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/Badge';
import { Separator } from '../../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { TextArea } from '../../ui/textarea';

export interface ResponseTemplate {
  /**
   * Unique ID for the template
   */
  id: string;
  /**
   * Template name
   */
  name: string;
  /**
   * Template content
   */
  content: string;
  /**
   * Whether the template is favorited
   */
  isFavorite?: boolean;
  /**
   * Tags for categorizing the template
   */
  tags?: string[];
  /**
   * Template creator (team member or 'system')
   */
  createdBy?: string;
  /**
   * Last used date
   */
  lastUsed?: Date;
}

export interface ResponseTemplateButtonProps {
  /**
   * Available response templates
   */
  templates: ResponseTemplate[];
  /**
   * Function to call when a template is selected
   */
  onSelectTemplate: (template: ResponseTemplate) => void;
  /**
   * Function to call when a new template is created
   */
  onCreateTemplate?: (name: string, content: string) => Promise<void>;
  /**
   * Function to call when a template is favorited/unfavorited
   */
  onToggleFavorite?: (templateId: string, isFavorite: boolean) => Promise<void>;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Whether to show just an icon
   */
  iconOnly?: boolean;
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * ResponseTemplateButton - Component for inserting response templates
 */
export const ResponseTemplateButton: React.FC<ResponseTemplateButtonProps> = ({
  templates,
  onSelectTemplate,
  onCreateTemplate,
  onToggleFavorite,
  isDisabled = false,
  size = 'sm',
  iconOnly = false,
  variant = 'outline',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [favoriteAction, setFavoriteAction] = useState<{
    templateId: string;
    loading: boolean;
    success?: boolean;
  } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);
  
  const { subscription } = useSubscription();
  const userTier = subscription?.tier || 'creator';
  
  // Check if user can create custom templates
  const canCreateTemplates = userTier === 'influencer' || userTier === 'enterprise';
  
  // Filter templates by search query
  const filteredTemplates = templates.filter(template => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.content.toLowerCase().includes(searchLower) ||
      template.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });
  
  // Group templates by favorite status
  const favoriteTemplates = filteredTemplates.filter(t => t.isFavorite);
  const otherTemplates = filteredTemplates.filter(t => !t.isFavorite);
  
  // Handle favorite toggle
  const handleToggleFavorite = async (templateId: string, isFavorite: boolean) => {
    if (!onToggleFavorite) return;
    
    setFavoriteAction({ templateId, loading: true });
    
    try {
      await onToggleFavorite(templateId, !isFavorite);
      setFavoriteAction({ templateId, loading: false, success: true });
      
      // Reset after a moment
      setTimeout(() => {
        setFavoriteAction(null);
      }, 1000);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setFavoriteAction({ templateId, loading: false, success: false });
      
      // Reset after a moment
      setTimeout(() => {
        setFavoriteAction(null);
      }, 2000);
    }
  };
  
  // Handle template selection
  const handleSelectTemplate = (template: ResponseTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };
  
  // Handle creating new template
  const handleCreateTemplate = async () => {
    if (!onCreateTemplate || !canCreateTemplates) return;
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) return;
    
    setIsCreating(true);
    
    try {
      await onCreateTemplate(newTemplate.name, newTemplate.content);
      setNewTemplate({ name: '', content: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Truncate text for display
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${className}`}
          disabled={isDisabled}
        >
          <Clipboard className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
          {!iconOnly && 'Templates'}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search templates..."
            value={search}
            onValueChange={setSearch}
          />
          
          <CommandList className="max-h-80 overflow-y-auto">
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-gray-500">
                <p>No templates found.</p>
                {canCreateTemplates && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-2 text-[#00CC44] hover:text-[#00CC44]"
                  >
                    Create a new template
                  </button>
                )}
              </div>
            </CommandEmpty>
            
            {showCreateForm ? (
              <div className="p-3">
                <h3 className="font-medium text-sm mb-2">Create New Template</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md"
                      placeholder="e.g., Customer Inquiry Response"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Template Content
                    </label>
                    <textarea
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md min-h-[100px]"
                      placeholder="Write your template content here..."
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTemplate({ name: '', content: '' });
                      }}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateTemplate}
                      disabled={!newTemplate.name.trim() || !newTemplate.content.trim() || isCreating}
                      className="h-8 text-xs"
                    >
                      {isCreating ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      Create Template
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {favoriteTemplates.length > 0 && (
                  <CommandGroup>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Favorites
                    </div>
                    {favoriteTemplates.map(template => (
                      <CommandItem
                        key={template.id}
                        onSelect={() => handleSelectTemplate(template)}
                        className="flex items-start py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {truncateText(template.content, 50)}
                          </p>
                        </div>
                        
                        {onToggleFavorite && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(template.id, template.isFavorite || false);
                            }}
                            className="ml-2 mt-0.5 text-yellow-500 hover:text-yellow-600"
                          >
                            {favoriteAction?.templateId === template.id && favoriteAction.loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4 fill-yellow-500" />
                            )}
                          </button>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {favoriteTemplates.length > 0 && otherTemplates.length > 0 && (
                  <CommandSeparator />
                )}
                
                {otherTemplates.length > 0 && (
                  <CommandGroup>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {favoriteTemplates.length > 0 ? "Other Templates" : "Templates"}
                    </div>
                    {otherTemplates.map(template => (
                      <CommandItem
                        key={template.id}
                        onSelect={() => handleSelectTemplate(template)}
                        className="flex items-start py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {truncateText(template.content, 50)}
                          </p>
                          {template.lastUsed && (
                            <div className="flex items-center mt-0.5">
                              <Clock className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-400">
                                Last used: {new Date(template.lastUsed).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {onToggleFavorite && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(template.id, template.isFavorite || false);
                            }}
                            className="ml-2 mt-0.5 text-gray-400 hover:text-yellow-500"
                          >
                            {favoriteAction?.templateId === template.id ? (
                              favoriteAction.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : favoriteAction.success ? (
                                <Check className="h-4 w-4 text-[#00CC44]" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {canCreateTemplates && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-[#00CC44]"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create new template
                    </Button>
                  </div>
                )}
                
                {!canCreateTemplates && (
                  <div className="p-3 border-t">
                    <div className="text-xs text-gray-500 flex items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center">
                              <div className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm flex items-center mr-1">
                                <Lock className="h-3 w-3 mr-0.5" />
                                UPGRADE
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-48 text-xs">
                              Upgrade to Influencer or Enterprise tier to create custom response templates
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <span>Custom templates available in higher tiers</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ResponseTemplateButton; 
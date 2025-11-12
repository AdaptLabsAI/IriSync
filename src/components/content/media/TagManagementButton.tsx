import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Tag, Plus, X, PlusCircle, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/Badge';

export interface TagData {
  /**
   * Tag ID
   */
  id: string;
  /**
   * Tag name/label
   */
  name: string;
  /**
   * Optional color for the tag
   */
  color?: string;
  /**
   * Number of items using this tag
   */
  usageCount?: number;
}

export interface TagManagementButtonProps {
  /**
   * Current tags applied to the item(s)
   */
  selectedTags: string[];
  /**
   * All available tags in the system
   */
  availableTags: TagData[];
  /**
   * Callback when tags are updated
   */
  onTagsUpdate: (tags: string[]) => Promise<void>;
  /**
   * Callback to create a new tag
   */
  onCreateTag?: (tagName: string) => Promise<TagData>;
  /**
   * Callback to delete a tag
   */
  onDeleteTag?: (tagId: string) => Promise<void>;
  /**
   * Whether multiple media items are selected
   */
  isMultipleSelection?: boolean;
  /**
   * Number of selected media items (if multiple)
   */
  selectedItemsCount?: number;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Whether user can create new tags
   */
  canCreateTags?: boolean;
  /**
   * Whether user can delete tags
   */
  canDeleteTags?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * TagManagementButton - Button for managing media tags
 */
export const TagManagementButton: React.FC<TagManagementButtonProps> = ({
  selectedTags,
  availableTags,
  onTagsUpdate,
  onCreateTag,
  onDeleteTag,
  isMultipleSelection = false,
  selectedItemsCount = 1,
  className = '',
  disabled = false,
  isLoading = false,
  canCreateTags = true,
  canDeleteTags = false,
  size = 'sm',
  variant = 'outline',
}) => {
  const [open, setOpen] = useState(false);
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isDeletingTag, setIsDeletingTag] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedTags(selectedTags);
  }, [selectedTags]);

  // Filter tags based on search query
  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle a tag selection
  const toggleTag = (tagId: string) => {
    setLocalSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Create a new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return;
    
    try {
      setIsCreatingTag(true);
      setError(null);
      
      const newTag = await onCreateTag(newTagName.trim());
      
      // Select the newly created tag
      setLocalSelectedTags(prev => [...prev, newTag.id]);
      setNewTagName('');
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create tag. Please try again.');
      console.error('Error creating tag:', err);
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Delete a tag
  const handleDeleteTag = async (tagId: string) => {
    if (!onDeleteTag) return;
    
    try {
      setIsDeletingTag(true);
      setError(null);
      
      await onDeleteTag(tagId);
      
      // Remove from selected tags if present
      setLocalSelectedTags(prev => prev.filter(id => id !== tagId));
      setTagToDelete(null);
    } catch (err) {
      setError('Failed to delete tag. Please try again.');
      console.error('Error deleting tag:', err);
    } finally {
      setIsDeletingTag(false);
    }
  };

  // Save tag changes
  const handleSaveTags = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      await onTagsUpdate(localSelectedTags);
      setOpen(false);
    } catch (err) {
      setError('Failed to update tags. Please try again.');
      console.error('Error updating tags:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Get tag name by ID
  const getTagName = (tagId: string) => {
    return availableTags.find(tag => tag.id === tagId)?.name || tagId;
  };

  // Get tag color by ID
  const getTagColor = (tagId: string) => {
    return availableTags.find(tag => tag.id === tagId)?.color || '#e5e7eb';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Tag className="h-4 w-4" />
          )}
          Manage Tags
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-1">{selectedTags.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isMultipleSelection
              ? `Manage Tags (${selectedItemsCount} items)`
              : 'Manage Tags'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            
            {canCreateTags && !showCreateForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            )}
          </div>
          
          {showCreateForm && (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
              <Input
                type="text"
                placeholder="Enter new tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1"
                disabled={isCreatingTag}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
              >
                {isCreatingTag ? (
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTagName('');
                }}
                disabled={isCreatingTag}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto">
            {filteredTags.length > 0 ? (
              <div className="space-y-2">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between p-2 rounded-md border transition-colors ${
                      localSelectedTags.includes(tag.id)
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div
                      className="flex items-center flex-1 cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: tag.color || '#e5e7eb' }}
                      />
                      <span className="text-sm font-medium">{tag.name}</span>
                      {tag.usageCount !== undefined && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {tag.usageCount}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      {localSelectedTags.includes(tag.id) && (
                        <Check className="h-4 w-4 text-primary mr-2" />
                      )}
                      
                      {canDeleteTags && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setTagToDelete(tag.id)}
                          disabled={isDeletingTag}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-4 text-gray-500">
                <p>No tags found matching "{searchQuery}"</p>
                {canCreateTags && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setNewTagName(searchQuery);
                      setShowCreateForm(true);
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create "{searchQuery}"
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No tags available</p>
                {canCreateTags && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create a new tag
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {localSelectedTags.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium mb-2">Selected Tags:</p>
              <div className="flex flex-wrap gap-2">
                {localSelectedTags.map(tagId => (
                  <Badge
                    key={tagId}
                    variant="outline"
                    className="flex items-center gap-1 py-1 px-2"
                    style={{ backgroundColor: getTagColor(tagId) + '20' }}
                  >
                    {getTagName(tagId)}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => toggleTag(tagId)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="mr-2"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveTags}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              'Save Tags'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Delete confirmation dialog */}
      {tagToDelete && (
        <Dialog
          open={!!tagToDelete}
          onOpenChange={(open) => !open && setTagToDelete(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Tag</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4">
                Are you sure you want to delete the tag "{availableTags.find(t => t.id === tagToDelete)?.name}"?
              </p>
              {availableTags.find(t => t.id === tagToDelete)?.usageCount ? (
                <div className="bg-amber-50 p-3 rounded-md text-amber-700 mb-4">
                  <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                  This tag is used by {availableTags.find(t => t.id === tagToDelete)?.usageCount} item(s).
                  Deleting it will remove the tag from all these items.
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTagToDelete(null)}
                className="mr-2"
                disabled={isDeletingTag}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteTag(tagToDelete)}
                disabled={isDeletingTag}
              >
                {isDeletingTag ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Tag
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default TagManagementButton; 
import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { History, ArrowLeft, ExternalLink } from 'lucide-react';
import Dialog from '../ui/dialog';
import { Avatar } from '../ui/Avatar';

export interface RevisionItem {
  id: string;
  contentId: string;
  revisionNumber: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  changes: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  comment?: string;
}

export interface RevisionHistoryButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Content ID that this revision history relates to
   */
  contentId: string;
  /**
   * Revision history items for this content
   */
  revisions?: RevisionItem[];
  /**
   * Callback when a revision is viewed
   */
  onViewRevision?: (revisionId: string) => Promise<void>;
  /**
   * Callback when a revision is restored
   */
  onRestoreRevision?: (revisionId: string) => Promise<void>;
  /**
   * Whether to show the revision count badge
   */
  showCount?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
  /**
   * Content title
   */
  contentTitle?: string;
}

/**
 * A button that shows revision history for content.
 * This component allows team members to view previous versions and restore them if needed.
 * This feature requires the 'content:view_revisions' permission.
 */
const RevisionHistoryButton: React.FC<RevisionHistoryButtonProps> = ({
  contentId,
  revisions = [],
  onViewRevision,
  onRestoreRevision,
  showCount = true,
  iconOnly = false,
  contentTitle = 'Content',
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedRevision(null);
  };

  const handleViewRevision = async (revisionId: string) => {
    if (!onViewRevision || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onViewRevision(revisionId);
      const revision = revisions.find(r => r.id === revisionId) || null;
      setSelectedRevision(revision);
    } catch (error) {
      console.error('Error viewing revision:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!onRestoreRevision || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onRestoreRevision(revisionId);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error restoring revision:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<History className="h-4 w-4" />}
        requiredPermission="content:view_revisions"
        {...buttonProps}
      >
        {iconOnly ? null : (
          <>
            {children || 'History'}
            {showCount && revisions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {revisions.length}
              </span>
            )}
          </>
        )}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        title={selectedRevision ? `Revision #${selectedRevision.revisionNumber}` : `Revision History: ${contentTitle}`}
        className="max-w-2xl"
      >
        {selectedRevision ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRevision(null)}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="mb-2"
            >
              Back to History
            </Button>
            
            <div className="flex items-center gap-2 pb-3 border-b">
              <Avatar 
                src={selectedRevision.userAvatar} 
                alt={selectedRevision.userName} 
                fallback={selectedRevision.userName.charAt(0)} 
                size="sm"
              />
              <div>
                <div className="font-medium text-sm">{selectedRevision.userName}</div>
                <div className="text-xs text-gray-500">
                  {new Date(selectedRevision.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            
            {selectedRevision.comment && (
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <p className="font-medium mb-1">Revision Comment:</p>
                <p>{selectedRevision.comment}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Changes:</h3>
              {selectedRevision.changes.map((change, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <p className="font-medium text-sm mb-2">{change.field}</p>
                  
                  {change.oldValue !== undefined && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Previous:</p>
                      <div className="p-2 bg-red-50 text-sm rounded">{change.oldValue || '(empty)'}</div>
                    </div>
                  )}
                  
                  {change.newValue !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">New:</p>
                      <div className="p-2 bg-[#00FF6A]/5 text-sm rounded">{change.newValue || '(empty)'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-3 border-t">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRestoreRevision(selectedRevision.id)}
                loading={isLoading}
                requiredPermission="content:restore_revisions"
              >
                Restore This Version
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {revisions.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2 divide-y">
                {revisions.map(revision => (
                  <div 
                    key={revision.id} 
                    className="pt-3 first:pt-0 pb-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          src={revision.userAvatar} 
                          alt={revision.userName} 
                          fallback={revision.userName.charAt(0)} 
                          size="sm"
                        />
                        <div>
                          <div className="font-medium text-sm">Revision #{revision.revisionNumber}</div>
                          <div className="text-xs text-gray-500">
                            {revision.userName} • {new Date(revision.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewRevision(revision.id)}
                        rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        View
                      </Button>
                    </div>
                    
                    <div className="mt-2 ml-10 text-sm text-gray-600">
                      <span className="font-medium">{revision.changes.length}</span> changes
                      {revision.comment && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{revision.comment}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No revision history available for this content</p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
};

export default RevisionHistoryButton; 
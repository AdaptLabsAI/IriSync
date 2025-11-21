import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { ListPlus, Info, Clock, Calendar, CircleAlert, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

export type QueuePosition = 'first' | 'last' | 'optimal' | 'specified';
export type TimeSlot = { day: string; time: string };

export interface QueueConfig {
  /**
   * Predefined queue configuration based on user activity/platform audience
   */
  predefinedSlots: TimeSlot[];
  /**
   * Custom slots defined by the user
   */
  customSlots: TimeSlot[];
  /**
   * User's timezone
   */
  timezone: string;
  /**
   * Maximum number of posts to queue per day
   */
  maxPostsPerDay: number;
  /**
   * Minimum gap between queued posts (in minutes)
   */
  minGapBetweenPosts: number;
}

export interface QueueButtonProps {
  /**
   * Content data to be queued
   */
  contentData: Record<string, any>;
  /**
   * Queue configuration
   */
  queueConfig: QueueConfig;
  /**
   * Function to call when adding to queue
   */
  onAddToQueue: (position: QueuePosition, positionIndex?: number) => Promise<{ success: boolean; message?: string; scheduledTime?: Date }>;
  /**
   * Whether the content can be queued
   */
  canQueue: boolean;
  /**
   * Whether multiple platforms are selected
   */
  isMultiPlatform?: boolean;
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
   * Optional button variant
   */
  variant?: 'primary' | 'outline' | 'ghost';
  /**
   * Optional button size
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * QueueButton - Button for adding content to the publishing queue
 */
export const QueueButton: React.FC<QueueButtonProps> = ({
  contentData,
  queueConfig,
  onAddToQueue,
  canQueue = true,
  isMultiPlatform = false,
  className = '',
  disabled = false,
  isLoading = false,
  variant = 'default',
  size = 'sm',
}) => {
  const [open, setOpen] = useState(false);
  const [queuePosition, setQueuePosition] = useState<QueuePosition>('optimal');
  const [positionIndex, setPositionIndex] = useState<number>(0);
  const [queueTime, setQueueTime] = useState<Date | null>(null);
  const [isQueuing, setIsQueuing] = useState(false);
  const [queueResult, setQueueResult] = useState<{ success: boolean; message?: string; scheduledTime?: Date } | null>(null);
  const [showAvailableSlots, setShowAvailableSlots] = useState(false);

  // Get next available time slots based on configuration
  const getNextTimeSlots = (): TimeSlot[] => {
    // In a real implementation, this would calculate actual time slots based on
    // queue configuration, taking into account maxPostsPerDay, minGapBetweenPosts,
    // and existing queued posts. Here we'll use the predefined slots.
    return queueConfig.predefinedSlots;
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Handle add to queue
  const handleAddToQueue = async () => {
    if (!canQueue) return;
    
    setIsQueuing(true);
    setQueueResult(null);
    
    try {
      const result = await onAddToQueue(queuePosition, queuePosition === 'specified' ? positionIndex : undefined);
      setQueueResult(result);
      
      if (result.success && result.scheduledTime) {
        setQueueTime(result.scheduledTime);
      }
      
      // Auto-close dialog on success after 2 seconds
      if (result.success) {
        setTimeout(() => {
          setOpen(false);
          setQueueResult(null);
        }, 2000);
      }
    } catch (error) {
      setQueueResult({
        success: false,
        message: 'An error occurred while adding to queue. Please try again.'
      });
      console.error('Error adding to queue:', error);
    } finally {
      setIsQueuing(false);
    }
  };

  // Calculate estimated time based on position
  const getEstimatedTime = (): Date | null => {
    if (queueResult?.scheduledTime) {
      return queueResult.scheduledTime;
    }
    
    if (queuePosition === 'first') {
      // Assuming first position means the next available time slot
      const now = new Date();
      const nextSlot = new Date(now.getTime() + 15 * 60000); // 15 minutes from now as an example
      return nextSlot;
    } else if (queuePosition === 'last') {
      // Last position is typically end of day or next day
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(19, 0, 0, 0); // 7:00 PM as an example
      
      return endOfDay > now ? endOfDay : new Date(endOfDay.getTime() + 24 * 60 * 60000);
    } else if (queuePosition === 'optimal') {
      // Optimal position is based on audience engagement
      // This would normally be calculated based on analytics
      const now = new Date();
      const optimalTime = new Date(now);
      
      // Example: If current time is before 11 AM, set to 12 PM today
      // Otherwise, set to 6 PM today or 9 AM tomorrow
      if (now.getHours() < 11) {
        optimalTime.setHours(12, 0, 0, 0);
      } else if (now.getHours() < 17) {
        optimalTime.setHours(18, 0, 0, 0);
      } else {
        optimalTime.setDate(optimalTime.getDate() + 1);
        optimalTime.setHours(9, 0, 0, 0);
      }
      
      return optimalTime;
    } else if (queuePosition === 'specified' && positionIndex >= 0) {
      // For specified position, we would normally look at the available slots
      // and return the one at the specified index
      const slots = getNextTimeSlots();
      if (positionIndex < slots.length) {
        const slot = slots[positionIndex];
        const [hour, minute] = slot.time.split(':').map(Number);
        
        const slotDate = new Date();
        // Handle different days (today, tomorrow, etc.)
        if (slot.day === 'tomorrow') {
          slotDate.setDate(slotDate.getDate() + 1);
        } else if (slot.day !== 'today') {
          // For specific weekdays, calculate the next occurrence
          const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDayIndex = weekdays.indexOf(slot.day.toLowerCase());
          if (targetDayIndex >= 0) {
            const currentDayIndex = slotDate.getDay();
            const daysToAdd = (targetDayIndex + 7 - currentDayIndex) % 7;
            slotDate.setDate(slotDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
          }
        }
        
        slotDate.setHours(hour, minute, 0, 0);
        return slotDate;
      }
    }
    
    return null;
  };

  const estimatedTime = getEstimatedTime();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading || !canQueue}
          title={!canQueue ? 'Cannot queue content at this time' : 'Add to content queue'}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <ListPlus className="h-4 w-4" />
          )}
          Add to Queue
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {queueResult 
              ? queueResult.success 
                ? 'Added to Queue' 
                : 'Failed to Add to Queue'
              : 'Add to Content Queue'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          {!canQueue ? (
            <div className="py-6 text-center">
              <CircleAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Cannot Queue Content</h3>
              <p className="text-sm text-gray-500 mb-4">
                {isMultiPlatform 
                  ? 'Content cannot be queued for multiple platforms with different format requirements.'
                  : 'Please ensure your content is complete and properly formatted.'}
              </p>
            </div>
          ) : queueResult ? (
            <div className={`py-4 ${queueResult.success ? 'text-[#00CC44]' : 'text-red-700'}`}>
              <div className="flex items-center justify-center mb-4">
                {queueResult.success ? (
                  <div className="h-12 w-12 rounded-full bg-[#00FF6A]/10 flex items-center justify-center">
                    <Check className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="h-6 w-6" />
                  </div>
                )}
              </div>
              
              <p className="text-center font-medium mb-2">
                {queueResult.message || (queueResult.success 
                  ? 'Your content has been added to the queue!' 
                  : 'Failed to add content to the queue.')}
              </p>
              
              {queueResult.success && queueResult.scheduledTime && (
                <div className="text-center text-sm bg-gray-50 p-3 rounded-md text-gray-700 mt-3">
                  <p className="flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Scheduled for {formatDate(queueResult.scheduledTime)} at {formatTime(queueResult.scheduledTime)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p>The content queue automatically schedules your content at optimal posting times based on your audience activity.</p>
                  </div>
                </div>
              </div>
              
              <RadioGroup 
                value={queuePosition} 
                onValueChange={(val: any) => setQueuePosition(val as QueuePosition)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="optimal" id="optimal" className="mt-0.5" />
                  <div className="flex flex-col">
                    <Label htmlFor="optimal" className="font-medium">Optimal time (recommended)</Label>
                    <p className="text-xs text-gray-500">Post at the time calculated to get the most engagement</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="first" id="first" className="mt-0.5" />
                  <div className="flex flex-col">
                    <Label htmlFor="first" className="font-medium">Next available slot</Label>
                    <p className="text-xs text-gray-500">Add to the start of the queue</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="last" id="last" className="mt-0.5" />
                  <div className="flex flex-col">
                    <Label htmlFor="last" className="font-medium">End of queue</Label>
                    <p className="text-xs text-gray-500">Add to the end of the current queue</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="specified" id="specified" className="mt-0.5" />
                  <div className="flex flex-col space-y-2 flex-1">
                    <Label htmlFor="specified" className="font-medium">Specific time slot</Label>
                    
                    <div className="flex items-center">
                      <Popover open={showAvailableSlots} onOpenChange={setShowAvailableSlots}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="small" 
                            className="flex items-center text-xs h-8"
                            disabled={queuePosition !== 'specified'}
                          >
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Select time slot
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                          <div className="max-h-60 overflow-y-auto divide-y">
                            {getNextTimeSlots().map((slot, index) => (
                              <button
                                key={`${slot.day}-${slot.time}`}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                                onClick={() => {
                                  setPositionIndex(index);
                                  setShowAvailableSlots(false);
                                }}
                              >
                                <div className={`w-2 h-2 rounded-full ${index === positionIndex ? 'bg-primary' : 'bg-gray-300'}`} />
                                <div>
                                  <p className="text-sm font-medium">{slot.day}</p>
                                  <p className="text-xs text-gray-500">{slot.time}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </RadioGroup>
              
              {estimatedTime && (
                <div className="bg-gray-50 p-3 rounded-md flex items-center">
                  <Clock className="h-4 w-4 text-gray-700 mr-2" />
                  <div className="text-sm">
                    <span className="font-medium">Estimated time:</span>{' '}
                    <span>{formatDate(estimatedTime)} at {formatTime(estimatedTime)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!queueResult ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="mr-2"
                disabled={isQueuing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToQueue}
                disabled={isQueuing || (queuePosition === 'specified' && positionIndex < 0)}
              >
                {isQueuing ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Adding to Queue...
                  </>
                ) : (
                  <>
                    <ListPlus className="h-4 w-4 mr-2" />
                    Add to Queue
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QueueButton; 
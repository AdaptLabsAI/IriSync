import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Clock, Mail, Loader, Users, Lock } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogClose } from '../ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio';
import { Label } from '../ui/label';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ReportFormat = 'pdf' | 'csv' | 'excel';

export interface ReportSchedule {
  /**
   * Report ID
   */
  reportId: string;
  /**
   * Frequency of the report
   */
  frequency: ReportFrequency;
  /**
   * Specific time for delivery (HH:MM)
   */
  time?: string;
  /**
   * Day of week (for weekly reports, 0-6, Sunday=0)
   */
  dayOfWeek?: number;
  /**
   * Day of month (for monthly reports, 1-31)
   */
  dayOfMonth?: number;
  /**
   * Report format
   */
  format: ReportFormat;
  /**
   * Email recipients
   */
  recipients: string[];
  /**
   * Whether to include team members automatically
   */
  includeTeam?: boolean;
}

export interface ScheduleReportButtonProps {
  /**
   * Report ID to schedule
   */
  reportId: string;
  /**
   * Report name for display
   */
  reportName: string;
  /**
   * Currently active schedule (if any)
   */
  currentSchedule?: ReportSchedule | null;
  /**
   * User's subscription tier
   */
  userTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Team members' emails for quick selection
   */
  teamMembers?: { email: string; name: string }[];
  /**
   * Callback for when a schedule is created/updated
   */
  onSchedule: (schedule: ReportSchedule) => Promise<void>;
  /**
   * Callback for when a schedule is deleted
   */
  onDelete?: (reportId: string) => Promise<void>;
  /**
   * Optional variant
   */
  variant?: 'primary' | 'outline' | 'ghost';
  /**
   * Optional size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show as icon-only button
   */
  iconOnly?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Optional CSS class
   */
  className?: string;
}

/**
 * ScheduleReportButton - Component to schedule recurring report delivery
 */
const ScheduleReportButton: React.FC<ScheduleReportButtonProps> = ({
  reportId,
  reportName,
  currentSchedule,
  userTier,
  teamMembers = [],
  onSchedule,
  onDelete,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
  disabled = false,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schedule, setSchedule] = useState<ReportSchedule>(
    currentSchedule || {
      reportId,
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      time: '09:00',
      format: 'pdf',
      recipients: [],
      includeTeam: true,
    }
  );
  
  // Check if scheduling is available based on tier
  const isSchedulingAvailable = userTier === 'influencer' || userTier === 'enterprise';
  
  // Check if this specific frequency is available for the user's tier
  const isFrequencyAvailable = (frequency: ReportFrequency): boolean => {
    if (userTier === 'enterprise') return true;
    if (userTier === 'influencer') {
      return frequency === 'weekly' || frequency === 'monthly';
    }
    return false;
  };
  
  const handleSave = async () => {
    if (disabled || isSubmitting || !isSchedulingAvailable) return;
    
    setIsSubmitting(true);
    
    try {
      await onSchedule(schedule);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error scheduling report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!onDelete || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onDelete(reportId);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error deleting report schedule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRecipientChange = (email: string, checked: boolean) => {
    if (checked) {
      setSchedule({
        ...schedule,
        recipients: [...schedule.recipients, email]
      });
    } else {
      setSchedule({
        ...schedule,
        recipients: schedule.recipients.filter(r => r !== email)
      });
    }
  };
  
  // Button label based on current state
  const getButtonLabel = () => {
    if (currentSchedule) {
      return `${currentSchedule.frequency.charAt(0).toUpperCase() + currentSchedule.frequency.slice(1)} Report`;
    }
    
    return 'Schedule Report';
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || !isSchedulingAvailable}
      >
        <Clock className="h-4 w-4" />
        {!iconOnly && <span>{getButtonLabel()}</span>}
        {!isSchedulingAvailable && <Lock className="h-3 w-3 ml-1" />}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Schedule {reportName} Report</DialogTitle>
          
          {!isSchedulingAvailable ? (
            <div className="p-4 text-center">
              <Lock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Feature Not Available</p>
              <p className="text-sm text-gray-500 mt-1">
                Report scheduling requires Influencer or Enterprise tier.
              </p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={() => setIsDialogOpen(false)}
              >
                Upgrade Plan
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={schedule.frequency}
                    onValueChange={(value: ReportFrequency) => {
                      if (isFrequencyAvailable(value)) {
                        setSchedule({ ...schedule, frequency: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily" disabled={!isFrequencyAvailable('daily')}>
                        Daily
                        {!isFrequencyAvailable('daily') && <Lock className="h-3 w-3 ml-2 inline" />}
                      </SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly" disabled={!isFrequencyAvailable('quarterly')}>
                        Quarterly
                        {!isFrequencyAvailable('quarterly') && <Lock className="h-3 w-3 ml-2 inline" />}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {schedule.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select
                      value={String(schedule.dayOfWeek)}
                      onValueChange={(value: any) => 
                        setSchedule({ ...schedule, dayOfWeek: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {schedule.frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={String(schedule.dayOfMonth || 1)}
                      onValueChange={(value: any) => 
                        setSchedule({ ...schedule, dayOfMonth: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i+1} value={String(i+1)}>
                            {i+1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={schedule.time || '09:00'}
                    onChange={(e: any) => setSchedule({ ...schedule, time: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Report Format</Label>
                  <RadioGroup
                    value={schedule.format}
                    onValueChange={(value: ReportFormat) => 
                      setSchedule({ ...schedule, format: value })
                    }
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf">PDF</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv">CSV</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="excel" id="excel" disabled={userTier !== 'enterprise'} />
                      <Label htmlFor="excel" className={userTier !== 'enterprise' ? 'opacity-50' : ''}>
                        Excel
                        {userTier !== 'enterprise' && <Lock className="h-3 w-3 ml-1 inline" />}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Recipients</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-team"
                        checked={schedule.includeTeam}
                        onCheckedChange={(checked: any) => 
                          setSchedule({ ...schedule, includeTeam: checked as boolean })
                        }
                      />
                      <Label htmlFor="include-team" className="text-sm cursor-pointer">
                        Include team members
                      </Label>
                    </div>
                  </div>
                  
                  {teamMembers.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border rounded-md p-2">
                      {teamMembers.map((member) => (
                        <div key={member.email} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`member-${member.email}`}
                            checked={schedule.recipients.includes(member.email)}
                            onCheckedChange={(checked: any) => 
                              handleRecipientChange(member.email, checked as boolean)
                            }
                          />
                          <Label htmlFor={`member-${member.email}`} className="text-sm cursor-pointer">
                            {member.name} ({member.email})
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      type="email"
                      placeholder="Add additional email..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.target as HTMLInputElement;
                          const email = input.value.trim();
                          if (email && !schedule.recipients.includes(email)) {
                            setSchedule({
                              ...schedule,
                              recipients: [...schedule.recipients, email]
                            });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="small"
                      onClick={(e: any) => {
                        const input = e.currentTarget.previousSibling as HTMLInputElement;
                        const email = input.value.trim();
                        if (email && !schedule.recipients.includes(email)) {
                          setSchedule({
                            ...schedule,
                            recipients: [...schedule.recipients, email]
                          });
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {schedule.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {schedule.recipients.map((email) => (
                        <div
                          key={email}
                          className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          <span>{email}</span>
                          <button
                            onClick={() => handleRecipientChange(email, false)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between mt-4">
                {currentSchedule && onDelete ? (
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : 'Delete Schedule'}
                  </Button>
                ) : (
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                )}
                
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSubmitting || schedule.recipients.length === 0}
                >
                  {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                  {currentSchedule ? 'Update Schedule' : 'Create Schedule'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScheduleReportButton; 
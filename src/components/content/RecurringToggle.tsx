import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Repeat, Calendar, ChevronDown, Lock, Info, Check } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/separator';
import { useSubscription } from '../../hooks/useSubscription';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'custom';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type MonthlyOption = 'day_of_month' | 'day_of_week';

export interface RecurrenceSettings {
  /**
   * Whether the post is recurring
   */
  isRecurring: boolean;
  /**
   * Pattern of recurrence
   */
  pattern: RecurrencePattern;
  /**
   * For weekly: which days of the week
   */
  weekDays?: WeekDay[];
  /**
   * For monthly: which day of the month (1-31) or which occurrence (first monday, etc.)
   */
  monthlyOption?: MonthlyOption;
  /**
   * For monthly: day of month (1-31)
   */
  dayOfMonth?: number;
  /**
   * For monthly: occurrence (first, second, third, fourth, last)
   */
  occurrence?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  /**
   * For monthly: day of week when using occurrence
   */
  dayOfWeek?: WeekDay;
  /**
   * For custom: interval between posts
   */
  customInterval?: number;
  /**
   * For custom: unit for interval
   */
  customUnit?: 'days' | 'weeks' | 'months';
  /**
   * End date for recurring posts
   */
  endDate?: Date | null;
  /**
   * End after specific number of occurrences
   */
  endAfterOccurrences?: number | null;
  /**
   * If end condition is specified
   */
  hasEndCondition: boolean;
  /**
   * Type of end condition
   */
  endConditionType: 'date' | 'occurrences' | 'indefinite';
}

interface RecurringSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  days?: number[]; // 0 = Sunday, 1 = Monday, etc. for weekly
  dates?: number[]; // 1-31 for monthly
  interval?: number; // Every X days/weeks/months for custom
  intervalUnit?: 'days' | 'weeks' | 'months'; // For custom
  endDate?: string; // ISO date string
  repetitions?: number; // Number of repetitions for limiting recurrence
}

export interface RecurringToggleProps {
  /**
   * Whether recurring scheduling is enabled
   */
  isEnabled: boolean;
  /**
   * Callback when toggle state changes
   */
  onChange: (isEnabled: boolean, schedule?: RecurringSchedule) => void;
  /**
   * Current schedule configuration
   */
  schedule?: RecurringSchedule;
  /**
   * Whether the toggle is disabled
   */
  isDisabled?: boolean;
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * RecurringToggle - Component for setting up recurring posts
 */
export const RecurringToggle: React.FC<RecurringToggleProps> = ({
  isEnabled,
  onChange,
  schedule: initialSchedule,
  isDisabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [schedule, setSchedule] = useState<RecurringSchedule>(
    initialSchedule || {
      frequency: 'weekly',
      days: [1], // Monday by default
    }
  );
  
  const { subscription } = useSubscription();
  const userTier = subscription?.tier || 'creator';
  
  // Check if user has access to recurring posts
  const canUseRecurring = userTier !== 'creator';
  
  // Check if user can use advanced recurring options
  const canUseAdvancedRecurring = userTier === 'enterprise';
  
  // Toggle recurring on/off
  const handleToggle = () => {
    if (isDisabled) return;
    
    // If user doesn't have access to recurring posts, show upgrade message
    if (!isEnabled && !canUseRecurring) {
      // In a real app, you might show a modal or redirect to upgrade page
      console.log('Upgrade required to use recurring posts');
      return;
    }
    
    const newEnabled = !isEnabled;
    onChange(newEnabled, newEnabled ? schedule : undefined);
  };
  
  // Update schedule and notify parent
  const updateSchedule = (newSchedule: Partial<RecurringSchedule>) => {
    const updatedSchedule = { ...schedule, ...newSchedule };
    setSchedule(updatedSchedule);
    
    if (isEnabled) {
      onChange(true, updatedSchedule);
    }
  };
  
  // Toggle specific day for weekly scheduling
  const toggleDay = (day: number) => {
    const days = schedule.days || [];
    const newDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day];
    
    if (newDays.length === 0) {
      // Don't allow empty day selection
      return;
    }
    
    updateSchedule({ days: newDays });
  };
  
  // Toggle specific date for monthly scheduling
  const toggleDate = (date: number) => {
    const dates = schedule.dates || [];
    const newDates = dates.includes(date)
      ? dates.filter(d => d !== date)
      : [...dates, date];
    
    if (newDates.length === 0) {
      // Don't allow empty date selection
      return;
    }
    
    updateSchedule({ dates: newDates });
  };
  
  // Format schedule for display
  const getScheduleSummary = (): string => {
    if (!isEnabled) return 'Not recurring';
    
    switch (schedule.frequency) {
      case 'daily':
        return 'Every day';
        
      case 'weekly': {
        const days = schedule.days || [];
        if (days.length === 7) return 'Every day';
        if (days.length === 0) return 'No days selected';
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = days.map(day => dayNames[day]).join(', ');
        return `Weekly on ${selectedDays}`;
      }
        
      case 'monthly': {
        const dates = schedule.dates || [];
        if (dates.length === 0) return 'No dates selected';
        
        // Sort and format dates with ordinal suffixes
        const formattedDates = [...dates]
          .sort((a, b) => a - b)
          .map(date => {
            const suffix = 
              date === 1 || date === 21 || date === 31 ? 'st' :
              date === 2 || date === 22 ? 'nd' :
              date === 3 || date === 23 ? 'rd' : 'th';
            return `${date}${suffix}`;
          })
          .join(', ');
        
        return `Monthly on the ${formattedDates}`;
      }
        
      case 'custom': {
        const interval = schedule.interval || 1;
        const unit = schedule.intervalUnit || 'days';
        return `Every ${interval} ${interval === 1 ? unit.slice(0, -1) : unit}`;
      }
        
      default:
        return 'Custom schedule';
    }
  };
  
  // Get maximum date for different months
  const getMaxDaysInMonth = (monthIndex: number): number => {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysInMonth[monthIndex];
  };
  
  // Generate dates for monthly view
  const generateMonthDates = (): number[] => {
    const dates = [];
    for (let i = 1; i <= 31; i++) {
      dates.push(i);
    }
    return dates;
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`
              relative inline-flex items-center h-6 w-11 rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isEnabled 
                ? canUseRecurring ? 'bg-blue-600' : 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gray-200'}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={handleToggle}
            disabled={isDisabled}
            aria-pressed={isEnabled}
          >
            <span
              className={`
                inline-block h-4 w-4 rounded-full bg-white transform transition-transform
                ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <span className="text-sm font-medium">Recurring Post</span>
          
          {isEnabled && !canUseRecurring && (
            <span className="text-xs text-yellow-600 flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="mr-1"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Upgrade required
            </span>
          )}
        </div>
        
        {isEnabled && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={isDisabled || !canUseRecurring}
          >
            {isOpen ? 'Hide options' : 'Schedule options'}
          </button>
        )}
      </div>
      
      {isEnabled && isOpen && canUseRecurring && (
        <div className="mt-3 p-4 border rounded-md bg-gray-50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => updateSchedule({ frequency: 'daily' })}
                className={`
                  px-3 py-2 text-sm rounded-md border
                  ${schedule.frequency === 'daily' 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-white border-gray-300 text-gray-700'}
                `}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => updateSchedule({ frequency: 'weekly', days: [1] })}
                className={`
                  px-3 py-2 text-sm rounded-md border
                  ${schedule.frequency === 'weekly' 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-white border-gray-300 text-gray-700'}
                `}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => updateSchedule({ frequency: 'monthly', dates: [1] })}
                className={`
                  px-3 py-2 text-sm rounded-md border
                  ${schedule.frequency === 'monthly' 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-white border-gray-300 text-gray-700'}
                `}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => updateSchedule({ 
                  frequency: 'custom', 
                  interval: 1, 
                  intervalUnit: 'days' 
                })}
                className={`
                  px-3 py-2 text-sm rounded-md border
                  ${!canUseAdvancedRecurring ? 'opacity-50 cursor-not-allowed' : ''}
                  ${schedule.frequency === 'custom' 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-white border-gray-300 text-gray-700'}
                `}
                disabled={!canUseAdvancedRecurring}
              >
                Custom
                {!canUseAdvancedRecurring && (
                  <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">PRO</span>
                )}
              </button>
            </div>
          </div>
          
          {schedule.frequency === 'weekly' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat on</label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`
                      w-10 h-10 rounded-full text-sm
                      ${(schedule.days || []).includes(index)
                        ? 'bg-blue-100 border-blue-300 text-blue-800' 
                        : 'bg-white border-gray-300 text-gray-700'}
                      border hover:bg-gray-50
                    `}
                  >
                    {day.slice(0, 1)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {schedule.frequency === 'monthly' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat on dates</label>
              <div className="grid grid-cols-7 gap-2">
                {generateMonthDates().map(date => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggleDate(date)}
                    className={`
                      w-8 h-8 rounded-md text-sm
                      ${(schedule.dates || []).includes(date)
                        ? 'bg-blue-100 border-blue-300 text-blue-800' 
                        : 'bg-white border-gray-300 text-gray-700'}
                      border hover:bg-gray-50
                    `}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {schedule.frequency === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat every</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={schedule.interval || 1}
                  onChange={(e) => updateSchedule({ interval: parseInt(e.target.value) || 1 })}
                  className="w-16 p-2 border border-gray-300 rounded-md"
                />
                <select
                  value={schedule.intervalUnit || 'days'}
                  onChange={(e) => updateSchedule({ intervalUnit: e.target.value as any })}
                  className="p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">End recurrence</label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="never-end"
                  name="end-recurrence"
                  checked={!schedule.endDate && !schedule.repetitions}
                  onChange={() => updateSchedule({ endDate: undefined, repetitions: undefined })}
                  className="rounded"
                />
                <label htmlFor="never-end" className="text-sm">Never</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="end-date"
                  name="end-recurrence"
                  checked={!!schedule.endDate}
                  onChange={() => updateSchedule({ 
                    endDate: schedule.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    repetitions: undefined
                  })}
                  className="rounded"
                />
                <label htmlFor="end-date" className="text-sm">On date</label>
                {schedule.endDate && (
                  <input
                    type="date"
                    value={schedule.endDate}
                    onChange={(e) => updateSchedule({ endDate: e.target.value })}
                    className="p-1 border border-gray-300 rounded-md"
                    min={new Date().toISOString().split('T')[0]}
                  />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="end-after"
                  name="end-recurrence"
                  checked={!!schedule.repetitions}
                  onChange={() => updateSchedule({ 
                    repetitions: schedule.repetitions || 10,
                    endDate: undefined
                  })}
                  className="rounded"
                />
                <label htmlFor="end-after" className="text-sm">After</label>
                {schedule.repetitions && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={schedule.repetitions}
                      onChange={(e) => updateSchedule({ repetitions: parseInt(e.target.value) || 1 })}
                      className="w-16 p-1 border border-gray-300 rounded-md"
                    />
                    <span className="text-sm">occurrences</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {getScheduleSummary()}
            {schedule.endDate && ` until ${new Date(schedule.endDate).toLocaleDateString()}`}
            {schedule.repetitions && ` for ${schedule.repetitions} occurrences`}
          </div>
        </div>
      )}
      
      {isEnabled && !isOpen && (
        <div className="mt-1 text-sm text-gray-500">
          {getScheduleSummary()}
        </div>
      )}
      
      {!canUseRecurring && isEnabled && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <div className="flex items-start">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="mr-2 mt-0.5"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <p className="font-medium mb-1">Upgrade Required</p>
              <p>Recurring posts are available on Influencer and Enterprise plans.</p>
              <button 
                className="mt-2 px-3 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-yellow-800 text-xs font-medium"
                onClick={() => {/* Navigate to upgrade page */}}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringToggle; 
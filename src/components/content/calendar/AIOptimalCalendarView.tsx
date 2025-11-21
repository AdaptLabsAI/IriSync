import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useAIOptimalTimes } from '../../../hooks/useAIOptimalTimes';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AIOptimalTime } from '../../../lib/scheduler/ai-optimal-times';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Lightbulb, 
  TrendingUp, 
  Clock,
  Target,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';

interface AIOptimalCalendarViewProps {
  selectedPlatform: SocialPlatform;
  contentType: string;
  onDateSelect: (date: Date, optimalTimes: AIOptimalTime[]) => void;
  onTimeSelect?: (date: Date, time: string, aiData: AIOptimalTime) => void;
  showAITimes?: boolean;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  optimalTimes: AIOptimalTime[];
  bestTime?: AIOptimalTime;
  isWeekend: boolean;
}

/**
 * Calendar view with integrated AI optimal posting times visualization
 */
export function AIOptimalCalendarView({
  selectedPlatform,
  contentType,
  onDateSelect,
  onTimeSelect,
  showAITimes = true,
  className = ''
}: AIOptimalCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [monthOptimalTimes, setMonthOptimalTimes] = useState<Map<string, AIOptimalTime[]>>(new Map());
  const [showAIOverlay, setShowAIOverlay] = useState(showAITimes);
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

  const {
    getOptimalTimesForDay,
    fetchingDayTimes,
    error,
    clearError
  } = useAIOptimalTimes({
    platform: selectedPlatform,
    contentType,
    autoFetch: false,
    enableTokenCharging: true
  });

  // Generate calendar days for current month view
  const generateCalendarDays = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month and calculate offset
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = [];
    const currentCalendarDate = new Date(startCalendar);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = currentCalendarDate.toISOString().split('T')[0];
      const isCurrentMonth = currentCalendarDate.getMonth() === month;
      const isToday = currentCalendarDate.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === currentCalendarDate.toDateString();
      const isWeekend = currentCalendarDate.getDay() === 0 || currentCalendarDate.getDay() === 6;
      
      // Get optimal times for this date if available
      const optimalTimes = monthOptimalTimes.get(dateStr) || [];
      const bestTime = optimalTimes.length > 0 ? optimalTimes[0] : undefined;
      
      days.push({
        date: new Date(currentCalendarDate),
        isCurrentMonth,
        isToday,
        isSelected,
        optimalTimes,
        bestTime,
        isWeekend
      });
      
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
    
    return days;
  };

  // Load optimal times for visible dates
  const loadOptimalTimesForMonth = async (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Only load for future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const promises: Promise<void>[] = [];
    const newLoadingDates = new Set<string>();
    
    // Load optimal times for each day in the month
    for (let day = firstDay.getDate(); day <= lastDay.getDate(); day++) {
      const currentDay = new Date(year, month, day);
      
      if (currentDay >= today) {
        const dateStr = currentDay.toISOString().split('T')[0];
        
        if (!monthOptimalTimes.has(dateStr)) {
          newLoadingDates.add(dateStr);
          
          promises.push(
            getOptimalTimesForDay(currentDay)
              .then(times => {
                setMonthOptimalTimes(prev => new Map(prev).set(dateStr, times));
                setLoadingDates(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(dateStr);
                  return newSet;
                });
              })
              .catch(err => {
                console.error(`Failed to load optimal times for ${dateStr}:`, err);
                setLoadingDates(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(dateStr);
                  return newSet;
                });
              })
          );
        }
      }
    }
    
    setLoadingDates(prev => new Set([...prev, ...newLoadingDates]));
    
    // Batch load with delay to avoid rate limiting
    for (let i = 0; i < promises.length; i++) {
      if (i > 0 && i % 5 === 0) {
        // Add delay every 5 requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      promises[i].catch(() => {}); // Handle errors individually above
    }
  };

  // Handle date click
  const handleDateClick = (day: CalendarDay) => {
    if (day.date < new Date()) {
      return; // Can't select past dates
    }
    
    setSelectedDate(day.date);
    onDateSelect(day.date, day.optimalTimes);
    
    // Load optimal times if not already loaded
    if (day.optimalTimes.length === 0 && showAIOverlay) {
      const dateStr = day.date.toISOString().split('T')[0];
      if (!loadingDates.has(dateStr)) {
        setLoadingDates(prev => new Set([...prev, dateStr]));
        
        getOptimalTimesForDay(day.date)
          .then(times => {
            setMonthOptimalTimes(prev => new Map(prev).set(dateStr, times));
            setLoadingDates(prev => {
              const newSet = new Set(prev);
              newSet.delete(dateStr);
              return newSet;
            });
          })
          .catch(err => {
            console.error('Failed to load optimal times:', err);
            setLoadingDates(prev => {
              const newSet = new Set(prev);
              newSet.delete(dateStr);
              return newSet;
            });
          });
      }
    }
  };

  // Handle time selection within a day
  const handleTimeSelect = (day: CalendarDay, time: AIOptimalTime) => {
    if (onTimeSelect) {
      const timeString = `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
      onTimeSelect(day.date, timeString, time);
    }
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get confidence color
  const getConfidenceColor = (score: number): string => {
    if (score >= 0.8) return 'bg-[#00CC44]';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get engagement level
  const getEngagementLevel = (time: AIOptimalTime): 'high' | 'medium' | 'low' => {
    const total = time.engagementPrediction.expectedLikes + 
                 time.engagementPrediction.expectedComments + 
                 time.engagementPrediction.expectedShares;
    
    if (total > 100) return 'high';
    if (total > 50) return 'medium';
    return 'low';
  };

  // Generate calendar days when date changes
  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentDate));
  }, [currentDate, monthOptimalTimes, selectedDate]);

  // Load optimal times when month changes
  useEffect(() => {
    if (showAIOverlay) {
      loadOptimalTimesForMonth(currentDate);
    }
  }, [currentDate, selectedPlatform, contentType, showAIOverlay]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Calendar Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <Button
              onClick={goToToday}
              variant="outline"
              size="small"
            >
              Today
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* AI Overlay Toggle */}
            <Button
              onClick={() => setShowAIOverlay(!showAIOverlay)}
              variant={showAIOverlay ? "default" : "outline"}
              size="small"
              className="flex items-center space-x-2"
            >
              {showAIOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>AI Times</span>
            </Button>
            
            {/* Navigation */}
            <Button
              onClick={goToPreviousMonth}
              variant="outline"
              size="small"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={goToNextMonth}
              variant="outline"
              size="small"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* AI Status */}
        {showAIOverlay && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <span>AI optimal times for {selectedPlatform} {contentType} posts</span>
            {fetchingDayTimes && (
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
                <span>Loading...</span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <Button
              onClick={clearError}
              variant="outline"
              size="small"
              className="ml-2"
            >
              Dismiss
            </Button>
          </div>
        )}
      </Card>

      {/* Calendar Grid */}
      <Card className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dateStr = day.date.toISOString().split('T')[0];
            const isLoading = loadingDates.has(dateStr);
            const isPast = day.date < new Date();
            
            return (
              <div
                key={index}
                className={`
                  relative p-2 min-h-[80px] border border-gray-200 rounded-lg cursor-pointer
                  transition-all duration-200 hover:shadow-sm
                  ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${day.isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                  ${day.isToday ? 'border-blue-400 bg-blue-25' : ''}
                  ${isPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-25'}
                  ${!day.isCurrentMonth ? 'text-gray-400' : ''}
                `}
                onClick={() => !isPast && handleDateClick(day)}
              >
                {/* Date Number */}
                <div className={`
                  text-sm font-medium mb-1
                  ${day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                `}>
                  {day.date.getDate()}
                </div>

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="absolute top-1 right-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}

                {/* AI Optimal Times */}
                {showAIOverlay && day.optimalTimes.length > 0 && !isPast && (
                  <div className="space-y-1">
                    {day.optimalTimes.slice(0, 3).map((time, timeIndex) => {
                      const engagementLevel = getEngagementLevel(time);
                      
                      return (
                        <div
                          key={timeIndex}
                          className={`
                            text-xs p-1 rounded cursor-pointer transition-colors
                            ${timeIndex === 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-700'}
                            hover:bg-blue-200
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTimeSelect(day, time);
                          }}
                          title={`${Math.round(time.score * 100)}% confidence - ${time.reasoning}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')}
                            </span>
                            
                            <div className="flex items-center space-x-1">
                              {/* Confidence Indicator */}
                              <div 
                                className={`w-2 h-2 rounded-full ${getConfidenceColor(time.score)}`}
                                title={`${Math.round(time.score * 100)}% confidence`}
                              />
                              
                              {/* Engagement Indicator */}
                              {engagementLevel === 'high' && <TrendingUp className="w-3 h-3 text-[#00CC44]" />}
                              {engagementLevel === 'medium' && <Target className="w-3 h-3 text-yellow-600" />}
                              {engagementLevel === 'low' && <Clock className="w-3 h-3 text-gray-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show more indicator */}
                    {day.optimalTimes.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{day.optimalTimes.length - 3} more
                      </div>
                    )}
                  </div>
                )}

                {/* Best Time Badge */}
                {showAIOverlay && day.bestTime && !isPast && (
                  <div className="absolute top-1 left-1">
                    <Badge 
                      className={`text-xs px-1 py-0 ${getConfidenceColor(day.bestTime.score)} text-white`}
                      title="Best time for this day"
                    >
                      ★
                    </Badge>
                  </div>
                )}

                {/* Weekend Indicator */}
                {day.isWeekend && day.isCurrentMonth && (
                  <div className="absolute bottom-1 right-1 text-xs text-gray-400">
                    📅
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            {selectedDate.toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          {showAIOverlay && (
            <div>
              {(() => {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const dayOptimalTimes = monthOptimalTimes.get(dateStr) || [];
                const isLoading = loadingDates.has(dateStr);
                
                if (isLoading) {
                  return (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                      <span>Loading AI optimal times...</span>
                    </div>
                  );
                }
                
                if (dayOptimalTimes.length === 0) {
                  return (
                    <div className="text-gray-500 text-sm">
                      No AI optimal times available for this date
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      <Lightbulb className="w-4 h-4 text-blue-500 mr-2" />
                      AI Recommended Times
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dayOptimalTimes.map((time, index) => (
                        <div
                          key={index}
                          className={`
                            p-3 rounded-lg border cursor-pointer transition-colors
                            ${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
                            hover:bg-blue-100
                          `}
                          onClick={() => handleTimeSelect({ date: selectedDate } as CalendarDay, time)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-800">
                              {time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')}
                            </span>
                            
                            <Badge className={`text-xs ${getConfidenceColor(time.score)} text-white`}>
                              {Math.round(time.score * 100)}%
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2">
                            {time.reasoning}
                          </p>
                          
                          <div className="text-xs text-gray-500">
                            ~{time.engagementPrediction.expectedLikes + 
                              time.engagementPrediction.expectedComments + 
                              time.engagementPrediction.expectedShares} interactions
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* Manual Schedule Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={() => onDateSelect(selectedDate, monthOptimalTimes.get(selectedDate.toISOString().split('T')[0]) || [])}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Content for This Date
            </Button>
          </div>
        </Card>
      )}

      {/* Legend */}
      {showAIOverlay && (
        <Card className="p-4">
          <h4 className="font-medium text-gray-700 mb-3">AI Optimization Legend</h4>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#00CC44]" />
              <span>High Confidence (80%+)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Medium Confidence (60-79%)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Low Confidence (&lt;60%)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className="text-xs bg-blue-100 text-blue-800">★</Badge>
              <span>Best Time of Day</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 
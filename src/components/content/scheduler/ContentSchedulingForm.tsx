import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button/Button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AIOptimalTimePicker } from './AIOptimalTimePicker';
import { useAuth } from '../../../hooks/useAuth';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AIOptimalTime } from '../../../lib/scheduler/ai-optimal-times';
import { CalendarService } from '../../../lib/features/content/CalendarService';
import { logger } from '../../../lib/logging/logger';
import { Calendar, Clock, Send, Save, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

interface ContentSchedulingFormProps {
  platforms: SocialPlatform[];
  initialContent?: string;
  initialPlatform?: SocialPlatform;
  initialDate?: Date;
  initialTime?: string;
  contentType?: string;
  onSchedule: (scheduleData: ScheduleData) => Promise<void>;
  onSave?: (scheduleData: ScheduleData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface ScheduleData {
  content: string;
  platform: SocialPlatform;
  scheduledDate: Date;
  scheduledTime: string;
  contentType: string;
  aiOptimalData?: AIOptimalTime;
  timezone: string;
  recurrence?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

/**
 * Enhanced content scheduling form with integrated AI optimal posting times
 */
export function ContentSchedulingForm({
  platforms,
  initialContent = '',
  initialPlatform,
  initialDate,
  initialTime,
  contentType = 'post',
  onSchedule,
  onSave,
  onCancel,
  className = ''
}: ContentSchedulingFormProps) {
  // Form state
  const [content, setContent] = useState(initialContent);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>(
    initialPlatform || platforms[0]
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTime, setSelectedTime] = useState(
    initialTime || new Date().toTimeString().slice(0, 5)
  );
  const [selectedContentType, setSelectedContentType] = useState(contentType);
  const [aiOptimalData, setAiOptimalData] = useState<AIOptimalTime | undefined>();
  const [recurrence, setRecurrence] = useState<{
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate: Date | undefined;
  }>({
    enabled: false,
    frequency: 'weekly',
    interval: 1,
    endDate: undefined
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiRecommendationUsed, setAiRecommendationUsed] = useState(false);

  const { user } = useAuth();
  const calendarService = new CalendarService();

  // Content type options
  const contentTypes = [
    { value: 'post', label: 'Social Post' },
    { value: 'image', label: 'Image Post' },
    { value: 'video', label: 'Video Content' },
    { value: 'story', label: 'Story/Reel' },
    { value: 'carousel', label: 'Carousel Post' },
    { value: 'link', label: 'Link Share' },
    { value: 'announcement', label: 'Announcement' }
  ];

  // Timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Handle AI optimal time selection
  const handleAITimeSelect = (date: Date, time: string, aiData?: AIOptimalTime) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setAiOptimalData(aiData);
    setAiRecommendationUsed(true);
    setSuccess(aiData ? 
      `AI recommendation applied: ${time} with ${Math.round(aiData.score * 100)}% confidence` : 
      'Optimal time applied'
    );
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  // Handle optimal day selection
  const handleOptimalDaySelect = (date: Date, time: string, aiData: AIOptimalTime) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setAiOptimalData(aiData);
    setAiRecommendationUsed(true);
    setSuccess(
      `AI found the best day and time: ${date.toLocaleDateString()} at ${time} (${Math.round(aiData.score * 100)}% confidence)`
    );
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!content.trim()) {
      return 'Content is required';
    }
    
    if (!selectedDate) {
      return 'Schedule date is required';
    }
    
    if (!selectedTime) {
      return 'Schedule time is required';
    }
    
    if (selectedDate < new Date()) {
      return 'Cannot schedule content in the past';
    }
    
    return null;
  };

  // Build schedule data
  const buildScheduleData = (): ScheduleData => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = new Date(selectedDate!);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    return {
      content,
      platform: selectedPlatform,
      scheduledDate: scheduledDateTime,
      scheduledTime: selectedTime,
      contentType: selectedContentType,
      aiOptimalData,
      timezone: userTimezone,
      recurrence: recurrence.enabled ? recurrence : undefined
    };
  };

  // Handle schedule
  const handleSchedule = async () => {
    try {
      setError(null);
      setLoading(true);

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      const scheduleData = buildScheduleData();
      
      logger.debug('Scheduling content', {
        platform: scheduleData.platform,
        scheduledDate: scheduleData.scheduledDate.toISOString(),
        aiRecommendationUsed,
        aiConfidence: aiOptimalData?.score
      });

      await onSchedule(scheduleData);
      
      setSuccess('Content scheduled successfully!');
      
      // Reset form
      if (!initialContent) {
        setContent('');
        setSelectedDate(undefined);
        setSelectedTime(new Date().toTimeString().slice(0, 5));
        setAiOptimalData(undefined);
        setAiRecommendationUsed(false);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule content';
      setError(errorMessage);
      logger.error('Error scheduling content', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Handle save as draft
  const handleSave = async () => {
    if (!onSave) return;

    try {
      setError(null);
      setLoading(true);

      if (!content.trim()) {
        setError('Content is required to save');
        return;
      }

      const scheduleData = buildScheduleData();
      await onSave(scheduleData);
      
      setSuccess('Draft saved successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setError(errorMessage);
      logger.error('Error saving draft', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Format date for input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Clear messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success/Error Messages */}
      {success && (
        <Card className="p-4 border-[#00FF6A]/20 bg-[#00FF6A]/5">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-[#00CC44]" />
            <p className="text-[#00CC44] font-medium">{success}</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </Card>
      )}

      {/* Content Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Content Details</h3>
        
        <div className="space-y-4">
          {/* Content Input */}
          <div>
            <Label htmlFor="content">Content *</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent resize-vertical min-h-[120px]"
              disabled={loading}
            />
            <div className="text-sm text-gray-500 mt-1">
              {content.length}/2200 characters
            </div>
          </div>

          {/* Platform and Content Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Platform *</Label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as SocialPlatform)}
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
              >
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="contentType">Content Type</Label>
              <select
                value={selectedContentType}
                onChange={(e) => setSelectedContentType(e.target.value)}
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
              >
                {contentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Optimal Times Integration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 text-[#00CC44] mr-2" />
          AI-Powered Scheduling
        </h3>
        
        <AIOptimalTimePicker
          platform={selectedPlatform}
          contentType={selectedContentType}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onTimeSelect={handleAITimeSelect}
          onOptimalDaySelect={handleOptimalDaySelect}
          disabled={loading}
          showDayRecommendations={true}
          maxRecommendations={4}
        />
      </Card>

      {/* Manual Scheduling Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 text-gray-600 mr-2" />
          Schedule Settings
          {aiRecommendationUsed && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              AI Optimized
            </span>
          )}
        </h3>
        
        <div className="space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                type="date"
                id="date"
                value={selectedDate ? formatDateForInput(selectedDate) : ''}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                min={formatDateForInput(new Date())}
                disabled={loading}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="time">Time *</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="time"
                  id="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">{userTimezone}</span>
              </div>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={loading}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              {/* Recurrence */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="recurrence"
                    checked={recurrence.enabled}
                    onChange={(e) => setRecurrence({ ...recurrence, enabled: e.target.checked })}
                    className="rounded border-gray-300"
                    disabled={loading}
                  />
                  <Label htmlFor="recurrence">Recurring Schedule</Label>
                </div>

                {recurrence.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <select
                        value={recurrence.frequency}
                        onChange={(e) => setRecurrence({
                          ...recurrence,
                          frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                        })}
                        disabled={loading}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC44] focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="interval">Every</Label>
                      <Input
                        type="number"
                        id="interval"
                        min="1"
                        max="30"
                        value={recurrence.interval}
                        onChange={(e) => setRecurrence({ 
                          ...recurrence, 
                          interval: parseInt(e.target.value) || 1 
                        })}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        type="date"
                        id="endDate"
                        value={recurrence.endDate ? formatDateForInput(recurrence.endDate) : ''}
                        onChange={(e) => setRecurrence({ 
                          ...recurrence, 
                          endDate: e.target.value ? new Date(e.target.value) : undefined 
                        })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* AI Insights Display */}
      {aiOptimalData && (
        <Card className="p-4 border-[#00FF6A]/20 bg-[#00FF6A]/5">
          <h4 className="font-medium text-[#00CC44] mb-2 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2" />
            AI Scheduling Insights
          </h4>
          
          <div className="text-sm text-[#00CC44] space-y-1">
            <p><strong>Confidence:</strong> {Math.round(aiOptimalData.score * 100)}%</p>
            <p><strong>Expected Engagement:</strong> ~{
              aiOptimalData.engagementPrediction.expectedLikes + 
              aiOptimalData.engagementPrediction.expectedComments + 
              aiOptimalData.engagementPrediction.expectedShares
            } interactions</p>
            <p><strong>Reasoning:</strong> {aiOptimalData.reasoning}</p>
            <p><strong>Audience Peak:</strong> {aiOptimalData.audienceFactors.peakEngagementTime}</p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSchedule}
          disabled={loading || !content.trim() || !selectedDate}
          className="flex-1 bg-[#00CC44] hover:bg-[#00CC44]"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Scheduling...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Schedule Post
            </>
          )}
        </Button>

        {onSave && (
          <Button
            onClick={handleSave}
            variant="outline"
            disabled={loading || !content.trim()}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        )}

        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Scheduling Summary */}
      {selectedDate && selectedTime && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-medium text-gray-700 mb-2">Scheduling Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Platform:</strong> {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}</p>
            <p><strong>Date & Time:</strong> {selectedDate.toLocaleDateString()} at {selectedTime} ({userTimezone})</p>
            <p><strong>Content Type:</strong> {contentTypes.find(t => t.value === selectedContentType)?.label}</p>
            {aiRecommendationUsed && (
              <p className="text-[#00CC44]"><strong>AI Optimized:</strong> Yes ({Math.round((aiOptimalData?.score || 0) * 100)}% confidence)</p>
            )}
            {recurrence.enabled && (
              <p><strong>Recurrence:</strong> Every {recurrence.interval} {recurrence.frequency}(s)</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} 
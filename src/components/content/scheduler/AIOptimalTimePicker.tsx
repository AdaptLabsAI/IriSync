import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button/Button';
import { Badge } from '../../ui/badge';
import { useAIOptimalTimes } from '../../../hooks/useAIOptimalTimes';
import { SocialPlatform } from '../../../lib/models/SocialAccount';
import { AIOptimalTime } from '../../../lib/scheduler/ai-optimal-times';
import { Clock, Calendar, TrendingUp, Users, Target, Lightbulb, Star, AlertCircle } from 'lucide-react';

interface AIOptimalTimePickerProps {
  platform: SocialPlatform;
  contentType: string;
  selectedDate?: Date;
  selectedTime?: string;
  onTimeSelect: (date: Date, time: string, aiData?: AIOptimalTime) => void;
  onOptimalDaySelect?: (date: Date, time: string, aiData: AIOptimalTime) => void;
  className?: string;
  disabled?: boolean;
  showDayRecommendations?: boolean;
  maxRecommendations?: number;
}

/**
 * AI-powered optimal time picker integrated into content scheduling
 */
export function AIOptimalTimePicker({
  platform,
  contentType,
  selectedDate,
  selectedTime,
  onTimeSelect,
  onOptimalDaySelect,
  className = '',
  disabled = false,
  showDayRecommendations = true,
  maxRecommendations = 5
}: AIOptimalTimePickerProps) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [daySpecificTimes, setDaySpecificTimes] = useState<AIOptimalTime[]>([]);
  const [optimalDayTimes, setOptimalDayTimes] = useState<{
    bestOverall: AIOptimalTime;
    nextWeekRecommendations: AIOptimalTime[];
    insights: string[];
  } | null>(null);

  const {
    recommendation,
    optimalTimes,
    bestOverallTime,
    loading,
    fetchingDayTimes,
    fetchingOptimalDayTime,
    error,
    tokenError,
    fetchOptimalTimes,
    getOptimalTimesForDay,
    getOptimalDayAndTime,
    clearError,
    shouldChargeForOptimalTimes,
    tokenCost,
    formatOptimalTime,
    formatRecommendationSummary,
    getEngagementPredictionText,
    getConfidenceLevel
  } = useAIOptimalTimes({
    platform,
    contentType,
    targetDate: selectedDate,
    autoFetch: false,
    enableTokenCharging: true
  });

  // Format time for input fields
  const formatTimeForInput = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Handle optimal time selection
  const handleOptimalTimeSelect = (optimalTime: AIOptimalTime) => {
    if (selectedDate) {
      // User has chosen a specific date, apply optimal time to that date
      const newDate = new Date(selectedDate);
      newDate.setHours(optimalTime.hour, optimalTime.minute, 0, 0);
      const timeString = formatTimeForInput(optimalTime.hour, optimalTime.minute);
      onTimeSelect(newDate, timeString, optimalTime);
    } else {
      // No specific date chosen, recommend optimal day and time
      const today = new Date();
      const dayOffset = (optimalTime.dayOfWeek - today.getDay() + 7) % 7;
      const optimalDate = new Date(today);
      optimalDate.setDate(today.getDate() + (dayOffset === 0 ? 7 : dayOffset)); // Next occurrence of the day
      optimalDate.setHours(optimalTime.hour, optimalTime.minute, 0, 0);
      
      const timeString = formatTimeForInput(optimalTime.hour, optimalTime.minute);
      
      if (onOptimalDaySelect) {
        onOptimalDaySelect(optimalDate, timeString, optimalTime);
      } else {
        onTimeSelect(optimalDate, timeString, optimalTime);
      }
    }
    setShowRecommendations(false);
  };

  // Fetch day-specific times when date changes
  useEffect(() => {
    if (selectedDate && showRecommendations) {
      getOptimalTimesForDay(selectedDate)
        .then(times => setDaySpecificTimes(times))
        .catch(err => console.error('Failed to fetch day-specific times:', err));
    }
  }, [selectedDate, showRecommendations, getOptimalTimesForDay]);

  // Get confidence color
  const getConfidenceColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get engagement icon
  const getEngagementIcon = (expectedTotal: number) => {
    if (expectedTotal > 100) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (expectedTotal > 50) return <Users className="w-4 h-4 text-yellow-500" />;
    return <Target className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* AI Optimization Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <span className="font-medium text-gray-700">AI Optimal Times</span>
          {shouldChargeForOptimalTimes && (
            <Badge variant="outline" className="text-xs">
              {tokenCost} token{tokenCost !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <Button
          onClick={() => {
            if (!showRecommendations) {
              setShowRecommendations(true);
              if (!recommendation) {
                fetchOptimalTimes();
              }
            } else {
              setShowRecommendations(false);
            }
          }}
          variant={showRecommendations ? "default" : "outline"}
          size="sm"
          disabled={disabled || loading}
        >
          {loading ? 'Analyzing...' : showRecommendations ? 'Hide AI Times' : 'Show AI Times'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">
                {tokenError ? 'Insufficient AI Tokens' : 'AI Analysis Error'}
              </p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              {tokenError && (
                <p className="text-red-600 text-xs mt-2">
                  You need {tokenCost} AI token{tokenCost !== 1 ? 's' : ''} to get optimal posting time recommendations.
                </p>
              )}
              <Button
                onClick={clearError}
                variant="outline"
                size="sm"
                className="mt-2 text-red-600 border-red-300"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* AI Recommendations */}
      {showRecommendations && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="space-y-4">
            {/* Primary Recommendation */}
            {bestOverallTime && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Star className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-800">Best Time to Post</h3>
                  <Badge className={`text-xs ${getConfidenceColor(bestOverallTime.score)}`}>
                    {getConfidenceLevel(bestOverallTime.score)} Confidence
                  </Badge>
                </div>
                
                <div 
                  className="bg-white rounded-lg p-4 border border-blue-200 cursor-pointer hover:bg-blue-25 transition-colors"
                  onClick={() => handleOptimalTimeSelect(bestOverallTime)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-800">
                        {formatOptimalTime(bestOverallTime)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getEngagementIcon(
                        bestOverallTime.engagementPrediction.expectedLikes +
                        bestOverallTime.engagementPrediction.expectedComments +
                        bestOverallTime.engagementPrediction.expectedShares
                      )}
                      <span className="text-sm text-gray-600">
                        {Math.round(bestOverallTime.score * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {bestOverallTime.reasoning}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    {getEngagementPredictionText(bestOverallTime)}
                  </div>
                </div>
              </div>
            )}

            {/* Alternative Times */}
            {optimalTimes.length > 1 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Alternative Times
                </h4>
                
                <div className="space-y-2">
                  {optimalTimes.slice(1, maxRecommendations).map((time, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleOptimalTimeSelect(time)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {formatOptimalTime(time)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getConfidenceColor(time.score)}`}>
                            {Math.round(time.score * 100)}%
                          </Badge>
                          {getEngagementIcon(
                            time.engagementPrediction.expectedLikes +
                            time.engagementPrediction.expectedComments +
                            time.engagementPrediction.expectedShares
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {time.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day-Specific Times for Selected Date */}
            {selectedDate && daySpecificTimes.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Best Times for {selectedDate.toLocaleDateString()}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {daySpecificTimes.slice(0, 4).map((time, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors text-center"
                      onClick={() => handleOptimalTimeSelect(time)}
                    >
                      <div className="font-medium text-gray-800">
                        {formatTimeForInput(time.hour, time.minute)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(time.score * 100)}% confidence
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimal Day and Time (Calendar View) */}
            {showDayRecommendations && !selectedDate && (
              <div>
                <Button
                  onClick={() => {
                    getOptimalDayAndTime(7)
                      .then(result => setOptimalDayTimes(result))
                      .catch(err => console.error('Failed to fetch optimal day/time:', err));
                  }}
                  variant="outline"
                  size="sm"
                  disabled={fetchingOptimalDayTime}
                  className="w-full"
                >
                  {fetchingOptimalDayTime ? 'Finding Best Day...' : 'Find Best Day & Time'}
                </Button>
                
                {optimalDayTimes && (
                  <div className="mt-3 space-y-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-3 cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-colors"
                      onClick={() => handleOptimalTimeSelect(optimalDayTimes.bestOverall)}
                    >
                      <div className="font-semibold">
                        Best Overall: {formatOptimalTime(optimalDayTimes.bestOverall)}
                      </div>
                      <div className="text-sm opacity-90">
                        {Math.round(optimalDayTimes.bestOverall.score * 100)}% confidence
                      </div>
                    </div>
                    
                    {optimalDayTimes.insights.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <h5 className="font-medium text-gray-700 mb-2">AI Insights</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {optimalDayTimes.insights.slice(0, 3).map((insight, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis Summary */}
            {recommendation && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <h5 className="font-medium text-gray-700 mb-2">Analysis Summary</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Best Day:</span> {
                      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                        recommendation.dayOfWeekAnalysis.bestDay
                      ]
                    }
                  </div>
                  <div>
                    <span className="font-medium">Weekday Performance:</span> {
                      Math.round(recommendation.dayOfWeekAnalysis.workdayPerformance * 100)
                    }%
                  </div>
                  <div>
                    <span className="font-medium">Weekend Performance:</span> {
                      Math.round(recommendation.dayOfWeekAnalysis.weekendPerformance * 100)
                    }%
                  </div>
                </div>
                
                {recommendation.contentTypeOptimization.platformSpecificTips.length > 0 && (
                  <div className="mt-2">
                    <h6 className="font-medium text-gray-700 text-xs mb-1">Platform Tips:</h6>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      {recommendation.contentTypeOptimization.platformSpecificTips.slice(0, 2).map((tip, index) => (
                        <li key={index}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      {showRecommendations && bestOverallTime && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleOptimalTimeSelect(bestOverallTime)}
            size="sm"
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            Use Best Time
          </Button>
          
          {optimalTimes.length > 1 && (
            <Button
              onClick={() => handleOptimalTimeSelect(optimalTimes[1])}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Use Alternative
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 
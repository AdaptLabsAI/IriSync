import React from 'react';
import { EngagementPredictionResult } from '../../../lib/ai/analysis/engagement-predictor';

interface EngagementPredictionChartProps {
  /**
   * Engagement prediction result to display
   */
  result: EngagementPredictionResult;
  /**
   * Whether to show estimated metrics
   */
  showMetrics?: boolean;
  /**
   * Whether to show strengths/weaknesses
   */
  showAnalysis?: boolean;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * EngagementPredictionChart - A component to visualize engagement prediction results
 * This component displays engagement scores, aspect breakdowns, and estimated metrics
 */
const EngagementPredictionChart: React.FC<EngagementPredictionChartProps> = ({
  result,
  showMetrics = true,
  showAnalysis = true,
  className = '',
}) => {
  // Helper to get color class based on score
  const getScoreColorClass = (score: number, isBg = false) => {
    const prefix = isBg ? 'bg-' : 'text-';
    if (score >= 8) return isBg ? 'bg-[#00CC44]' : 'text-[#00CC44]';
    if (score >= 6) return `${prefix}blue-500`;
    if (score >= 4) return `${prefix}amber-500`;
    return `${prefix}red-500`;
  };

  // Array of aspect entries for consistent rendering
  const aspectEntries = Object.entries(result.aspects);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall engagement score section */}
      <div className="mb-6">
        <div className="flex flex-col items-center mb-2">
          <div className="text-base font-medium mb-2">Overall Engagement Score</div>
          <div className="relative h-36 w-36">
            {/* Circular gauge */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#e5e7eb" 
                strokeWidth="8" 
              />
              
              {/* Score circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={result.engagementScore >= 80 ? "#00CC44" :
                        result.engagementScore >= 60 ? "#3b82f6" :
                        result.engagementScore >= 40 ? "#f59e0b" : "#ef4444"} 
                strokeWidth="8" 
                strokeDasharray={`${(result.engagementScore / 100) * 283} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)" 
              />
              
              {/* Center text */}
              <text 
                x="50" 
                y="50" 
                dominantBaseline="middle" 
                textAnchor="middle"
                className="text-3xl font-bold"
                fill="currentColor"
              >
                {Math.round(result.engagementScore)}
              </text>
              
              <text 
                x="50" 
                y="65" 
                dominantBaseline="middle" 
                textAnchor="middle"
                className="text-xs"
                fill="currentColor"
              >
                out of 100
              </text>
            </svg>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Aspect breakdown */}
      <div className="mb-4">
        <h4 className="font-medium mb-3">Engagement Aspects</h4>
        <div className="space-y-3">
          {aspectEntries.map(([aspect, score]) => (
            <div key={aspect} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{aspect.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={getScoreColorClass(score)}>{score.toFixed(1)}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getScoreColorClass(score, true)}`} 
                  style={{ width: `${score * 10}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estimated metrics (if available and requested) */}
      {showMetrics && result.metrics && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Estimated Metrics</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {result.metrics.estimatedLikes !== undefined && (
              <div className="p-3 border rounded-md text-center">
                <div className="text-lg font-medium">{result.metrics.estimatedLikes}</div>
                <div className="text-xs text-gray-500">Likes</div>
              </div>
            )}
            {result.metrics.estimatedComments !== undefined && (
              <div className="p-3 border rounded-md text-center">
                <div className="text-lg font-medium">{result.metrics.estimatedComments}</div>
                <div className="text-xs text-gray-500">Comments</div>
              </div>
            )}
            {result.metrics.estimatedShares !== undefined && (
              <div className="p-3 border rounded-md text-center">
                <div className="text-lg font-medium">{result.metrics.estimatedShares}</div>
                <div className="text-xs text-gray-500">Shares</div>
              </div>
            )}
            {result.metrics.estimatedClicks !== undefined && (
              <div className="p-3 border rounded-md text-center">
                <div className="text-lg font-medium">{result.metrics.estimatedClicks}</div>
                <div className="text-xs text-gray-500">Clicks</div>
              </div>
            )}
            {result.metrics.estimatedReach !== undefined && (
              <div className="p-3 border rounded-md text-center">
                <div className="text-lg font-medium">{result.metrics.estimatedReach}</div>
                <div className="text-xs text-gray-500">Reach</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content analysis */}
      {showAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <div className="p-3 border rounded-md">
              <h4 className="font-medium mb-2 text-[#00CC44]">Strengths</h4>
              <ul className="space-y-1 text-sm">
                {result.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-[#00CC44] mr-2">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {result.weaknesses && result.weaknesses.length > 0 && (
            <div className="p-3 border rounded-md">
              <h4 className="font-medium mb-2 text-red-600">Areas for Improvement</h4>
              <ul className="space-y-1 text-sm">
                {result.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {showAnalysis && result.suggestions && result.suggestions.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Suggestions to Improve Engagement</h4>
          <div className="p-3 border rounded-md bg-blue-50">
            <ul className="space-y-2 text-sm">
              {result.suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-blue-500 mr-2">→</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngagementPredictionChart; 